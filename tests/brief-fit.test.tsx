/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { offerGroupFromShell } from "../src/view-models/offer-part";
import { shellViewModel } from "../src/view-models/selectors";
import { OfferGroupCard } from "../src/views/offer-group";
import { compareOffers, rankComparisonRows } from "../src/domain/compare-offers";
import { minorUnits } from "../src/domain/minor-units";
import { mergeBrief, plannerBriefSchema, type PlannerBrief } from "../src/domain/planner-brief";
import { briefExtractionPrompt, briefExtractionSchema, briefFromExtraction } from "../src/flow/agent-mode";
import { extractBriefPatch } from "../src/flow/fixture-extractor";
import { handlePlannerTurn } from "../src/flow/planner-turn";
import { plannerSnapshotSchema, type PlannerSnapshot } from "../src/flow/planner-snapshot";
import { runViewportAction, type ViewportAction } from "../src/flow/viewport-turn";
import { createFixtureClient } from "../src/proposales/fixture-client";

const today = "2026-10-07";
const presentKey = "present";
const fullDayStatement = "Assumed 09:00\u201317:00 for a full day";
const workshop = "Workshop in Stockholm for 25 people on 3 Dec 2026 from 09:00 to 17:00.";
const bareBudget = `${workshop} Budget around EUR 300.`;
const perPersonBudget = `${workshop} EUR 300 per person.`;
const totalBudget = `${workshop} EUR 300 total.`;
const budgetQuestion = "Is that per person or total?";

const turnBodySchema = z.object({
  snapshot: plannerSnapshotSchema,
  planner: z.enum(["model", "scripted"]),
});

const workshopPatch: PlannerBrief = {
  city: "Stockholm",
  startDate: "2026-12-03",
  endDate: "2026-12-03",
  attendeeCount: 25,
  startTime: "09:00",
  endTime: "17:00",
};

afterEach(() => {
  cleanup();
});

describe("unstated breakout and diet", () => {
  it("renders a Not stated chip on the scripted path and adds no gaps", async () => {
    const ranked = await rankWorkshop({ env: {} }, workshop);
    expect(ranked.planner).toBe("scripted");
    expectUnstated(ranked.snapshot);
  });

  it("renders a Not stated chip on the model path and adds no gaps", async () => {
    const ranked = await rankWorkshop(
      { env: { XAI_API_KEY: presentKey }, extractWithModel: async () => workshopPatch },
      workshop,
    );
    expect(ranked.planner).toBe("model");
    expect(ranked.snapshot.brief.breakoutRoomCount).toBeUndefined();
    expect(ranked.snapshot.brief.foodRequest).toBeUndefined();
    expectUnstated(ranked.snapshot);
  });
});

describe("budget basis", () => {
  it("asks on the scripted path until the answer sets the basis", async () => {
    const client = createFixtureClient();
    const captured = await capture({ env: {} }, bareBudget);
    expect(captured.planner).toBe("scripted");
    expect(captured.snapshot.brief.budget).toEqual({ amount: 300, currency: "EUR", approximate: true });
    expectHolding(captured.snapshot);

    const yes = await runViewportAction({
      action: { type: "composerSubmitted", text: "yes" },
      snapshot: captured.snapshot,
      client,
      today,
    });
    expectHolding(yes.snapshot);

    const confirmedEarly = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: captured.snapshot,
      client,
      today,
    });
    expectHolding(confirmedEarly.snapshot);

    const perPerson = await runViewportAction({
      action: { type: "gapAnswered", text: "per person" },
      snapshot: captured.snapshot,
      client,
      today,
    });
    expect(perPerson.snapshot.phase).toBe("confirm");
    expect(perPerson.snapshot.gaps).toEqual([]);
    expect(perPerson.snapshot.nextQuestion).toBe("Does this brief look right?");
    expect(perPerson.snapshot.brief.budget?.scope).toBe("per-person");

    const each = await runViewportAction({
      action: { type: "gapAnswered", text: "each" },
      snapshot: captured.snapshot,
      client,
      today,
    });
    expect(each.snapshot.brief.budget?.scope).toBe("per-person");

    const pp = await runViewportAction({
      action: { type: "gapAnswered", text: "pp" },
      snapshot: captured.snapshot,
      client,
      today,
    });
    expect(pp.snapshot.brief.budget?.scope).toBe("per-person");

    const total = await runViewportAction({
      action: { type: "gapAnswered", text: "total" },
      snapshot: captured.snapshot,
      client,
      today,
    });
    expect(total.snapshot.brief.budget?.scope).toBe("total");
    expect(total.snapshot.nextQuestion).toBe("Does this brief look right?");

    const perPersonRanked = await finish(perPerson.snapshot);
    const totalRanked = await finish(total.snapshot);
    expect(gapNames(perPersonRanked, "Harbour House")).not.toContain("budget");
    expect(gapNames(totalRanked, "Harbour House")).toContain("budget");
    expect(gapNames(totalRanked, "Canal Loft")).not.toContain("budget");
  });

  it("asks on the model path when the extraction omits the basis", async () => {
    const captured = await capture(
      {
        env: { XAI_API_KEY: presentKey },
        extractWithModel: async () => ({
          ...workshopPatch,
          budget: { amount: 300, currency: "EUR", approximate: true },
        }),
      },
      bareBudget,
    );
    expect(captured.planner).toBe("model");
    expect(captured.snapshot.brief.budget?.scope).toBeUndefined();
    expectHolding(captured.snapshot);

    const answered = await handlePlannerTurn(
      turnRequest({ type: "gapAnswered", text: "per person" }, captured.snapshot),
      {
        env: { XAI_API_KEY: presentKey },
        extractWithModel: async () => ({
          budget: { amount: 300, currency: "EUR", approximate: true, scope: "per-person" },
        }),
      },
    );
    const turn = turnBodySchema.parse(await answered.json());
    expect(turn.planner).toBe("model");
    expect(turn.snapshot.brief.budget).toEqual({
      amount: 300,
      currency: "EUR",
      approximate: true,
      scope: "per-person",
    });
    expect(turn.snapshot.nextQuestion).toBe("Does this brief look right?");
    const ranked = await finish(turn.snapshot);
    expect(gapNames(ranked, "Harbour House")).not.toContain("budget");
  });

  it("skips the question for an explicit per-person or total amount", async () => {
    const scriptedPerson = await capture({ env: {} }, perPersonBudget);
    const scriptedTotal = await capture({ env: {} }, totalBudget);
    expect(scriptedPerson.planner).toBe("scripted");
    expect(scriptedTotal.planner).toBe("scripted");
    expectReady(scriptedPerson.snapshot, "per-person");
    expectReady(scriptedTotal.snapshot, "total");

    const modelPerson = await capture(
      {
        env: { XAI_API_KEY: presentKey },
        extractWithModel: async () => ({
          ...workshopPatch,
          budget: { amount: 300, currency: "EUR", scope: "per-person" },
        }),
      },
      perPersonBudget,
    );
    const modelTotal = await capture(
      {
        env: { XAI_API_KEY: presentKey },
        extractWithModel: async () => ({
          ...workshopPatch,
          budget: { amount: 300, currency: "EUR", scope: "total" },
        }),
      },
      "Workshop in Stockholm for 25 people on 3 Dec 2026 from 09:00 to 17:00. Budget around EUR 300.",
    );
    expect(modelPerson.planner).toBe("model");
    expect(modelTotal.planner).toBe("model");
    expectReady(modelPerson.snapshot, "per-person");
    expectReady(modelTotal.snapshot, "total");
  });

  it("reads pp, each, per person, and total without guessing a bare amount", () => {
    expect(extractBriefPatch("around EUR 300").budget).toEqual({
      amount: 300,
      currency: "EUR",
      approximate: true,
    });
    expect(extractBriefPatch("EUR 300 per person").budget).toEqual({
      amount: 300,
      currency: "EUR",
      scope: "per-person",
    });
    expect(extractBriefPatch("EUR 300 total").budget).toEqual({
      amount: 300,
      currency: "EUR",
      scope: "total",
    });
    expect(extractBriefPatch("EUR 300 pp").budget?.scope).toBe("per-person");
    expect(extractBriefPatch("EUR 300pp").budget).toEqual({
      amount: 300,
      currency: "EUR",
      scope: "per-person",
    });
    expect(extractBriefPatch("around EUR 300 each").budget).toEqual({
      amount: 300,
      currency: "EUR",
      scope: "per-person",
      approximate: true,
    });
  });
});

describe("ranking", () => {
  it("orders by currency, then gaps, then price, and ignores unstated breakout and diet", () => {
    const brief: PlannerBrief = {
      city: "Stockholm",
      attendeeCount: 25,
      startDate: "2026-12-03",
      endDate: "2026-12-03",
      startTime: "09:00",
      endTime: "17:00",
      budget: { amount: 300, currency: "EUR", scope: "total" },
    };
    const rows = compareOffers(
      brief,
      [
        {
          venueName: "Dear Hit",
          currency: "EUR",
          city: "Stockholm",
          totalMinor: minorUnits(20_000),
          breakoutRoomCount: 3,
        },
        {
          venueName: "Cheap Miss",
          currency: "EUR",
          city: "Stockholm",
          totalMinor: minorUnits(10_000),
          breakoutRoomCount: 0,
        },
        {
          venueName: "Cheap Krona",
          currency: "SEK",
          city: "Stockholm",
          totalMinor: minorUnits(50),
          breakoutRoomCount: 0,
        },
        {
          venueName: "Gappy Euro",
          currency: "EUR",
          city: "Stockholm",
          totalMinor: minorUnits(1_000),
          breakoutRoomCount: 0,
          expiresAt: "2020-01-01",
        },
      ],
      today,
    );
    expect(rows.map((row) => row.neutral)).toEqual([
      ["breakout", "diet"],
      ["breakout", "diet"],
      ["breakout", "diet", "not-compared"],
      ["breakout", "diet"],
    ]);
    expect(rows.find((row) => row.venueName === "Cheap Miss")?.gaps).toEqual([]);
    expect(rows.find((row) => row.venueName === "Gappy Euro")?.gaps).toEqual(["expired"]);
    const ranked = rankComparisonRows(rows, "EUR");
    expect(ranked.map((row) => row.venueName)).toEqual([
      "Cheap Miss",
      "Dear Hit",
      "Gappy Euro",
      "Cheap Krona",
    ]);

    const stated = compareOffers(
      {
        ...brief,
        breakoutRoomCount: 1,
        foodRequest: { dietaryNeeds: ["vegetarian"] },
      },
      [
        {
          venueName: "Cheap Miss",
          currency: "EUR",
          city: "Stockholm",
          totalMinor: minorUnits(10_000),
          breakoutRoomCount: 0,
        },
      ],
      today,
    )[0];
    expect(stated?.gaps).toEqual(["breakout", "vegetarian"]);
    expect(stated?.neutral ?? []).toEqual([]);
  });
});

describe("extraction payload", () => {
  it("fills a day part the model left without a statement", () => {
    const brief = briefFromExtraction({
      city: "Stockholm",
      attendeeCount: 25,
      startDate: "2026-12-03",
      timeAssumption: { dayPart: "full-day" },
      breakoutRoomCount: 1,
      foodRequest: { meal: "lunch", dietaryNeeds: ["Vegetarian"] },
      budget: { amount: 300, currency: "eur", approximate: true },
    });
    expect(brief.startTime).toBe("09:00");
    expect(brief.endTime).toBe("17:00");
    expect(brief.timeAssumption).toEqual({ dayPart: "full-day", statement: fullDayStatement });
    expect(brief.foodRequest).toEqual({ meal: "lunch", dietaryNeeds: ["vegetarian"] });
    expect(brief.foodRequired).toBe(true);
    expect(brief.budget).toEqual({ amount: 300, currency: "EUR", approximate: true });
    const echoed = briefFromExtraction({
      startTime: "09:00",
      endTime: "17:00",
      timeAssumption: { dayPart: "full-day" },
    });
    expect(echoed.timeAssumption).toEqual({ dayPart: "full-day", statement: fullDayStatement });
    const explicit = briefFromExtraction({
      startTime: "10:00",
      endTime: "16:00",
      timeAssumption: { dayPart: "full-day" },
    });
    expect(explicit.startTime).toBe("10:00");
    expect(explicit.endTime).toBe("16:00");
    expect(explicit.timeAssumption).toBeUndefined();
  });

  it("keeps the same model scope when the scripted amount has no qualifier", () => {
    const merged = mergeBrief(
      { budget: { amount: 300, currency: "EUR", scope: "per-person" } },
      { budget: { amount: 300, currency: "EUR", approximate: true } },
    );
    expect(merged.budget).toEqual({
      amount: 300,
      currency: "EUR",
      approximate: true,
      scope: "per-person",
    });
  });

  it("sends a shorter prompt and schema than the full-day extraction", () => {
    const sample = "Team offsite in Stockholm for 25 people on 3 Dec 2026, a full day.";
    const previous = [
      "Extract fields for an event brief.",
      "Location must be a city.",
      "Times use HH:MM.",
      "A full day or all day is 09:00 to 17:00.",
      "A half day or morning is 09:00 to 12:00.",
      "An afternoon is 13:00 to 17:00.",
      "When a day-part supplies the time and no clock is stated, set startTime, endTime, and timeAssumption.",
      "timeAssumption.dayPart is full-day, all-day, half-day, morning, or afternoon.",
      "timeAssumption.statement says the span was assumed, for example Assumed 09:00\u201317:00 for a full day.",
      "Duration is minutes.",
      "breakoutRoomCount is the number of breakout rooms. Use the count given, or 1 when breakout space is requested.",
      "Attach dietary needs to foodRequest with the meal. Meals are breakfast, lunch, or dinner.",
      "Include vegetarian, vegan, gluten-free, and any other diet that was named.",
      "A meal or a diet also sets foodRequired.",
      "budget.amount is the major-unit number and budget.currency is a three-letter uppercase code.",
      "Set budget.scope to per-person or total only when the words say which. around, about, or approximately sets budget.approximate.",
      "Leave unknown fields out.",
      `Current brief: ${JSON.stringify({})}`,
      `Words: ${sample}`,
    ].join(" ");
    const prompt = briefExtractionPrompt({}, sample);
    expect(prompt).toContain("breakoutRoomCount");
    expect(prompt).toContain("dietaryNeeds");
    expect(prompt).toContain("pp");
    expect(prompt).toContain("each");
    expect(prompt).toContain("per-person");
    expect(prompt).toContain("omit scope");
    expect(prompt.length).toBeLessThan(previous.length);
    const extraction = JSON.stringify(briefExtractionSchema.toJSONSchema({ target: "draft-7" }));
    const domain = JSON.stringify(plannerBriefSchema.toJSONSchema({ target: "draft-7" }));
    expect(extraction.length).toBeLessThan(domain.length);
    expect(extraction).not.toContain("9007199254740991");
    expect(extraction).toContain("breakoutRoomCount");
    expect(extraction).toContain("dietaryNeeds");
    expect(extraction).toContain("per-person");
    expect(domain).toContain("9007199254740991");
  });
});

function expectHolding(snapshot: PlannerSnapshot) {
  expect(snapshot.phase).toBe("confirm");
  expect(snapshot.gaps).toEqual(["budgetBasis"]);
  expect(snapshot.nextQuestion).toBe(budgetQuestion);
  expect(snapshot.grid).toEqual([]);
}

function expectReady(snapshot: PlannerSnapshot, scope: "per-person" | "total") {
  expect(snapshot.phase).toBe("confirm");
  expect(snapshot.gaps).toEqual([]);
  expect(snapshot.nextQuestion).toBe("Does this brief look right?");
  expect(snapshot.brief.budget?.scope).toBe(scope);
  expect(snapshot.brief.budget?.amount).toBe(300);
  expect(snapshot.brief.budget?.currency).toBe("EUR");
}

function expectUnstated(snapshot: PlannerSnapshot) {
  expect(snapshot.phase).toBe("results");
  expect(snapshot.grid.length).toBeGreaterThan(0);
  for (const row of snapshot.grid) {
    expect(row.neutral).toEqual(["breakout", "diet"]);
    expect(row.gaps).not.toContain("breakout");
    expect(row.gaps).not.toContain("vegetarian");
    expect(row.gaps).not.toContain("diet");
  }
  const view = shellViewModel({
    snapshot,
    busy: false,
    errorText: null,
    speechAvailable: false,
  });
  const group = offerGroupFromShell(view);
  if (group === null) {
    throw new Error("Expected an offer group.");
  }
  installMatchMedia();
  render(
    <OfferGroupCard
      group={group}
      hiddenCount={view.hiddenCount}
      openName={null}
      onOpen={() => undefined}
      onShowMore={() => undefined}
    />,
  );
  const chips = [...document.querySelectorAll(".planner-chip-not-stated")];
  expect(chips.length).toBe(group.offers.length * 2);
  expect(chips.every((chip) => chip.textContent === "Not stated")).toBe(true);
  expect(chips.filter((chip) => chip.getAttribute("data-facet") === "breakout")).toHaveLength(group.offers.length);
  expect(chips.filter((chip) => chip.getAttribute("data-facet") === "diet")).toHaveLength(group.offers.length);
  const clear = screen.getByRole("button", { name: /^Harbour House,/ });
  expect(clear.getAttribute("data-gap")).toBe("clear");
  expect(clear.getAttribute("aria-label")).toContain("Breakout not stated");
  expect(clear.getAttribute("aria-label")).toContain("Diet not stated");
  cleanup();
}

async function rankWorkshop(
  options: Parameters<typeof handlePlannerTurn>[1],
  text: string,
): Promise<{ planner: "model" | "scripted"; snapshot: PlannerSnapshot }> {
  const captured = await capture(options, text);
  expect(captured.snapshot.phase).toBe("confirm");
  expect(captured.snapshot.gaps).toEqual([]);
  const ranked = await finish(captured.snapshot);
  return { planner: captured.planner, snapshot: ranked };
}

async function finish(snapshot: PlannerSnapshot): Promise<PlannerSnapshot> {
  const client = createFixtureClient();
  const confirmed = await runViewportAction({
    action: { type: "briefConfirmed" },
    snapshot,
    client,
    today,
  });
  const ranked = await runViewportAction({
    action: { type: "favoritesSubmitted", text: "skip" },
    snapshot: confirmed.snapshot,
    client,
    today,
  });
  return ranked.snapshot;
}

async function capture(options: Parameters<typeof handlePlannerTurn>[1], text: string) {
  const response = await handlePlannerTurn(turnRequest({ type: "captureSubmitted", text }), options);
  expect(response.status).toBe(200);
  return turnBodySchema.parse(await response.json());
}

function gapNames(snapshot: PlannerSnapshot, venueName: string): string[] {
  return snapshot.grid.find((row) => row.venueName === venueName)?.gaps ?? [];
}

function turnRequest(action: ViewportAction, snapshot?: PlannerSnapshot): Request {
  return new Request("http://planner-bench.test/api/turn", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(snapshot === undefined ? { action } : { action, snapshot }),
  });
}

function installMatchMedia() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
}
