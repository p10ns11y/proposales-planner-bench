import { z } from "zod";
import { minorUnits } from "../domain/minor-units";
import { plannerBriefSchema, type PlannerBrief } from "../domain/planner-brief";

export const moreDetailsSchema = z.object({
  eventTitle: z.string(),
  organisationName: z.string(),
  contactEmail: z.string(),
  language: z.string(),
  roomCount: z.string(),
  meetingRoomCount: z.string(),
  foodRequired: z.enum(["", "yes", "no"]),
  notes: z.string(),
  budget: z.string(),
});

export type MoreDetails = z.infer<typeof moreDetailsSchema>;

export function applyMoreDetails(brief: PlannerBrief, details: MoreDetails): PlannerBrief {
  return plannerBriefSchema.parse({
    ...brief,
    eventTitle: blank(details.eventTitle),
    organisationName: blank(details.organisationName),
    contactEmail: blank(details.contactEmail),
    language: blank(details.language),
    roomCount: countOrUndefined(details.roomCount),
    meetingRoomCount: countOrUndefined(details.meetingRoomCount),
    foodRequired: foodOrUndefined(details.foodRequired),
    notes: blank(details.notes),
    budgetMinor: budgetOrUndefined(details.budget),
  });
}

function blank(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function countOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }
  const count = Number(trimmed);
  if (!Number.isInteger(count) || count < 0) {
    return undefined;
  }
  return count;
}

function foodOrUndefined(value: MoreDetails["foodRequired"]): boolean | undefined {
  if (value === "") {
    return undefined;
  }
  return value === "yes";
}

function budgetOrUndefined(value: string): PlannerBrief["budgetMinor"] {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }
  const amount = Number(trimmed);
  if (!Number.isInteger(amount)) {
    return undefined;
  }
  return minorUnits(amount);
}
