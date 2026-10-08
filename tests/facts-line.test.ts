import { describe, expect, it } from "vitest";
import type { PlannerBrief } from "../src/domain/planner-brief";
import { emptySnapshot } from "../src/flow/planner-snapshot";
import { appendBudgetLine } from "../src/view-models/facts-line";
import { shellViewModel } from "../src/view-models/selectors";
import type { ConfirmRun } from "../src/view-models/view-model";

const fullDayStatement = "Assumed 09:00\u201317:00 for a full day";

function joined(runs: ConfirmRun[]): string {
  return runs.map((run) => run.text).join("");
}

function confirmView(brief: PlannerBrief) {
  return shellViewModel({
    snapshot: {
      ...emptySnapshot([], "", []),
      phase: "confirm",
      brief,
    },
    busy: false,
    errorText: null,
    speechAvailable: false,
  });
}

const stockholmDay: PlannerBrief = {
  city: "Stockholm",
  startDate: "2026-12-03",
  startTime: "09:00",
  endTime: "17:00",
  attendeeCount: 25,
  budget: { amount: 300, currency: "EUR", scope: "total" },
};

describe("appendBudgetLine", () => {
  it("starts with Budget when nothing precedes it", () => {
    const runs: ConfirmRun[] = [];
    appendBudgetLine(runs, { budget: { amount: 300, currency: "EUR", scope: "total" } });
    expect(runs.map((run) => ({ kind: run.kind, text: run.text }))).toEqual([
      { kind: "text", text: "Budget " },
      { kind: "fact", text: "EUR 300" },
      { kind: "text", text: " " },
      { kind: "fact", text: "total" },
      { kind: "text", text: "." },
    ]);
    expect(runs.every((run) => run.inSentence)).toBe(true);
    expect(joined(runs)).toBe("Budget EUR 300 total.");
    expect(runs.filter((run) => run.kind === "fact").map((run) => (run.kind === "fact" ? run.name : ""))).toEqual([
      "budget",
      "budget-basis",
    ]);
  });

  it("breaks the sentence after one earlier line", () => {
    const runs: ConfirmRun[] = [{ kind: "text", text: fullDayStatement, inSentence: true }];
    appendBudgetLine(runs, { budget: { amount: 300, currency: "EUR", scope: "total" } });
    expect(runs.map((run) => run.text)).toEqual([fullDayStatement, ". ", "Budget ", "EUR 300", " ", "total", "."]);
    expect(joined(runs)).toBe(`${fullDayStatement}. Budget EUR 300 total.`);
  });

  it("leaves the runs alone when the brief has no budget", () => {
    const runs: ConfirmRun[] = [{ kind: "fact", name: "city", text: "Stockholm", inSentence: true }];
    appendBudgetLine(runs, {});
    expect(runs).toEqual([{ kind: "fact", name: "city", text: "Stockholm", inSentence: true }]);
  });

  it("omits the basis span when the scope is unset", () => {
    const runs: ConfirmRun[] = [{ kind: "text", text: "Stockholm", inSentence: true }];
    appendBudgetLine(runs, { budget: { amount: 300, currency: "EUR" } });
    expect(runs.map((run) => run.text)).toEqual(["Stockholm", ". ", "Budget ", "EUR 300", "."]);
    expect(runs.some((run) => run.kind === "fact" && run.name === "budget-basis")).toBe(false);
    expect(runs.find((run) => run.kind === "fact" && run.name === "budget")).toMatchObject({
      text: "EUR 300",
      inSentence: true,
    });
  });

  it("names a per-person basis and keeps a fractional amount", () => {
    const runs: ConfirmRun[] = [];
    appendBudgetLine(runs, { budget: { amount: 12.5, currency: "EUR", scope: "per-person" } });
    expect(joined(runs)).toBe("Budget EUR 12.5 per person.");
    expect(runs.find((run) => run.kind === "fact" && run.name === "budget-basis")).toMatchObject({
      text: "per person",
      inSentence: true,
    });
  });

  it("prints a zero amount in the given currency", () => {
    const runs: ConfirmRun[] = [];
    appendBudgetLine(runs, { budget: { amount: 0, currency: "SEK", scope: "total" } });
    expect(joined(runs)).toBe("Budget SEK 0 total.");
  });
});

describe("confirm facts sentence", () => {
  it("places the budget after an assumption", () => {
    const view = confirmView({
      ...stockholmDay,
      timeAssumption: { dayPart: "full-day", statement: fullDayStatement },
    });
    expect(view.factsSentence).toBe(
      `Stockholm, 3 December 2026, 09:00\u201317:00, 25 people. ${fullDayStatement}. Budget EUR 300 total.`,
    );
    expect(view.confirmRuns.find((run) => run.kind === "fact" && run.name === "budget")?.text).toBe("EUR 300");
    expect(view.confirmRuns.find((run) => run.kind === "fact" && run.name === "budget-basis")?.text).toBe("total");
    const visible = view.confirmRuns.map((run) => run.text).join("");
    expect(visible).toBe(view.factsSentence);
  });

  it("places the budget after the facts when nothing was assumed", () => {
    const view = confirmView(stockholmDay);
    expect(view.factsSentence).toBe("Stockholm, 3 December 2026, 09:00\u201317:00, 25 people. Budget EUR 300 total.");
    expect(view.confirmRuns.some((run) => run.text === fullDayStatement)).toBe(false);
    expect(view.confirmRuns.find((run) => run.kind === "fact" && run.name === "budget-basis")?.text).toBe("total");
  });
});
