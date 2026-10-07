import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  gateway,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createClient } from "../proposales/client";
import type { ProposalesClient } from "../proposales/types";
import { gatewayAttemptSignal, gatewayIsUsable } from "./agent-mode";
import { latestUserText, openingSnapshot, readChatRequest, type ChatTurnMessage } from "./chat-request";
import type { PlannerSnapshot } from "./planner-snapshot";
import { runFixtureTurn } from "./scripted-turn";

export type PlannerUIMessage = UIMessage<unknown, { snapshot: PlannerSnapshot }>;

const plannerModelId = "openai/gpt-4.1-mini";

export type PlannerChatEnv = {
  PROPOSALES_MODE?: string;
  PROPOSALES_API_KEY?: string;
  AI_GATEWAY_API_KEY?: string;
  PLANNER_MODEL?: string;
  VERCEL?: string;
  VERCEL_OIDC_TOKEN?: string;
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
  const companies =
    chatRequest.snapshot === null || chatRequest.snapshot.companies.length === 0
      ? await client.listCompanies()
      : chatRequest.snapshot.companies;
  const snapshot = chatRequest.snapshot ?? openingSnapshot(companies);
  const turn = await completeChatTurn({
    messages: chatRequest.messages,
    snapshot,
    client,
    today,
    env,
  });
  const stream = createUIMessageStream<PlannerUIMessage>({
    execute: ({ writer }) => {
      const textId = "planner-reply";
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: turn.reply });
      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "data-snapshot", data: turn.snapshot });
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
  if (!gatewayIsUsable(input.env)) {
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
    AI_GATEWAY_API_KEY: envValue("AI_GATEWAY_API_KEY"),
    PLANNER_MODEL: envValue("PLANNER_MODEL"),
    VERCEL: envValue("VERCEL"),
    VERCEL_OIDC_TOKEN: envValue("VERCEL_OIDC_TOKEN"),
  };
}

async function scriptedChatTurn(input: {
  messages: ChatTurnMessage[];
  snapshot: PlannerSnapshot;
  client: ProposalesClient;
  today: string;
}): Promise<{ reply: string; snapshot: PlannerSnapshot }> {
  return runFixtureTurn({
    text: latestUserText(input.messages),
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
    model: gateway(env.PLANNER_MODEL ?? plannerModelId),
    abortSignal: gatewayAttemptSignal(),
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
          const turn = await runFixtureTurn({ text, snapshot: state.snapshot, client, today });
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
          const selectedCompanyId = companyId ?? state.snapshot.selectedCompanyId;
          const nextSnapshot = { ...state.snapshot, selectedCompanyId };
          const turn = await runFixtureTurn({
            text: "file the brief",
            snapshot: nextSnapshot,
            client,
            today,
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
          const turn = await runFixtureTurn({ text, snapshot: state.snapshot, client, today });
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

function envValue(name: string): string | undefined {
  if (!Object.hasOwn(process.env, name)) {
    return undefined;
  }
  const value: unknown = Reflect.get(process.env, name);
  return typeof value === "string" ? value : undefined;
}
