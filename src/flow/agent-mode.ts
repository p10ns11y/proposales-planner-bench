import { createXai, type XaiLanguageModelResponsesOptions } from "@ai-sdk/xai";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import { completeDayPart } from "../domain/day-part";
import {
  assumedSpan,
  budgetScopeSchema,
  dayPartSchema,
  mealKindSchema,
  mergeBrief,
  plannerBriefSchema,
  type PlannerBrief,
} from "../domain/planner-brief";
import { addEnglishLanguage } from "./brief-language";
import { extractBriefPatch } from "./fixture-extractor";
import type { PlannerChatEnv } from "./planner-chat";

export const defaultPlannerModelId = "grok-4.7";

export const modelAttemptMs = 40_000;

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
  const finish = (extracted: PlannerBrief, planner: PlannerPath) => ({
    brief: addEnglishLanguage(input.text, input.brief, extracted),
    planner,
  });
  if (!modelIsUsable(input.env)) {
    return finish(scripted, "scripted");
  }
  const extract = input.extractWithModel ?? ((text, brief) => extractBriefWithModel(text, brief, input.env));
  try {
    const modelPatch = await extract(input.text, input.brief);
    const parsed = plannerBriefSchema.safeParse(modelPatch);
    if (!parsed.success) {
      return finish(scripted, "scripted");
    }
    return finish(mergeBrief(parsed.data, scripted), "model");
  } catch {
    return finish(scripted, "scripted");
  }
}

const extractionInstructions = [
  "Extract an event brief. Omit unknown fields. City only. Clocks are HH:MM. Duration is minutes.",
  "When no clock is stated, set only timeAssumption.dayPart: full-day or all-day for 09:00-17:00, half-day or morning for 09:00-12:00, afternoon for 13:00-17:00.",
  "breakoutRoomCount is the stated count, or 1 when breakout space is requested.",
  "foodRequest.meal is breakfast, lunch, or dinner. foodRequest.dietaryNeeds lists named diets. A meal or a diet sets foodRequired.",
  "budget.amount is major units. budget.currency is a three-letter code. Set budget.scope to per-person for per person, pp, or each, and to total only when total is stated. Otherwise omit scope. around, about, or approximately sets budget.approximate.",
];

export function briefExtractionPrompt(brief: PlannerBrief, text: string): string {
  return [...extractionInstructions, `Current brief: ${JSON.stringify(brief)}`, `Words: ${text}`].join(" ");
}

export const briefExtractionSchema = z.object({
  eventTitle: z.string().optional(),
  contactEmail: z.string().optional(),
  organisationName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  attendeeCount: z.number().optional(),
  roomCount: z.number().optional(),
  meetingRoomCount: z.number().optional(),
  breakoutRoomCount: z.number().optional(),
  foodRequired: z.boolean().optional(),
  foodRequest: z
    .object({
      meal: mealKindSchema.optional(),
      dietaryNeeds: z.array(z.string()).optional(),
    })
    .optional(),
  city: z.string().optional(),
  budget: z
    .object({
      amount: z.number(),
      currency: z.string(),
      scope: budgetScopeSchema.optional(),
      approximate: z.boolean().optional(),
    })
    .optional(),
  notes: z.string().optional(),
  language: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  durationMinutes: z.number().optional(),
  timeAssumption: z
    .object({
      dayPart: dayPartSchema,
    })
    .optional(),
});

export function briefFromExtraction(value: unknown): PlannerBrief {
  return mergeBrief({}, completeDayPart(partialFromExtraction(briefExtractionSchema.parse(value))));
}

async function extractBriefWithModel(
  text: string,
  brief: PlannerBrief,
  env: PlannerChatEnv,
): Promise<PlannerBrief> {
  const result = await generateObject({
    model: plannerLanguageModel(env),
    schema: briefExtractionSchema,
    abortSignal: modelAttemptSignal(),
    providerOptions: briefExtractionProviderOptions,
    prompt: briefExtractionPrompt(brief, text),
  });
  return briefFromExtraction(result.object);
}

function partialFromExtraction(extracted: z.infer<typeof briefExtractionSchema>): PlannerBrief {
  const partial: PlannerBrief = {};
  assignText(partial, "eventTitle", extracted.eventTitle);
  assignText(partial, "contactEmail", extracted.contactEmail);
  assignText(partial, "organisationName", extracted.organisationName);
  assignText(partial, "startDate", extracted.startDate);
  assignText(partial, "endDate", extracted.endDate);
  assignText(partial, "city", extracted.city);
  assignText(partial, "notes", extracted.notes);
  assignText(partial, "language", extracted.language);
  assignCount(partial, "attendeeCount", extracted.attendeeCount, 0);
  assignCount(partial, "roomCount", extracted.roomCount, 0);
  assignCount(partial, "meetingRoomCount", extracted.meetingRoomCount, 0);
  assignCount(partial, "breakoutRoomCount", extracted.breakoutRoomCount, 1);
  if (extracted.foodRequired !== undefined) {
    partial.foodRequired = extracted.foodRequired;
  }
  const foodRequest = foodFromExtraction(extracted.foodRequest);
  if (foodRequest !== undefined) {
    partial.foodRequest = foodRequest;
  }
  const budget = budgetFromExtraction(extracted.budget);
  if (budget !== undefined) {
    partial.budget = budget;
  }
  const startTime = clockOrUndefined(extracted.startTime);
  if (startTime !== undefined) {
    partial.startTime = startTime;
  }
  const endTime = clockOrUndefined(extracted.endTime);
  if (endTime !== undefined) {
    partial.endTime = endTime;
  }
  assignCount(partial, "durationMinutes", extracted.durationMinutes, 1);
  const dayPart = extracted.timeAssumption?.dayPart;
  if (dayPart !== undefined) {
    partial.timeAssumption = { dayPart, statement: assumedSpan(dayPart).timeAssumption.statement };
  }
  return partial;
}

function foodFromExtraction(
  foodRequest: z.infer<typeof briefExtractionSchema>["foodRequest"],
): PlannerBrief["foodRequest"] {
  if (foodRequest === undefined) {
    return undefined;
  }
  const dietaryNeeds = foodRequest.dietaryNeeds?.map((need) => need.trim()).filter((need) => need !== "");
  if (foodRequest.meal === undefined && (dietaryNeeds === undefined || dietaryNeeds.length === 0)) {
    return undefined;
  }
  return {
    ...(foodRequest.meal !== undefined ? { meal: foodRequest.meal } : {}),
    ...(dietaryNeeds !== undefined && dietaryNeeds.length > 0 ? { dietaryNeeds } : {}),
  };
}

function budgetFromExtraction(
  budget: z.infer<typeof briefExtractionSchema>["budget"],
): PlannerBrief["budget"] {
  if (budget === undefined || !Number.isFinite(budget.amount) || budget.amount < 0) {
    return undefined;
  }
  const currency = budget.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return undefined;
  }
  return {
    amount: budget.amount,
    currency,
    ...(budget.scope !== undefined ? { scope: budget.scope } : {}),
    ...(budget.approximate !== undefined ? { approximate: budget.approximate } : {}),
  };
}

function assignText(
  partial: PlannerBrief,
  field: "eventTitle" | "contactEmail" | "organisationName" | "startDate" | "endDate" | "city" | "notes" | "language",
  value: string | undefined,
) {
  const trimmed = value?.trim() ?? "";
  if (trimmed !== "") {
    partial[field] = trimmed;
  }
}

function assignCount(
  partial: PlannerBrief,
  field: "attendeeCount" | "roomCount" | "meetingRoomCount" | "breakoutRoomCount" | "durationMinutes",
  value: number | undefined,
  minimum: number,
) {
  const count = wholeNumber(value, minimum);
  if (count !== undefined) {
    partial[field] = count;
  }
}

function wholeNumber(value: number | undefined, minimum: number): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined;
  }
  const rounded = Math.round(value);
  if (!Number.isSafeInteger(rounded) || rounded < minimum) {
    return undefined;
  }
  return rounded;
}

function clockOrUndefined(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (match?.[1] === undefined || match[2] === undefined) {
    return undefined;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    return undefined;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function nonEmpty(value: string | undefined): value is string {
  return value !== undefined && value !== "";
}
