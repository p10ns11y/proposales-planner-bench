import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import type { OfferGroupPart } from "../contract/offer-group";
import { createClient } from "../proposales/client";
import type { ProposalesClient } from "../proposales/types";
import { toOfferDataPart } from "../transport/ai-sdk-offers";
import { offerGroupFromShell } from "../view-models/offer-part";
import { shellViewModel } from "../view-models/selectors";
import { modelAttemptSignal, modelIsUsable, plannerLanguageModel } from "./agent-mode";
import { isFileUtterance } from "./fixture-extractor";
import { attemptFiling } from "./filing-guard";
import { latestUserText, readChatRequest, readSessionSnapshot, type ChatTurnMessage } from "./chat-request";
import { snapshotForClient, type PlannerSnapshot } from "./planner-snapshot";
import { runFixtureTurn } from "./scripted-turn";

export type PlannerUIMessage = UIMessage<unknown, { snapshot: PlannerSnapshot; "offer-group": OfferGroupPart }>;

export type PlannerChatEnv = {
  PROPOSALES_MODE?: string;
  PROPOSALES_API_KEY?: string;
  XAI_API_KEY?: string;
  PLANNER_MODEL?: string;
};

export type CompletedChatTurn = {
  reply: string;
  snapshot: PlannerSnapshot;
  mode: "live" | "scripted";
};

export async function handlePlannerChat(request: Request, env: PlannerChatEnv = currentChatEnv()): Promise<Response> {
  const payload: unknown = await request.json();
  const chatRequest = readChatRequest(payload);
  const client = createClient(env);
  const today = new Date().toISOString().slice(0, 10);
  const snapshot = await chatSnapshot(chatRequest.snapshot, client);
  const turn = await completeChatTurn({
    messages: chatRequest.messages,
    snapshot,
    client,
    today,
    env,
  });
  const clientSnapshot = snapshotForClient(turn.snapshot);
  const stream = createUIMessageStream<PlannerUIMessage>({
    execute: ({ writer }) => {
      const textId = "planner-reply";
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: turn.reply });
      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "data-snapshot", data: clientSnapshot });
      const group = offerGroupFromShell(
        shellViewModel({
          snapshot: clientSnapshot,
          busy: false,
          errorText: null,
          speechAvailable: false,
        }),
      );
      if (group !== null) {
        const part = toOfferDataPart(group);
        writer.write({ type: part.type, id: part.id, data: part.data });
      }
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export async function completeChatTurn(input: {
  messages: ChatTurnMessage[];
  snapshot: PlannerSnapshot;
  client: ProposalesClient;
  today: string;
  env: PlannerChatEnv;
  runLive?: () => Promise<{ reply: string; snapshot: PlannerSnapshot }>;
}): Promise<CompletedChatTurn> {
  if (!modelIsUsable(input.env)) {
    const turn = await scriptedChatTurn(input);
    return { ...turn, mode: "scripted" };
  }
  try {
    const live = input.runLive
      ? await input.runLive()
      : await runLiveChat(input.messages, input.snapshot, input.client, input.today, input.env);
    return { reply: live.reply, snapshot: live.snapshot, mode: "live" };
  } catch {
    const turn = await scriptedChatTurn(input);
    return { ...turn, mode: "scripted" };
  }
}

export function currentChatEnv(): PlannerChatEnv {
  return {
    PROPOSALES_MODE: envValue("PROPOSALES_MODE"),
    PROPOSALES_API_KEY: envValue("PROPOSALES_API_KEY"),
    XAI_API_KEY: envValue("XAI_API_KEY"),
    PLANNER_MODEL: envValue("PLANNER_MODEL"),
  };
}

async function chatSnapshot(
  snapshot: PlannerSnapshot | null,
  client: ProposalesClient,
): Promise<PlannerSnapshot> {
  if (snapshot !== null && snapshot.companies.length > 0) {
    return snapshot;
  }
  const opened = await readSessionSnapshot(client);
  if (snapshot === null) {
    return opened;
  }
  return {
    ...snapshot,
    companies: opened.companies,
    filingAvailable: opened.filingAvailable,
    notice: opened.filingAvailable ? snapshot.notice : opened.notice,
  };
}

async function scriptedChatTurn(input: {
  messages: ChatTurnMessage[];
  snapshot: PlannerSnapshot;
  client: ProposalesClient;
  today: string;
}): Promise<{ reply: string; snapshot: PlannerSnapshot }> {
  const text = latestUserText(input.messages);
  return runFixtureTurn({
    text,
    userText: text,
    snapshot: input.snapshot,
    client: input.client,
    today: input.today,
  });
}

async function runLiveChat(
  messages: ChatTurnMessage[],
  snapshot: PlannerSnapshot,
  client: ProposalesClient,
  today: string,
  env: PlannerChatEnv,
): Promise<{ reply: string; snapshot: PlannerSnapshot }> {
  const state = { snapshot };
  const uiMessages: PlannerUIMessage[] = messages.map((message, messageIndex) => ({
    id: `planner-message-${messageIndex}`,
    role: message.role === "assistant" ? "assistant" : "user",
    parts: [{ type: "text", text: message.text }],
  }));
  const result = streamText({
    model: plannerLanguageModel(env),
    abortSignal: modelAttemptSignal(),
    system: [
      "You are the planner bench agent.",
      "Call updateBrief, fileBrief, addOffer, and compareOffers.",
      "Ask only for the next missing brief field.",
      "Never invent prices. Normalise offers from package split types.",
      "File only when fileBrief succeeds.",
    ].join(" "),
    messages: await convertToModelMessages(uiMessages),
    stopWhen: stepCountIs(6),
    tools: {
      updateBrief: tool({
        description: "Merge fields into the event brief.",
        inputSchema: z.object({
          text: z.string(),
        }),
        execute: async ({ text }) => {
          const turn = await runFixtureTurn({
            text,
            userText: latestUserText(messages),
            snapshot: state.snapshot,
            client,
            today,
          });
          state.snapshot = turn.snapshot;
          return { reply: turn.reply, stage: turn.snapshot.stage };
        },
      }),
      fileBrief: tool({
        description: "File the brief through the company inbox or a draft proposal.",
        inputSchema: z.object({
          companyId: z.number().int().optional(),
        }),
        execute: async ({ companyId }) => {
          const turn = await fileChatBrief({
            snapshot: state.snapshot,
            client,
            today,
            companyId,
            userText: latestUserText(messages),
          });
          state.snapshot = turn.snapshot;
          return { reply: turn.reply, filing: turn.snapshot.filing };
        },
      }),
      addOffer: tool({
        description: "Add fixture venue proposals, or one pasted offer line.",
        inputSchema: z.object({
          text: z.string().default("add the venue proposals"),
        }),
        execute: async ({ text }) => {
          const turn = await runFixtureTurn({
            text,
            userText: latestUserText(messages),
            snapshot: state.snapshot,
            client,
            today,
          });
          state.snapshot = turn.snapshot;
          return {
            reply: turn.reply,
            offers: turn.snapshot.offers.map((offer) => offer.venueName),
          };
        },
      }),
      compareOffers: tool({
        description: "Build the comparison grid against the brief.",
        inputSchema: z.object({
          ready: z.boolean().default(true),
        }),
        execute: async () => {
          const turn = await runFixtureTurn({
            text: "compare",
            userText: latestUserText(messages),
            snapshot: state.snapshot,
            client,
            today,
          });
          state.snapshot = turn.snapshot;
          return { reply: turn.reply, grid: turn.snapshot.grid };
        },
      }),
    },
  });
  const reply = await result.text;
  return { reply, snapshot: state.snapshot };
}

export async function fileChatBrief(input: {
  snapshot: PlannerSnapshot;
  client: ProposalesClient;
  today: string;
  companyId?: number;
  userText?: string;
}): Promise<{ reply: string; snapshot: PlannerSnapshot }> {
  const spoken = input.userText ?? "";
  if (!isFileUtterance(spoken)) {
    return { reply: input.snapshot.notice ?? "", snapshot: input.snapshot };
  }
  const selectedCompanyId = input.companyId === undefined ? input.snapshot.selectedCompanyId : input.companyId;
  const attempt = await attemptFiling({
    brief: input.snapshot.brief,
    filing: input.snapshot.filing,
    filingKey: input.snapshot.filingKey,
    filingAvailable: input.snapshot.filingAvailable,
    selectedCompanyId,
    companies: input.snapshot.companies,
    client: input.client,
    utterance: spoken,
  });
  return runFixtureTurn({
    text: spoken,
    userText: spoken,
    snapshot: {
      ...input.snapshot,
      filing: attempt.filing,
      filingKey: attempt.filingKey,
      filingAvailable: attempt.filingAvailable,
      selectedCompanyId: attempt.selectedCompanyId,
      notice: attempt.notice,
    },
    client: input.client,
    today: input.today,
    filingSettled: true,
  });
}

function envValue(name: string): string | undefined {
  if (!Object.hasOwn(process.env, name)) {
    return undefined;
  }
  const value: unknown = Reflect.get(process.env, name);
  return typeof value === "string" ? value : undefined;
}
