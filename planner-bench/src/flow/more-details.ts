import { z } from "zod";
import { minorFromBudgetMajor, minorUnits } from "../domain/minor-units";
import { plannerBriefSchema, type PlannerBrief } from "../domain/planner-brief";

const textField = z.string().optional();

export const moreDetailsSchema = z.object({
  eventTitle: textField,
  organisationName: textField,
  contactEmail: textField,
  language: textField,
  roomCount: textField,
  meetingRoomCount: textField,
  foodRequired: z.enum(["", "yes", "no"]).optional(),
  notes: textField,
  budget: textField,
});

export type MoreDetails = z.infer<typeof moreDetailsSchema>;

export function applyMoreDetails(brief: PlannerBrief, details: MoreDetails): PlannerBrief {
  const next: PlannerBrief = { ...brief };
  assignText(next, "eventTitle", details.eventTitle);
  assignText(next, "organisationName", details.organisationName);
  assignText(next, "contactEmail", details.contactEmail);
  assignText(next, "language", details.language);
  assignText(next, "notes", details.notes);
  assignCount(next, "roomCount", details.roomCount);
  assignCount(next, "meetingRoomCount", details.meetingRoomCount);
  assignFood(next, details.foodRequired);
  assignBudget(next, details.budget);
  return plannerBriefSchema.parse(next);
}

function assignText(
  brief: PlannerBrief,
  key: "eventTitle" | "organisationName" | "contactEmail" | "language" | "notes",
  value: string | undefined,
) {
  if (value === undefined) {
    return;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    delete brief[key];
    return;
  }
  brief[key] = trimmed;
}

function assignCount(
  brief: PlannerBrief,
  key: "roomCount" | "meetingRoomCount",
  value: string | undefined,
) {
  if (value === undefined) {
    return;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    delete brief[key];
    return;
  }
  const count = Number(trimmed);
  if (!Number.isInteger(count) || count < 0) {
    return;
  }
  brief[key] = count;
}

function assignFood(brief: PlannerBrief, value: MoreDetails["foodRequired"]) {
  if (value === undefined) {
    return;
  }
  if (value === "") {
    delete brief.foodRequired;
    return;
  }
  brief.foodRequired = value === "yes";
}

function assignBudget(brief: PlannerBrief, value: string | undefined) {
  if (value === undefined) {
    return;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    delete brief.budgetMinor;
    return;
  }
  const amount = minorFromBudgetMajor(trimmed);
  if (amount === undefined) {
    return;
  }
  brief.budgetMinor = minorUnits(amount);
}
