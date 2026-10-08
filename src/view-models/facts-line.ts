import type { PlannerBrief } from "../domain/planner-brief";
import type { ConfirmFactName, ConfirmRun } from "./view-model";

export function appendBudgetLine(runs: ConfirmRun[], brief: PlannerBrief): void {
  const budget = brief.budget;
  if (budget === undefined) {
    return;
  }
  const lead = budgetLead(runs.length);
  if (lead !== "") {
    runs.push(textRun(lead));
  }
  runs.push(textRun("Budget "));
  runs.push(factRun("budget", `${budget.currency} ${String(budget.amount)}`));
  const basis = basisLabel(budget.scope);
  if (basis !== "") {
    runs.push(textRun(" "));
    runs.push(factRun("budget-basis", basis));
  }
  runs.push(textRun("."));
}

function budgetLead(count: number): string {
  if (count > 0) {
    return ". ";
  }
  return "";
}

function basisLabel(scope: "total" | "per-person" | undefined): string {
  if (scope === "per-person") {
    return "per person";
  }
  if (scope === "total") {
    return "total";
  }
  return "";
}

function textRun(text: string): ConfirmRun {
  return { kind: "text", text, inSentence: true };
}

function factRun(name: ConfirmFactName, text: string): ConfirmRun {
  return { kind: "fact", name, text, inSentence: true };
}
