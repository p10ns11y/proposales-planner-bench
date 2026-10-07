import { createXai } from "@ai-sdk/xai";
import { generateObject, type LanguageModel } from "ai";
import { mergeBrief, plannerBriefSchema, type PlannerBrief } from "../domain/planner-brief";
import { extractBriefPatch } from "./fixture-extractor";
import type { PlannerChatEnv } from "./planner-chat";

export const defaultPlannerModelId = "grok-4.7";

export const modelAttemptMs = 8_000;

export function modelAttemptSignal(): AbortSignal {
  return AbortSignal.timeout(modelAttemptMs);
}

export function modelIsUsable(env: PlannerChatEnv): boolean {
  return nonEmpty(env.XAI_API_KEY);
}

export function plannerLanguageModel(env: PlannerChatEnv): LanguageModel {
  return createXai({ apiKey: env.XAI_API_KEY })(plannerModelId(env));
}

export function plannerModelChoice(env: PlannerChatEnv): { provider: "xai"; modelId: string } {
  return { provider: "xai", modelId: plannerModelId(env) };
}

function plannerModelId(env: PlannerChatEnv): string {
  return nonEmpty(env.PLANNER_MODEL) ? env.PLANNER_MODEL : defaultPlannerModelId;
}

export async function resolveBriefPatch(input: {
  text: string;
  brief: PlannerBrief;
  env: PlannerChatEnv;
  extractWithModel?: (text: string, brief: PlannerBrief) => Promise<PlannerBrief>;
}): Promise<PlannerBrief> {
  const scripted = extractBriefPatch(input.text);
  if (!modelIsUsable(input.env)) {
    return scripted;
  }
  const extract = input.extractWithModel ?? ((text, brief) => extractBriefWithModel(text, brief, input.env));
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

async function extractBriefWithModel(
  text: string,
  brief: PlannerBrief,
  env: PlannerChatEnv,
): Promise<PlannerBrief> {
  const result = await generateObject({
    model: plannerLanguageModel(env),
    schema: plannerBriefSchema,
    abortSignal: modelAttemptSignal(),
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

function nonEmpty(value: string | undefined): value is string {
  return value !== undefined && value !== "";
}
