import { z } from "zod";
import { minorFromBudgetMajor, minorUnits } from "../domain/minor-units";
import { plannerBriefSchema, type PlannerBrief } from "../domain/planner-brief";

const textField = z.string().optional();

export const moreDetailsSchema = z.object({
  eventTitle: textField,
  organisationName: textField,
  contactEmail: textField,
  city: textField,
  language: textField,
  startDate: textField,
  endDate: textField,
  startTime: textField,
  endTime: textField,
  attendeeCount: textField,
  roomCount: textField,
  meetingRoomCount: textField,
  foodRequired: z.enum(["", "yes", "no"]).optional(),
  notes: textField,
  budget: textField,
  budgetBasis: z.enum(["", "total", "per-person"]).optional(),
  currency: textField,
});

export type MoreDetails = z.infer<typeof moreDetailsSchema>;

const clockPattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function applyMoreDetails(brief: PlannerBrief, details: MoreDetails): PlannerBrief {
  const next: PlannerBrief = { ...brief };
  assignText(next, "eventTitle", details.eventTitle);
  assignText(next, "organisationName", details.organisationName);
  assignText(next, "contactEmail", details.contactEmail);
  assignText(next, "language", details.language);
  assignText(next, "notes", details.notes);
  assignText(next, "city", details.city);
  assignDate(next, "startDate", details.startDate);
  assignDate(next, "endDate", details.endDate);
  assignClock(next, "startTime", details.startTime);
  assignClock(next, "endTime", details.endTime);
  assignCount(next, "attendeeCount", details.attendeeCount);
  assignCount(next, "roomCount", details.roomCount);
  assignCount(next, "meetingRoomCount", details.meetingRoomCount);
  assignFood(next, details.foodRequired);
  assignBudget(next, details.budget);
  assignBasis(next, details.budgetBasis);
  assignCurrency(next, details.currency);
  return plannerBriefSchema.parse(next);
}

function assignText(
  brief: PlannerBrief,
  key: "eventTitle" | "organisationName" | "contactEmail" | "language" | "notes" | "city",
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
  key: "attendeeCount" | "roomCount" | "meetingRoomCount",
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

function assignDate(brief: PlannerBrief, key: "startDate" | "endDate", value: string | undefined) {
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

function assignClock(brief: PlannerBrief, key: "startTime" | "endTime", value: string | undefined) {
  if (value === undefined) {
    return;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    delete brief[key];
    return;
  }
  if (!clockPattern.test(trimmed)) {
    return;
  }
  brief[key] = trimmed;
}

function assignBasis(brief: PlannerBrief, value: MoreDetails["budgetBasis"]) {
  if (value === undefined || brief.budget === undefined) {
    return;
  }
  if (value === "") {
    const next = { ...brief.budget };
    delete next.scope;
    brief.budget = next;
    return;
  }
  brief.budget = { ...brief.budget, scope: value };
}

function assignCurrency(brief: PlannerBrief, value: string | undefined) {
  if (value === undefined) {
    return;
  }
  const code = value.trim().toUpperCase();
  if (code === "") {
    delete brief.statedCurrency;
    return;
  }
  if (!/^[A-Z]{3}$/.test(code)) {
    return;
  }
  brief.statedCurrency = code;
  if (brief.budget !== undefined) {
    brief.budget = { ...brief.budget, currency: code };
  }
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
