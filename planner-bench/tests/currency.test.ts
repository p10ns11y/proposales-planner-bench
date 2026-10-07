import { describe, expect, it } from "vitest";
import { compareOffers, comparisonGaps } from "../src/domain/compare-offers";
import { minorUnits } from "../src/domain/minor-units";
import {
  briefCurrency,
  budgetFieldLabel,
  currencyForCity,
  fallbackCurrency,
  mergeBrief,
  offerNotCompared,
} from "../src/domain/planner-brief";
import { extractBriefPatch } from "../src/flow/fixture-extractor";
import { emptySnapshot } from "../src/flow/planner-snapshot";
import { shellViewModel } from "../src/view-models/selectors";

const today = "2026-10-07";
const stockholm =
  "Team offsite in Stockholm for 25 people on 3 Dec 2026, a full day with breakout space and vegetarian lunch.";

describe("display currency", () => {
  it("uses SEK for Stockholm when the brief names no currency", () => {
    const brief = extractBriefPatch(stockholm);
    expect(brief.city).toBe("Stockholm");
    expect(brief.budget).toBeUndefined();
    expect(briefCurrency(brief)).toBe("SEK");
    expect(budgetFieldLabel(briefCurrency(brief))).toBe("Budget (SEK)");
  });

  it("keeps EUR when Stockholm names EUR 300", () => {
    const brief = extractBriefPatch(`${stockholm} EUR 300`);
    expect(brief.city).toBe("Stockholm");
    expect(brief.budget).toMatchObject({ amount: 300, currency: "EUR" });
    expect(briefCurrency(brief)).toBe("EUR");
    expect(budgetFieldLabel(briefCurrency(brief))).toBe("Budget (EUR)");
  });

  it("keeps a named currency when the city changes", () => {
    const moved = mergeBrief(extractBriefPatch(`${stockholm} EUR 300`), { city: "Oslo" });
    expect(moved.city).toBe("Oslo");
    expect(briefCurrency(moved)).toBe("EUR");
    const bare = mergeBrief(extractBriefPatch("Dinner in Oslo for 20 people. SEK"), { city: "Copenhagen" });
    expect(bare.statedCurrency).toBe("SEK");
    expect(briefCurrency(bare)).toBe("SEK");
  });

  it("follows the city when no currency was named", () => {
    const moved = mergeBrief(extractBriefPatch(stockholm), { city: "Oslo" });
    expect(briefCurrency(moved)).toBe("NOK");
    expect(briefCurrency(mergeBrief(moved, { city: "Copenhagen" }))).toBe("DKK");
    expect(briefCurrency({ city: "Helsinki" })).toBe("EUR");
    expect(briefCurrency({ city: "Göteborg" })).toBe("SEK");
    expect(briefCurrency({ city: "Malmö" })).toBe("SEK");
    expect(currencyForCity("London")).toBe("GBP");
    const blank = emptySnapshot([], "", []);
    const stockholmLabel = shellViewModel({
      snapshot: { ...blank, brief: { city: "Stockholm" } },
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    const osloLabel = shellViewModel({
      snapshot: { ...blank, brief: { city: "Oslo" } },
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    const statedLabel = shellViewModel({
      snapshot: { ...blank, brief: { city: "Oslo", budget: { amount: 300, currency: "EUR" } } },
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(stockholmLabel.budgetCurrency).toBe("SEK");
    expect(budgetFieldLabel(stockholmLabel.budgetCurrency)).toBe("Budget (SEK)");
    expect(osloLabel.budgetCurrency).toBe("NOK");
    expect(statedLabel.budgetCurrency).toBe("EUR");
  });

  it("falls back to EUR for an unknown city", () => {
    const brief = extractBriefPatch("Team offsite in Atlantis for 25 people on 3 Dec 2026.");
    expect(brief.city).toBe("Atlantis");
    expect(briefCurrency(brief)).toBe(fallbackCurrency);
    expect(currencyForCity("Atlantis")).toBe("EUR");
    expect(briefCurrency({})).toBe("EUR");
  });

  it("reads 40 000 kr as SEK even when the city is Oslo", () => {
    const brief = extractBriefPatch("Dinner in Oslo for 20 people. 40 000 kr");
    expect(brief.city).toBe("Oslo");
    expect(brief.budget).toMatchObject({ amount: 40000, currency: "SEK" });
    expect(briefCurrency(brief)).toBe("SEK");
  });
});

describe("mismatched offer currency", () => {
  it("does not compare an offer in another currency", () => {
    const brief = extractBriefPatch(`${stockholm} Budget 300 SEK total`);
    const euro = {
      venueName: "Harbour House",
      currency: "EUR",
      totalMinor: minorUnits(45_625),
    };
    const krona = {
      venueName: "Ridge Hall",
      currency: "SEK",
      totalMinor: minorUnits(40_000),
    };
    expect(briefCurrency(brief)).toBe("SEK");
    expect(offerNotCompared(brief, euro.currency)).toBe(true);
    expect(offerNotCompared(brief, krona.currency)).toBe(false);
    expect(comparisonGaps(brief, euro, today)).not.toContain("budget");
    expect(comparisonGaps(brief, { ...krona, totalMinor: minorUnits(30_001) }, today)).toContain("budget");
    const rows = compareOffers(brief, [euro, krona], today);
    const foreign = rows.find((row) => row.venueName === "Harbour House");
    const local = rows.find((row) => row.venueName === "Ridge Hall");
    expect(foreign?.currency).toBe("EUR");
    expect(foreign?.totalMinor).toEqual(minorUnits(45_625));
    expect(foreign?.neutral).toContain("not-compared");
    expect(foreign?.gaps).not.toContain("budget");
    expect(local?.currency).toBe("SEK");
    expect(local?.neutral ?? []).not.toContain("not-compared");
    expect(offerNotCompared({ city: "Stockholm" }, "EUR")).toBe(false);
    expect(offerNotCompared(brief, "")).toBe(false);
    expect(offerNotCompared(brief, undefined)).toBe(false);
  });
});
