import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { canalLoftProposal } from "../src/contract/fixtures";
import {
  bestNonExpiredIndex,
  breakdownSumsToTotal,
  offerBreakdown,
  placesSentence,
  showCompareToggle,
} from "../src/contract/offer-group";
import { minorUnits } from "../src/domain/minor-units";
import { normaliseProposal } from "../src/domain/normalise-proposal";
import { openingSnapshot } from "../src/flow/chat-request";
import { emptySnapshot } from "../src/flow/planner-snapshot";
import { runViewportAction } from "../src/flow/viewport-turn";
import { readTurnSnapshot } from "../src/app/planner-session";
import { createFixtureClient } from "../src/proposales/fixture-client";
import { offerGroupFromPart, offerGroupFromMessage, toOfferDataPart } from "../src/transport/ai-sdk-offers";
import { offerGroupFromShell } from "../src/view-models/offer-part";
import { shellViewModel } from "../src/view-models/selectors";
import type { ShellRow, ShellViewModel } from "../src/view-models/view-model";

const today = "2026-10-06";
const timedBrief =
  "Title Northwind offsite. Organisation Northwind. Email ada@northwind.example. Start 2026-11-12. End 2026-11-12. Attendees 40. Language en. City Stockholm. Meeting rooms 2. Food yes. Notes One plenary and dinner. Start time 09:00. End time 17:00.";

const sentence =
  "Three places fit. Harbour House is the best match; Canal Loft\u2019s offer has expired and Ridge Hall has no food included.";

const countWords = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

describe("offer count", () => {
  it("reads the same count in the group header and the reply", () => {
    const rankedCount = 12;
    const snapshot = {
      ...emptySnapshot([{ id: 1, name: "Harbour House", inboxToken: null }], "", []),
      phase: "results" as const,
      stage: "comparing" as const,
      brief: { city: "Stockholm", startDate: "2026-11-12", attendeeCount: 40 },
      visibleRowCount: 5,
      grid: Array.from({ length: rankedCount }, (_, index) => ({
        venueName: `Hall ${index + 1}`,
        proposalUuid: `hall-${index + 1}`,
        currency: "EUR",
        roomsMinor: minorUnits((index + 1) * 1_000),
        foodAndBeverageMinor: minorUnits(0),
        spaceMinor: minorUnits(0),
        extrasMinor: minorUnits(0),
        totalMinor: minorUnits((index + 1) * 1_000),
        gaps: [],
        favorite: false,
        blocks: [],
      })),
    };
    const view = shellViewModel({
      snapshot,
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    const group = offerGroupFromShell(view);
    expect(group).not.toBeNull();
    if (group === null) {
      return;
    }
    const headerCount = countReadFromHeader(group.summary.line);
    const sentenceCount = countReadFromSentence(view.ask);
    expect(headerCount).toBe(sentenceCount);
    expect(group.summary.count).toBe(headerCount);
    expect(headerCount).toBe(view.rows.length);
    expect(group.offers).toHaveLength(headerCount);
    expect(snapshot.grid.length).toBeGreaterThan(headerCount);
  });
});

describe("best match from the ranked rows", () => {
  it("marks Harbour House and leaves the expired Canal Loft unmarked", async () => {
    const view = await stockholmResults();
    expect(view.ask).toBe(sentence);
    expect(view.rows.map((row) => row.venueName)).toEqual(["Harbour House", "Canal Loft", "Ridge Hall"]);
    const group = offerGroupFromShell(view);
    expect(group).not.toBeNull();
    expect(group?.offers.find((offer) => offer.venueName === "Harbour House")?.bestMatch).toBe(true);
    expect(group?.offers.find((offer) => offer.venueName === "Canal Loft")?.bestMatch).toBe(false);
    expect(group?.offers.find((offer) => offer.venueName === "Canal Loft")?.gaps).toContain("expired");
    expect(group?.offers.filter((offer) => offer.bestMatch).map((offer) => offer.venueName)).toEqual(["Harbour House"]);
  });

  it("moves the badge off an expired offer that ranks first", () => {
    const rows = [
      shellRow({
        venueName: "Canal Loft",
        proposalUuid: "canal",
        gaps: ["expired"],
        totalMinor: 21000,
        extrasMinor: 12000,
      }),
      shellRow({
        venueName: "Harbour House",
        proposalUuid: "harbour",
        gaps: [],
        totalMinor: 36500,
      }),
    ];
    expect(bestNonExpiredIndex(rows)).toBe(1);
    const group = offerGroupFromShell(resultsModel(rows));
    expect(group?.offers.map((offer) => offer.bestMatch)).toEqual([false, true]);
    expect(placesSentence(rows)).toBe(
      "Two places fit. Harbour House is the best match; Canal Loft\u2019s offer has expired.",
    );
  });

  it("omits the badge when every offer is expired", () => {
    const rows = [shellRow({ venueName: "Canal Loft", gaps: ["expired"] })];
    expect(bestNonExpiredIndex(rows)).toBe(-1);
    expect(offerGroupFromShell(resultsModel(rows))?.offers[0]?.bestMatch).toBe(false);
  });
});

describe("offer breakdown", () => {
  it("sums Canal Loft's real buckets, including extras, to the total", () => {
    const offer = normaliseProposal(canalLoftProposal);
    const rooms = offer.roomsMinor?.amount ?? 0;
    const food = offer.foodAndBeverageMinor?.amount ?? 0;
    const space = offer.spaceMinor?.amount ?? 0;
    const extras = offer.extrasMinor?.amount ?? 0;
    const total = offer.totalMinor?.amount ?? 0;
    const lines = offerBreakdown(
      {
        rooms,
        foodAndBeverage: food,
        space,
        extras,
        total,
        currency: offer.currency ?? "EUR",
        gaps: ["expired"],
      },
      true,
    );
    expect(lines.map((line) => [line.label, line.text, line.amountMinor])).toEqual([
      ["Rooms", "\u2014", 0],
      ["Food", "EUR 60", 6000],
      ["Space", "EUR 30", 3000],
      ["Extras", "EUR 120", 12000],
    ]);
    expect(lines.some((line) => line.label === "Other")).toBe(false);
    expect(breakdownSumsToTotal(lines, total)).toBe(true);
  });

  it("labels a leftover amount as Other so the lines still sum to the total", () => {
    const lines = offerBreakdown(
      {
        rooms: 0,
        foodAndBeverage: 6000,
        space: 3000,
        extras: 12000,
        total: 21000,
        currency: "EUR",
        gaps: [],
      },
      false,
    );
    expect(lines.find((line) => line.key === "other")).toMatchObject({
      label: "Other",
      amountMinor: 12000,
      text: "EUR 120",
    });
    expect(breakdownSumsToTotal(lines, 21000)).toBe(true);
  });
});

describe("compare toggle", () => {
  it("shows only for two or three offers at 640px or wider", () => {
    const widths = [390, 639, 640, 1280];
    const counts = [1, 2, 3, 5];
    const shown: string[] = [];
    for (const count of counts) {
      for (const width of widths) {
        if (showCompareToggle(count, width)) {
          shown.push(`${count}@${width}`);
        }
      }
    }
    expect(shown).toEqual(["2@640", "2@1280", "3@640", "3@1280"]);
  });
});

describe("offer part adapter", () => {
  it("round-trips the group and ignores other parts", async () => {
    const group = offerGroupFromShell(await stockholmResults());
    expect(group).not.toBeNull();
    if (group === null) {
      return;
    }
    const part = toOfferDataPart(group);
    expect(part.type).toBe("data-offer-group");
    expect(offerGroupFromPart(part)).toEqual(group);
    expect(offerGroupFromMessage({ parts: [{ type: "text" }, part] })).toEqual(group);
    expect(offerGroupFromPart({ type: "data-snapshot", data: group })).toBeNull();
  });

  it("keeps the card components free of the transport", () => {
    const root = path.resolve(import.meta.dirname, "../src/views");
    for (const fileName of ["offer-group.tsx", "offer-detail.tsx"]) {
      const source = readFileSync(path.join(root, fileName), "utf8");
      expect(source.includes('from "ai"') || source.includes("from 'ai'")).toBe(false);
      expect(source.includes("@ai-sdk")).toBe(false);
      expect(source.includes("ai-sdk-offers")).toBe(false);
      expect(source.includes("useChat")).toBe(false);
    }
  });
});

describe("turn payload", () => {
  it("reads snapshot and ignores planner", async () => {
    const view = await stockholmResults();
    const client = createFixtureClient();
    const opened = openingSnapshot(await client.listCompanies());
    const captured = await runViewportAction({
      action: { type: "captureSubmitted", text: timedBrief },
      snapshot: opened,
      client,
      today,
    });
    const payload = { snapshot: captured.snapshot, planner: "scripted" };
    expect(readTurnSnapshot(payload)).toEqual(captured.snapshot);
    expect(readTurnSnapshot({ planner: "model", snapshot: { phase: "nope" } })).toBeNull();
    expect(view.rows[0]?.venueName).toBe("Harbour House");
  });
});

async function stockholmResults(): Promise<ShellViewModel> {
  const client = createFixtureClient();
  const opened = openingSnapshot(await client.listCompanies());
  const captured = await runViewportAction({
    action: { type: "captureSubmitted", text: timedBrief },
    snapshot: opened,
    client,
    today,
  });
  const confirmed = await runViewportAction({
    action: { type: "briefConfirmed" },
    snapshot: captured.snapshot,
    client,
    today,
  });
  const ranked = await runViewportAction({
    action: { type: "favoritesSubmitted", text: "skip" },
    snapshot: confirmed.snapshot,
    client,
    today,
  });
  return shellViewModel({
    snapshot: ranked.snapshot,
    busy: false,
    errorText: null,
    speechAvailable: false,
  });
}

function countReadFromHeader(line: string): number {
  const match = /^(\d+)\s+offers?\b/.exec(line);
  return match?.[1] === undefined ? -1 : Number(match[1]);
}

function countReadFromSentence(sentence: string): number {
  const lead = sentence.split(" ")[0] ?? "";
  const fromWord = countWords.indexOf(lead);
  if (fromWord >= 0) {
    return fromWord;
  }
  return /^\d+$/.test(lead) ? Number(lead) : -1;
}

function resultsModel(rows: ShellRow[]): ShellViewModel {
  return {
    phase: "results",
    busy: false,
    ready: true,
    errorText: null,
    speechAvailable: false,
    ask: placesSentence(rows),
    askMark: null,
    askLabelsComposer: true,
    notice: null,
    draftConfirmation: null,
    filingMessage: null,
    filed: false,
    offerLabel: null,
    factsSentence: "",
    confirmRuns: [],
    showFacts: false,
    showConfirm: false,
    showFavorites: false,
    rows,
    hiddenCount: 0,
    openRow: null,
    more: {
      eventTitle: "",
      organisationName: "",
      contactEmail: "",
      language: "",
      roomCount: "",
      meetingRoomCount: "",
      foodRequired: "",
      notes: "",
      budget: "",
    },
    moreStamp: "base",
    budgetCurrency: "EUR",
    composerPlaceholder: "Describe the event: place, people, date, time",
    offerSummary: `${rows.length} offers · Stockholm · Thu 12 Nov · 40 guests`,
    contextChips: [],
    inputMode: "text",
    inputType: "text",
    autoComplete: undefined,
  };
}

function shellRow(overrides: Partial<ShellRow> & Pick<ShellRow, "venueName">): ShellRow {
  return {
    proposalUuid: overrides.venueName,
    heldByCompanyName: null,
    currency: "EUR",
    roomsMinor: 0,
    foodMinor: 0,
    spaceMinor: 0,
    extrasMinor: 0,
    totalMinor: 0,
    rooms: "0.00 EUR",
    foodAndBeverage: "0.00 EUR",
    space: "0.00 EUR",
    extras: "0.00 EUR",
    total: "0.00 EUR",
    expires: "2026-12-01",
    gaps: [],
    neutral: [],
    favorite: false,
    blocks: [],
    ...overrides,
  };
}
