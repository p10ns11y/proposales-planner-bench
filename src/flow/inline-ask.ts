import { questionForGap } from "../domain/fitness";
import type { PlannerBrief } from "../domain/planner-brief";
import { firstFileableGap } from "./filing-guard";
import type { PlannerSnapshot } from "./planner-snapshot";

export const inlineFields = ["contactEmail", "endDate", "endTime"] as const;

export type InlineField = (typeof inlineFields)[number];

export const leftUnfiledNote = "Left unfiled.";

export function isInlineField(value: unknown): value is InlineField {
  return inlineFields.some((field) => field === value);
}

export function inlineAskFor(snapshot: PlannerSnapshot): InlineField | null {
  if (snapshot.inlinePaused || snapshot.newEvent !== null) {
    return null;
  }
  const asked = snapshot.gaps[0];
  if (asked === "contactEmail" || asked === "endTime") {
    return asked;
  }
  if (asked === "endDate" && firstFileableGap(snapshot.brief) === "endDate") {
    return "endDate";
  }
  if (snapshot.notice === questionForGap("contactEmail")) {
    return "contactEmail";
  }
  if (snapshot.notice === questionForGap("endTime")) {
    return "endTime";
  }
  if (firstFileableGap(snapshot.brief) === "endDate") {
    return "endDate";
  }
  return null;
}

export function inlineValuePatch(field: InlineField, value: string): PlannerBrief | null {
  const trimmed = value.trim();
  if (field === "contactEmail") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return null;
    }
    return { contactEmail: trimmed };
  }
  if (field === "endDate") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return null;
    }
    return { endDate: trimmed };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
    return null;
  }
  return { endTime: trimmed };
}
