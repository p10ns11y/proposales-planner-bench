import { describe, expect, it } from "vitest";
import { z } from "zod";
import { comparisonGaps } from "../src/domain/compare-offers";
import { questionForGap } from "../src/domain/fitness";
import { minorUnits } from "../src/domain/minor-units";
import { mergeBrief, type PlannerBrief } from "../src/domain/planner-brief";
import { projectBriefFlow } from "../src/flow/brief-flow";
import { extractBriefPatch } from "../src/flow/fixture-extractor";
import { openingSnapshot } from "../src/flow/chat-request";
import { handlePlannerTurn } from "../src/flow/planner-turn";
import { plannerSnapshotSchema, type PlannerSnapshot } from "../src/flow/planner-snapshot";
import { runFixtureTurn } from "../src/flow/scripted-turn";
import { runViewportAction, type ViewportAction } from "../src/flow/viewport-turn";
import { createFixtureClient } from "../src/proposales/fixture-client";
import { shellViewModel } from "../src/view-models/selectors";

const today = "2026-10-06";
const presentKey = "present";
const fullDayStatement = "Assumed 09:00\u201317:00 for a full day";
const stockholmOffsite =
  "Team offsite in Stockholm for 25 people on 3 Dec 2026, a full day with breakout space and vegetarian lunch. Budget around EUR 300.";
const stockholmOffsiteWithoutTime =
  "Team offsite in Stockholm for 25 people on 3 Dec 2026 with breakout space and vegetarian lunch. Budget around EUR 300.";

const turnBodySchema = z.object({
  snapshot: plannerSnapshotSchema,
  planner: z.enum(["model", "scripted"]),
});

const realisticModelPatch: PlannerBrief = {
  eventTitle: "Team offsite",
  city: "Stockholm",
  startDate: "2026-12-03",
  endDate: "2026-12-03",
  attendeeCount: 25,
  startTime: "09:00",
  endTime: "17:00",
  timeAssumption: { dayPart: "full-day", statement: fullDayStatement },
  breakoutRoomCount: 1,
  foodRequired: true,
  foodRequest: { meal: "lunch", dietaryNeeds: ["vegetarian"] },
  budget: { amount: 300, currency: "EUR", approximate: true },
};

describe("full day brief", () => {
  it("reads the Stockholm full-day offsite on the scripted path and stays on confirm until confirmed", async () => {
    const client = createFixtureClient();
    const response = await handlePlannerTurn(turnRequest({ type: "composerSubmitted", text: stockholmOffsite }), {
      env: {},
    });
    expect(response.status).toBe(200);
    const turn = turnBodySchema.parse(await response.json());
    expect(turn.planner).toBe("scripted");
    assertStockholmOffsite(turn.snapshot.brief);
    expect(turn.snapshot.phase).toBe("confirm");
    expect(turn.snapshot.gaps).toEqual(["budgetBasis"]);
    expect(turn.snapshot.nextQuestion).toBe("Is that per person or total?");
    expect(turn.snapshot.offerSource).toBe("fixture");

    const scripted = await runFixtureTurn({
      text: stockholmOffsite,
      snapshot: openingSnapshot(await client.listCompanies()),
      client,
      today,
    });
    expect(scripted.snapshot.phase).toBe("confirm");
    expect(scripted.reply).toContain(fullDayStatement);
    expect(scripted.reply).toContain("Is that per person or total?");
    expect(scripted.snapshot.gaps).toEqual(["budgetBasis"]);
    assertStockholmOffsite(scripted.snapshot.brief);

    let current = turn.snapshot;
    for (const action of stayingActions()) {
      const next = await runViewportAction({ action, snapshot: current, client, today });
      expect(next.snapshot.phase).toBe("confirm");
      expect(next.snapshot.filing).toBeNull();
      assertStockholmOffsite(next.snapshot.brief);
      current = next.snapshot;
    }

    const answered = await runViewportAction({
      action: { type: "gapAnswered", text: "total" },
      snapshot: current,
      client,
      today,
    });
    assertConfirming(answered.snapshot);
    assertStockholmOffsite(answered.snapshot.brief, "total");

    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: answered.snapshot,
      client,
      today,
    });
    expect(confirmed.snapshot.phase).toBe("favorites");
    expect(confirmed.snapshot.filing).toBeNull();
    expect(confirmed.snapshot.offerSource).toBe("fixture");
    assertStockholmOffsite(confirmed.snapshot.brief, "total");

    const affirmed = await runViewportAction({
      action: { type: "composerSubmitted", text: "yes" },
      snapshot: answered.snapshot,
      client,
      today,
    });
    expect(affirmed.snapshot.phase).toBe("favorites");

    const ranked = await runViewportAction({
      action: { type: "favoritesSubmitted", text: "skip" },
      snapshot: confirmed.snapshot,
      client,
      today,
    });
    expect(ranked.snapshot.phase).toBe("results");
    expect(ranked.snapshot.offerSource).toBe("fixture");
    expect(ranked.snapshot.sampleOffers).toBe(false);
    expect(ranked.snapshot.filing).toBeNull();
    const harbour = ranked.snapshot.grid.find((row) => row.venueName === "Harbour House");
    const canal = ranked.snapshot.grid.find((row) => row.venueName === "Canal Loft");
    const ridge = ranked.snapshot.grid.find((row) => row.venueName === "Ridge Hall");
    expect(harbour?.gaps).toEqual(expect.arrayContaining(["breakout", "vegetarian", "budget"]));
    expect(canal?.gaps).toEqual(expect.arrayContaining(["breakout", "vegetarian"]));
    expect(canal?.gaps).not.toContain("budget");
    expect(ridge?.gaps).toEqual(expect.arrayContaining(["breakout", "vegetarian"]));
    expect(ridge?.gaps).not.toContain("budget");
    const view = shellViewModel({
      snapshot: ranked.snapshot,
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(view.rows.some((row) => row.gaps.includes("breakout"))).toBe(true);
  });

  it("reads the Stockholm full-day offsite from a model patch and stays on confirm until confirmed", async () => {
    const response = await handlePlannerTurn(turnRequest({ type: "composerSubmitted", text: stockholmOffsite }), {
      env: { XAI_API_KEY: presentKey },
      extractWithModel: async () => realisticModelPatch,
    });
    const turn = turnBodySchema.parse(await response.json());
    expect(turn.planner).toBe("model");
    expect(turn.snapshot.brief.eventTitle).toBe("Team offsite");
    assertStockholmOffsite(turn.snapshot.brief);
    expect(turn.snapshot.phase).toBe("confirm");
    expect(turn.snapshot.gaps).toEqual(["budgetBasis"]);
    expect(turn.snapshot.nextQuestion).toBe("Is that per person or total?");

    const client = createFixtureClient();
    const skipped = await runViewportAction({
      action: { type: "favoritesSubmitted", text: "skip" },
      snapshot: turn.snapshot,
      client,
      today,
    });
    expect(skipped.snapshot.phase).toBe("confirm");
    const tooSoon = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: turn.snapshot,
      client,
      today,
    });
    expect(tooSoon.snapshot.phase).toBe("confirm");
    const answered = await runViewportAction({
      action: { type: "gapAnswered", text: "total" },
      snapshot: turn.snapshot,
      client,
      today,
    });
    assertConfirming(answered.snapshot);
    assertStockholmOffsite(answered.snapshot.brief, "total");
    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: answered.snapshot,
      client,
      today,
    });
    expect(confirmed.snapshot.phase).toBe("favorites");
  });

  it("fills the full-day span from the scripted pass when the model omits the time", async () => {
    const withoutTime: PlannerBrief = { ...realisticModelPatch };
    delete withoutTime.startTime;
    delete withoutTime.endTime;
    delete withoutTime.timeAssumption;
    const response = await handlePlannerTurn(turnRequest({ type: "captureSubmitted", text: stockholmOffsite }), {
      env: { XAI_API_KEY: presentKey },
      extractWithModel: async () => withoutTime,
    });
    const turn = turnBodySchema.parse(await response.json());
    expect(turn.planner).toBe("model");
    expect(turn.snapshot.brief.eventTitle).toBe("Team offsite");
    assertStockholmOffsite(turn.snapshot.brief);
    expect(turn.snapshot.nextQuestion).toBe("Is that per person or total?");
    expect(turn.snapshot.brief.startTime).toBe("09:00");
    expect(turn.snapshot.brief.endTime).toBe("17:00");
  });

  it("keeps a brief with missing time on the brief step for every early transition", async () => {
    const client = createFixtureClient();
    const captured = await runViewportAction({
      action: { type: "captureSubmitted", text: stockholmOffsiteWithoutTime },
      snapshot: openingSnapshot(await client.listCompanies()),
      client,
      today,
    });
    expect(captured.snapshot.phase).toBe("confirm");
    expect(captured.snapshot.brief.city).toBe("Stockholm");
    expect(captured.snapshot.brief.startDate).toBe("2026-12-03");
    expect(captured.snapshot.brief.attendeeCount).toBe(25);
    expect(captured.snapshot.brief.startTime).toBeUndefined();
    expect(captured.snapshot.brief.breakoutRoomCount).toBe(1);
    expect(captured.snapshot.brief.foodRequest).toEqual({
      meal: "lunch",
      dietaryNeeds: ["vegetarian"],
    });
    expect(captured.snapshot.brief.budget).toEqual({
      amount: 300,
      currency: "EUR",
      approximate: true,
    });
    expect(captured.snapshot.gaps[0]).toBe("startTime");
    expect(captured.snapshot.nextQuestion).toBe(questionForGap("startTime"));
    expect(captured.snapshot.nextQuestion.split("?")).toHaveLength(2);

    for (const action of [
      { type: "briefConfirmed" } as const,
      { type: "favoritesSubmitted", text: "skip" } as const,
      { type: "composerSubmitted", text: "yes" } as const,
      { type: "showMore" } as const,
    ]) {
      const next = await runViewportAction({
        action,
        snapshot: captured.snapshot,
        client,
        today,
      });
      expect(next.snapshot.phase).toBe("confirm");
      expect(next.snapshot.gaps[0]).toBe("startTime");
      expect(next.snapshot.nextQuestion).toBe(questionForGap("startTime"));
    }

    const answered = await runViewportAction({
      action: { type: "gapAnswered", text: "a full day" },
      snapshot: captured.snapshot,
      client,
      today,
    });
    expect(answered.snapshot.nextQuestion).toBe("Is that per person or total?");
    assertStockholmOffsite(answered.snapshot.brief);
    const basis = await runViewportAction({
      action: { type: "gapAnswered", text: "total" },
      snapshot: answered.snapshot,
      client,
      today,
    });
    assertStockholmOffsite(basis.snapshot.brief, "total");
    assertConfirming(basis.snapshot);
    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: basis.snapshot,
      client,
      today,
    });
    expect(confirmed.snapshot.phase).toBe("favorites");
  });

  it("maps day parts, breakout counts, diets, and budget scope", () => {
    expect(extractBriefPatch("all day").timeAssumption).toEqual({
      dayPart: "all-day",
      statement: "Assumed 09:00\u201317:00 for all day",
    });
    expect(extractBriefPatch("a half-day workshop")).toMatchObject({
      startTime: "09:00",
      endTime: "12:00",
      timeAssumption: { dayPart: "half-day", statement: "Assumed 09:00\u201312:00 for a half day" },
    });
    expect(extractBriefPatch("morning session")).toMatchObject({
      startTime: "09:00",
      endTime: "12:00",
      timeAssumption: { dayPart: "morning", statement: "Assumed 09:00\u201312:00 for the morning" },
    });
    expect(extractBriefPatch("afternoon session")).toMatchObject({
      startTime: "13:00",
      endTime: "17:00",
      timeAssumption: { dayPart: "afternoon", statement: "Assumed 13:00\u201317:00 for the afternoon" },
    });
    const greeting = extractBriefPatch("Good morning, I need a place in Oslo for 10 people on 1 May 2026.");
    expect(greeting.timeAssumption).toBeUndefined();
    expect(greeting.startTime).toBeUndefined();
    expect(greeting.city).toBe("Oslo");
    expect(greeting.startDate).toBe("2026-05-01");

    const explicit = extractBriefPatch("a full day from 10:00 to 16:00");
    expect(explicit.startTime).toBe("10:00");
    expect(explicit.endTime).toBe("16:00");
    expect(explicit.timeAssumption).toBeUndefined();

    expect(extractBriefPatch("2 breakout rooms").breakoutRoomCount).toBe(2);
    expect(extractBriefPatch("vegan gluten-free dinner").foodRequest).toEqual({
      meal: "dinner",
      dietaryNeeds: ["vegan", "gluten-free"],
    });
    expect(extractBriefPatch("Budget EUR 500 total").budget).toEqual({
      amount: 500,
      currency: "EUR",
      scope: "total",
    });
    expect(extractBriefPatch("Budget about €20 per person").budget).toEqual({
      amount: 20,
      currency: "EUR",
      scope: "per-person",
      approximate: true,
    });

    const assumed = extractBriefPatch(stockholmOffsite);
    const kept = mergeBrief(assumed, { city: "Oslo" });
    expect(kept.city).toBe("Oslo");
    expect(kept.timeAssumption?.statement).toBe(fullDayStatement);
    const cleared = mergeBrief(assumed, { startTime: "10:00", endTime: "16:00" });
    expect(cleared.startTime).toBe("10:00");
    expect(cleared.endTime).toBe("16:00");
    expect(cleared.timeAssumption).toBeUndefined();
    expect(mergeBrief({}, { foodRequest: { dietaryNeeds: ["Vegetarian"] } }).foodRequest?.dietaryNeeds).toEqual([
      "vegetarian",
    ]);
    expect(mergeBrief({}, { budget: { amount: 300, currency: "eur", approximate: true } }).budget).toEqual({
      amount: 300,
      currency: "EUR",
      approximate: true,
    });
  });

  it("marks uncovered breakout, diet, and a total over budget as missing", () => {
    const brief = extractBriefPatch(stockholmOffsite);
    const plain = {
      venueName: "Plain Hall",
      currency: "EUR",
      foodAndBeverageMinor: minorUnits(5_000),
      spaceMinor: minorUnits(5_000),
      totalMinor: minorUnits(40_000),
    };
    const totalBrief = {
      ...brief,
      budget: { amount: 300, currency: "EUR" as const, approximate: true as const, scope: "total" as const },
    };
    expect(comparisonGaps(brief, plain, today)).toEqual(["breakout", "vegetarian"]);
    expect(comparisonGaps(totalBrief, plain, today)).toEqual(["breakout", "vegetarian", "budget"]);
    expect(
      comparisonGaps(
        totalBrief,
        {
          ...plain,
          totalMinor: minorUnits(30_000),
          breakoutRoomCount: 1,
          dietaryNeeds: ["Vegetarian"],
        },
        today,
      ),
    ).toEqual([]);
    expect(
      comparisonGaps(
        totalBrief,
        { ...plain, totalMinor: minorUnits(30_001), breakoutRoomCount: 1, dietaryNeeds: ["vegetarian"] },
        today,
      ),
    ).toEqual(["budget"]);
    expect(
      comparisonGaps(
        { ...brief, breakoutRoomCount: 2 },
        { ...plain, totalMinor: minorUnits(10_000), breakoutRoomCount: 1, dietaryNeeds: ["vegetarian"] },
        today,
      ),
    ).toContain("breakout");
  });

  it("does not compare a budget across currencies or flag a per-person total within it", () => {
    const brief = extractBriefPatch(stockholmOffsite);
    expect(
      comparisonGaps(
        brief,
        { venueName: "Ridge Hall", currency: "SEK", totalMinor: minorUnits(95_000) },
        today,
      ),
    ).not.toContain("budget");
    const perPerson = {
      ...brief,
      budget: { amount: 10, currency: "EUR", scope: "per-person" as const },
    };
    const offer = {
      venueName: "Plain Hall",
      currency: "EUR",
      totalMinor: minorUnits(20_000),
      breakoutRoomCount: 1,
      dietaryNeeds: ["vegetarian"],
      foodAndBeverageMinor: minorUnits(1_000),
    };
    expect(comparisonGaps(perPerson, offer, today)).not.toContain("budget");
    expect(comparisonGaps(perPerson, { ...offer, totalMinor: minorUnits(30_000) }, today)).toContain("budget");
    expect(
      comparisonGaps(
        { city: "Stockholm", budgetMinor: minorUnits(10_000) },
        { venueName: "Plain Hall", currency: "EUR", totalMinor: minorUnits(20_000) },
        today,
      ),
    ).toContain("budget");
  });

  it("does not enter comparing until the brief has a time span", () => {
    const offer = { venueName: "Harbour House", currency: "EUR", totalMinor: minorUnits(100) };
    const fileable = {
      contactEmail: "ada@northwind.example",
      startDate: "2026-12-03",
      endDate: "2026-12-03",
      attendeeCount: 25,
      language: "en",
      city: "Stockholm",
    };
    const withoutTime = projectBriefFlow({
      brief: fileable,
      filing: { path: "inbox", id: 1 },
      offers: [offer],
    });
    expect(withoutTime.stage).toBe("filed");
    expect(withoutTime.offers).toHaveLength(1);
    const withTime = projectBriefFlow({
      brief: { ...fileable, startTime: "09:00", endTime: "17:00" },
      filing: { path: "inbox", id: 1 },
      offers: [offer],
    });
    expect(withTime.stage).toBe("comparing");
  });
});

function assertStockholmOffsite(brief: PlannerBrief, scope?: "total" | "per-person") {
  expect(brief.city).toBe("Stockholm");
  expect(brief.startDate).toBe("2026-12-03");
  expect(brief.endDate).toBe("2026-12-03");
  expect(brief.attendeeCount).toBe(25);
  expect(brief.startTime).toBe("09:00");
  expect(brief.endTime).toBe("17:00");
  expect(brief.timeAssumption).toEqual({ dayPart: "full-day", statement: fullDayStatement });
  expect(brief.breakoutRoomCount).toBe(1);
  expect(brief.foodRequired).toBe(true);
  expect(brief.foodRequest).toEqual({ meal: "lunch", dietaryNeeds: ["vegetarian"] });
  expect(brief.budget).toEqual({
    amount: 300,
    currency: "EUR",
    approximate: true,
    ...(scope !== undefined ? { scope } : {}),
  });
}

function assertConfirming(snapshot: PlannerSnapshot) {
  expect(snapshot.phase).toBe("confirm");
  expect(snapshot.gaps).toEqual([]);
  expect(snapshot.nextQuestion).toBe("Does this brief look right?");
  expect(snapshot.offers).toEqual([]);
  expect(snapshot.grid).toEqual([]);
  expect(snapshot.filing).toBeNull();
  const view = shellViewModel({
    snapshot,
    busy: false,
    errorText: null,
    speechAvailable: false,
  });
  expect(view.phase).toBe("confirm");
  expect(view.ask).toBe("Does this brief look right?");
  expect(view.showConfirm).toBe(true);
  expect(view.showFavorites).toBe(false);
  expect(view.factsSentence).toBe(
    `Stockholm, 3 December 2026, 09:00\u201317:00, 25 people. ${fullDayStatement}. Budget EUR 300 total.`,
  );
  const sentence = view.confirmRuns
    .filter((run) => run.inSentence)
    .map((run) => run.text)
    .join("");
  expect(sentence).toBe(view.factsSentence);
  expect(view.confirmRuns.find((run) => run.kind === "fact" && run.name === "time")?.text).toBe("09:00\u201317:00");
  expect(view.confirmRuns.find((run) => run.kind === "fact" && run.name === "budget")?.text).toBe("EUR 300");
  expect(view.confirmRuns.find((run) => run.kind === "fact" && run.name === "budget-basis")?.text).toBe("total");
}

function stayingActions(): ViewportAction[] {
  return [
    { type: "showMore" },
    { type: "rowOpened", venueName: "Harbour House" },
    { type: "rowClosed" },
    { type: "favoritesSubmitted", text: "skip" },
    { type: "composerSubmitted", text: "not yet" },
    { type: "gapAnswered", text: "not yet" },
    { type: "composerSubmitted", text: "file" },
    { type: "composerSubmitted", text: "Teach me to write a sorting function in Python." },
    { type: "briefEdited", brief: { city: "Stockholm" } },
    {
      type: "moreEdited",
      details: {
        eventTitle: "",
        organisationName: "",
        contactEmail: "",
        language: "",
        roomCount: "",
        meetingRoomCount: "",
        foodRequired: "yes",
        notes: "",
        budget: "",
      },
    },
  ];
}

function turnRequest(action: ViewportAction): Request {
  return new Request("http://planner-bench.test/api/turn", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
}
