import type { PlannerBrief } from "../domain/planner-brief";

export function describesDifferentEvent(current: PlannerBrief, patch: PlannerBrief): boolean {
  if (textDiffers(current.city, patch.city)) {
    return true;
  }
  return textDiffers(current.startDate, patch.startDate);
}

function textDiffers(current: string | undefined, next: string | undefined): boolean {
  const left = fold(current);
  const right = fold(next);
  if (left === "" || right === "") {
    return false;
  }
  return left !== right;
}

function fold(value: string | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase();
}
