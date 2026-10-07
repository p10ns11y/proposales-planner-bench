import { createXai, type XaiLanguageModelResponsesOptions } from "@ai-sdk/xai";
import { generateObject, type LanguageModel } from "ai";
import { mergeBrief, plannerBriefSchema, type PlannerBrief } from "../domain/planner-brief";
import { extractBriefPatch } from "./fixture-extractor";
import type { PlannerChatEnv } from "./planner-chat";

export const defaultPlannerModelId = "grok-4.7";

export const modelAttemptMs = 20_000;

export const briefExtractionProviderOptions = {
  xai: {
    reasoningEffort: "low",
  } satisfies XaiLanguageModelResponsesOptions,
};

export type PlannerPath = "model" | "scripted";

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
}): Promise<{ brief: PlannerBrief; planner: PlannerPath }> {
  const scripted = extractBriefPatch(input.text);
  if (!modelIsUsable(input.env)) {
    return { brief: scripted, planner: "scripted" };
  }
  const extract = input.extractWithModel ?? ((text, brief) => extractBriefWithModel(text, brief, input.env));
  try {
    const modelPatch = await extract(input.text, input.brief);
    const parsed = plannerBriefSchema.safeParse(modelPatch);
    if (!parsed.success) {
      return { brief: scripted, planner: "scripted" };
    }
    return { brief: mergeBrief(parsed.data, scripted), planner: "model" };
  } catch {
    return { brief: scripted, planner: "scripted" };
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
    providerOptions: briefExtractionProviderOptions,
    prompt: [
      "Extract fields for an event brief.",
      "Location must be a city.",
      "Times use HH:MM.",
      "A full day or all day is 09:00 to 17:00.",
      "A half day or morning is 09:00 to 12:00.",
      "An afternoon is 13:00 to 17:00.",
      "When a day-part supplies the time and no clock is stated, set startTime, endTime, and timeAssumption.",
      "timeAssumption.dayPart is full-day, all-day, half-day, morning, or afternoon.",
      "timeAssumption.statement says the span was assumed, for example Assumed 09:00–17:00 for a full day.",
      "Duration is minutes.",
      "breakoutRoomCount is the number of breakout rooms. Use the count given, or 1 when breakout space is requested.",
      "Attach dietary needs to foodRequest with the meal. Meals are breakfast, lunch, or dinner.",
      "Include vegetarian, vegan, gluten-free, and any other diet that was named.",
      "A meal or a diet also sets foodRequired.",
      "budget.amount is the major-unit number and budget.currency is a three-letter uppercase code.",
      "Set budget.scope to per-person or total only when the words say which. around, about, or approximately sets budget.approximate.",
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
