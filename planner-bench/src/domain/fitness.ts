import { makeConditionalSchemaTransformer } from "@adaptate/core";
import type { ZodType } from "zod";
import { budgetNeedsBasis, plannerBriefSchema, stayNeedsRooms, type PlannerBrief } from "./planner-brief";
import { venueOfferSchema } from "./venue-offer";

export const briefFitnessConsumers = ["brief:fileable", "brief:comparable"] as const;
export type BriefFitnessConsumer = (typeof briefFitnessConsumers)[number];

function roomsRequiredWhenTheStayContinues(data: unknown): boolean {
  return stayNeedsRooms(plannerBriefSchema.parse(data));
}

function needsClockEnd(data: unknown): boolean {
  const brief = plannerBriefSchema.parse(data);
  if (brief.durationMinutes !== undefined) {
    return false;
  }
  return !((brief.endDate as string) > (brief.startDate as string));
}

export const briefFileableConfig = {
  contactEmail: true,
  startDate: true,
  endDate: true,
  attendeeCount: true,
  language: true,
  roomCount: { requiredIf: roomsRequiredWhenTheStayContinues },
} as const;

export const briefComparableConfig = {
  city: true,
  startDate: true,
  startTime: true,
  attendeeCount: true,
  endTime: { requiredIf: needsClockEnd },
} as const;

export const offerGridRowConfig = {
  venueName: true,
  currency: true,
  totalMinor: true,
} as const;

const briefConfigByConsumer = {
  "brief:fileable": briefFileableConfig,
  "brief:comparable": briefComparableConfig,
} as const;

export function findBriefGaps(brief: unknown, consumer: BriefFitnessConsumer): string[] {
  return findGaps(brief, plannerBriefSchema, briefConfigByConsumer[consumer]);
}

export function findOfferGaps(offer: unknown): string[] {
  return findGaps(offer, venueOfferSchema, offerGridRowConfig);
}

export function findGaps(
  value: unknown,
  schema: ZodType,
  config: Record<string, unknown>,
): string[] {
  const transformer = makeConditionalSchemaTransformer(value)(schema, config);
  const parsed = transformer.schema.safeParse(value);
  if (parsed.success) {
    return [];
  }
  const missingFields = new Set<unknown>();
  for (const issue of parsed.error.issues) {
    missingFields.add(issue.path[0]);
  }
  return Object.keys(config).filter((field) => missingFields.has(field));
}

const questionByField: Record<string, string> = {
  eventTitle: "What should we call this event?",
  contactEmail: "Add an email under More so venues reply to this address.",
  startDate: "Add the start date in the message, as YYYY-MM-DD.",
  endDate: "Add the end date in the message, as YYYY-MM-DD.",
  attendeeCount: "Add how many people are coming in the message.",
  language: "Add a language under More.",
  roomCount: "Add how many rooms you need under More for this multi-day stay.",
  city: "Which city is the event in?",
  startTime: "What time does it start?",
  endTime: "When does it end, or how long does it run?",
  durationMinutes: "How long does it run?",
  meetingRoomCount: "How many meeting rooms do you need?",
  foodRequired: "Do you need food and drink included?",
  venueName: "Which venue sent this offer?",
  currency: "Which currency is this offer in?",
  totalMinor: "What is the offer total in minor units?",
  budgetBasis: "Is that per person or total?",
};

export function questionForGap(field: string): string {
  return questionByField[field] ?? `What should we use for ${field}?`;
}

export function isFileableGap(field: string | undefined): boolean {
  return Object.hasOwn(briefFileableConfig, field ?? "");
}

export function briefConfirmHold(brief: PlannerBrief): { gaps: string[]; question: string } | null {
  const gaps = findBriefGaps(brief, "brief:comparable");
  const first = gaps[0];
  if (first !== undefined) {
    return { gaps, question: questionForGap(first) };
  }
  if (budgetNeedsBasis(brief)) {
    return { gaps: ["budgetBasis"], question: questionForGap("budgetBasis") };
  }
  return null;
}
