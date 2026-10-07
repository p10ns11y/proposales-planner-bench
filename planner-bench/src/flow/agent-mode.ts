import { generateObject, gateway } from "ai";
import { mergeBrief, plannerBriefSchema, type PlannerBrief } from "../domain/planner-brief";
import { extractBriefPatch } from "./fixture-extractor";
import type { PlannerChatEnv } from "./planner-chat";

const plannerModelId = "openai/gpt-4.1-mini";

export const gatewayAttemptMs = 4_000;

export function gatewayAttemptSignal(): AbortSignal {
  return AbortSignal.timeout(gatewayAttemptMs);
}

export function gatewayIsUsable(env: PlannerChatEnv): boolean {
  return nonEmpty(env.AI_GATEWAY_API_KEY) || nonEmpty(env.VERCEL_OIDC_TOKEN) || env.VERCEL === "1";
}

export async function resolveBriefPatch(input: {
  text: string;
  brief: PlannerBrief;
  env: PlannerChatEnv;
  extractWithModel?: (text: string, brief: PlannerBrief) => Promise<PlannerBrief>;
}): Promise<PlannerBrief> {
  const scripted = extractBriefPatch(input.text);
  if (!gatewayIsUsable(input.env)) {
    return scripted;
  }
  const extract = input.extractWithModel ?? ((text, brief) => extractBriefWithGateway(text, brief, input.env));
  try {
    const modelPatch = await extract(input.text, input.brief);
    const parsed = plannerBriefSchema.safeParse(modelPatch);
    if (!parsed.success) {
      return scripted;
    }
    return mergeBrief(parsed.data, scripted);
  } catch {
    return scripted;
  }
}

async function extractBriefWithGateway(
  text: string,
  brief: PlannerBrief,
  env: PlannerChatEnv,
): Promise<PlannerBrief> {
  const result = await generateObject({
    model: gateway(env.PLANNER_MODEL ?? plannerModelId),
    schema: plannerBriefSchema,
    abortSignal: gatewayAttemptSignal(),
    prompt: [
      "Extract fields for an event brief.",
      "Location must be a city.",
      "Times use HH:MM.",
      "Duration is minutes.",
      "Leave unknown fields out.",
      `Current brief: ${JSON.stringify(brief)}`,
      `Words: ${text}`,
    ].join(" "),
  });
  return plannerBriefSchema.parse(result.object);
}

function nonEmpty(value: string | undefined): boolean {
  return value !== undefined && value !== "";
}
