import { describe, expect, it } from "vitest";
import {
  briefGapsForStage,
  compareOffers,
  comparisonGaps,
  offersForBrief,
  offersMatchingCity,
  rankComparisonRows,
  unstatedOfferMarks,
} from "../src/domain/compare-offers";
import type { ComparisonRow } from "../src/domain/comparison-row";
import { minorUnits } from "../src/domain/minor-units";
import type { PlannerBrief } from "../src/domain/planner-brief";
import type { VenueOffer } from "../src/domain/venue-offer";

const today = "2026-10-07";

function row(partial: Partial<ComparisonRow> & Pick<ComparisonRow, "venueName">): ComparisonRow {
  return {
    currency: "",
    roomsMinor: minorUnits(0),
    foodAndBeverageMinor: minorUnits(0),
    spaceMinor: minorUnits(0),
    extrasMinor: minorUnits(0),
    totalMinor: minorUnits(0),
    gaps: [],
    favorite: false,
    blocks: [],
    ...partial,
  };
}

function offer(partial: VenueOffer): VenueOffer {
  return partial;
}

function ordersOf<T>(items: T[]): T[][] {
  if (items.length === 0) {
    return [[]];
  }
  const head = items[0];
  return [items, [...items].reverse(), [...items.slice(1), head]];
}

function expectRank(rows: ComparisonRow[], names: string[], reference?: string) {
  for (const order of ordersOf(rows)) {
    expect(rankComparisonRows(order, reference).map((item) => item.venueName)).toEqual(names);
  }
}

describe("offer ranking", () => {
  it("orders by lead currency, then currency, then fewer gaps, then lower price", () => {
    expect(rankComparisonRows([])).toEqual([]);
    expectRank(
      [
        row({ venueName: "Blank", currency: "  ", totalMinor: minorUnits(1) }),
        row({ venueName: "Dear Euro", currency: " eur ", totalMinor: minorUnits(80), gaps: ["space"] }),
        row({ venueName: "Cheap Euro", currency: "EUR", totalMinor: minorUnits(20), gaps: ["space"] }),
        row({ venueName: "Fit Euro", currency: "EUR", totalMinor: minorUnits(90) }),
        row({ venueName: "Krona", currency: "SEK", totalMinor: minorUnits(5) }),
        row({ venueName: "Dollar", currency: "USD", totalMinor: minorUnits(1) }),
      ],
      ["Fit Euro", "Cheap Euro", "Dear Euro", "Blank", "Krona", "Dollar"],
      "eur",
    );
  });

  it("leads with the stated currency even when another currency is cheaper", () => {
    expectRank(
      [
        row({ venueName: "Euro", currency: "EUR", totalMinor: minorUnits(10) }),
        row({ venueName: "Krona", currency: "SEK", totalMinor: minorUnits(1) }),
      ],
      ["Krona", "Euro"],
      "SEK",
    );
  });

  it("picks the lead from the fewest gaps, then currency, then price", () => {
    expectRank(
      [
        row({ venueName: "Euro Gap", currency: "EUR", totalMinor: minorUnits(10), gaps: ["space"] }),
        row({ venueName: "Krona Fit", currency: "SEK", totalMinor: minorUnits(90) }),
      ],
      ["Krona Fit", "Euro Gap"],
    );
    expectRank(
      [
        row({ venueName: "Krona", currency: "SEK", totalMinor: minorUnits(10) }),
        row({ venueName: "Euro", currency: "EUR", totalMinor: minorUnits(99) }),
      ],
      ["Euro", "Krona"],
    );
    expectRank(
      [
        row({ venueName: "Dear", currency: "EUR", totalMinor: minorUnits(50) }),
        row({ venueName: "Cheap", currency: "EUR", totalMinor: minorUnits(20) }),
      ],
      ["Cheap", "Dear"],
    );
    expectRank(
      [
        row({ venueName: "Same Dear", currency: "EUR", totalMinor: minorUnits(40), gaps: ["space"] }),
        row({ venueName: "Same Cheap", currency: "EUR", totalMinor: minorUnits(10), gaps: ["space"] }),
      ],
      ["Same Cheap", "Same Dear"],
    );
    expect(rankComparisonRows([row({ venueName: "Only", currency: "sek" })], "   ")[0]?.currency).toBe("sek");
    expectRank(
      [
        row({ venueName: "Letters", currency: "ss", totalMinor: minorUnits(5) }),
        row({ venueName: "Sharp", currency: "ß", totalMinor: minorUnits(50) }),
        row({ venueName: "Euro", currency: "EUR", totalMinor: minorUnits(1) }),
      ],
      ["Letters", "Sharp", "Euro"],
      "ss",
    );
  });
});

describe("comparison gaps and marks", () => {
  const brief: PlannerBrief = {
    city: "Stockholm",
    startDate: "2026-12-03",
    endDate: "2026-12-05",
    startTime: "09:00",
    endTime: "17:00",
    attendeeCount: 25,
    roomCount: 2,
    meetingRoomCount: 1,
    breakoutRoomCount: 2,
    foodRequired: true,
    foodRequest: { dietaryNeeds: ["Vegetarian"] },
    budget: { amount: 300, currency: "EUR", scope: "total" },
  };

  it("marks missing parts, expiry, breakout, diet, and a same-currency total", () => {
    expect(comparisonGaps(brief, offer({ venueName: "Plain", currency: "EUR" }), today)).toEqual([
      "totalMinor",
      "rooms",
      "foodAndBeverage",
      "space",
      "breakout",
      "Vegetarian",
    ]);
    expect(
      comparisonGaps(
        brief,
        offer({
          venueName: "Full",
          currency: "eur",
          roomsMinor: minorUnits(1),
          foodAndBeverageMinor: minorUnits(1),
          spaceMinor: minorUnits(1),
          totalMinor: minorUnits(30_000),
          expiresAt: "2026-10-07",
          breakoutRoomCount: 2,
          dietaryNeeds: [" vegetarian "],
        }),
        today,
      ),
    ).toEqual([]);
    expect(
      comparisonGaps(
        brief,
        offer({
          venueName: "Over",
          currency: "EUR",
          roomsMinor: minorUnits(1),
          foodAndBeverageMinor: minorUnits(1),
          spaceMinor: minorUnits(1),
          totalMinor: minorUnits(30_001),
          expiresAt: "2026-10-06",
          breakoutRoomCount: 1,
          dietaryNeeds: ["vegan"],
        }),
        today,
      ),
    ).toEqual(["expired", "breakout", "Vegetarian", "budget"]);
    expect(comparisonGaps({ ...brief, budget: { amount: 10, currency: "EUR", scope: "per-person" } }, offer({ venueName: "Fit", currency: "EUR", totalMinor: minorUnits(25_000) }), today)).not.toContain("budget");
    expect(comparisonGaps({ ...brief, budget: { amount: 10, currency: "EUR", scope: "per-person" } }, offer({ venueName: "Over", currency: "EUR", totalMinor: minorUnits(25_001) }), today)).toContain("budget");
    expect(comparisonGaps(brief, offer({ venueName: "Krona", currency: "SEK", totalMinor: minorUnits(9_000_000) }), today)).not.toContain("budget");
    expect(comparisonGaps(brief, offer({ venueName: "Bare", totalMinor: minorUnits(99_000) }), today)).not.toContain("budget");
    expect(comparisonGaps({ city: "Stockholm" }, offer({ venueName: "Minor", currency: "EUR", totalMinor: minorUnits(100) }), today)).not.toContain("budget");
    expect(
      comparisonGaps(
        { city: "Stockholm", budgetMinor: minorUnits(100) },
        offer({ venueName: "Minor", currency: "EUR", totalMinor: minorUnits(101) }),
        today,
      ),
    ).toContain("budget");
    expect(comparisonGaps({ ...brief, budget: undefined, attendeeCount: 0, budgetMinor: undefined }, offer({ venueName: "None", currency: "EUR", totalMinor: minorUnits(1) }), today)).not.toContain("budget");
    expect(
      comparisonGaps(
        brief,
        offer({
          venueName: "Dated",
          currency: "EUR",
          totalMinor: minorUnits(1),
          roomsMinor: minorUnits(1),
          foodAndBeverageMinor: minorUnits(1),
          spaceMinor: minorUnits(1),
          breakoutRoomCount: 2,
          dietaryNeeds: ["vegetarian"],
          expiresAt: "2026-10-07T15:00:00",
        }),
        "2026-10-07T00:00:00",
      ),
    ).toContain("expired");
    expect(
      comparisonGaps(
        { foodRequest: { dietaryNeeds: [" Vegetarian ", "Stryker was here"] } },
        offer({ venueName: "Diets", currency: "EUR", totalMinor: minorUnits(1), dietaryNeeds: ["vegetarian"] }),
        today,
      ),
    ).toEqual(["Stryker was here"]);
    expect(
      comparisonGaps(
        { foodRequest: { dietaryNeeds: ["Stryker was here"] } },
        offer({ venueName: "Open", currency: "EUR", totalMinor: minorUnits(1) }),
        today,
      ),
    ).toContain("Stryker was here");
    expect(
      comparisonGaps(
        {},
        offer({ venueName: "Neg", currency: "EUR", totalMinor: minorUnits(1), breakoutRoomCount: -1 }),
        today,
      ),
    ).not.toContain("breakout");
  });

  it("treats an unscoped or empty-headcount budget as no ceiling", () => {
    const open = { ...brief, budget: { amount: 10, currency: "EUR" } };
    expect(comparisonGaps(open, offer({ venueName: "Open", currency: "EUR", totalMinor: minorUnits(999_999) }), today)).not.toContain("budget");
    const headless = {
      ...brief,
      attendeeCount: undefined,
      budget: { amount: 10, currency: "EUR", scope: "per-person" as const },
    };
    expect(comparisonGaps(headless, offer({ venueName: "Headless", currency: "EUR", totalMinor: minorUnits(1) }), today)).not.toContain("budget");
    expect(comparisonGaps({ ...brief, foodRequired: false, meetingRoomCount: 0, breakoutRoomCount: undefined, foodRequest: undefined }, offer({ venueName: "Quiet", currency: "EUR", roomsMinor: minorUnits(1), totalMinor: minorUnits(1) }), today)).toEqual([]);
    expect(
      comparisonGaps(
        { budget: { amount: 10, currency: "   ", scope: "total" } },
        offer({ venueName: "Blank", currency: "   ", totalMinor: minorUnits(999_999) }),
        today,
      ),
    ).not.toContain("budget");
    expect(
      comparisonGaps(
        { budget: { amount: 10, currency: " eur ", scope: "total" } },
        offer({ venueName: "Spaced", currency: "EUR", totalMinor: minorUnits(1_001) }),
        today,
      ),
    ).toContain("budget");
    expect(
      comparisonGaps(
        { attendeeCount: 0, budget: { amount: 10, currency: "EUR", scope: "per-person" } },
        offer({ venueName: "Zero", currency: "EUR", totalMinor: minorUnits(1) }),
        today,
      ),
    ).not.toContain("budget");
    expect(
      comparisonGaps(
        { attendeeCount: 2, budget: { amount: 10, currency: "EUR", scope: "per-person" } },
        offer({ venueName: "Exact", currency: "EUR", totalMinor: minorUnits(2_000) }),
        today,
      ),
    ).not.toContain("budget");
    expect(
      comparisonGaps(
        { budgetMinor: minorUnits(100) },
        offer({ venueName: "Under", currency: "EUR", totalMinor: minorUnits(100) }),
        today,
      ),
    ).not.toContain("budget");
  });

  it("marks unstated breakout and diet only", () => {
    expect(unstatedOfferMarks({})).toEqual(["breakout", "diet"]);
    expect(unstatedOfferMarks({ breakoutRoomCount: 1, foodRequest: { dietaryNeeds: ["vegan"] } })).toEqual([]);
  });

  it("names a holding company only when it differs from the venue", () => {
    const companies = [
      { id: 1, name: "Harbour House" },
      { id: 2, name: "Northwind" },
    ];
    const ranked = compareOffers(
      { city: "Stockholm", attendeeCount: 10 },
      [
        offer({ venueName: "Harbour House", currency: "EUR", totalMinor: minorUnits(1), companyId: 1 }),
        offer({ venueName: "Annex", currency: "EUR", totalMinor: minorUnits(1), companyId: 2 }),
        offer({ venueName: "Solo", currency: "EUR", totalMinor: minorUnits(1), companyId: 9 }),
        offer({ venueName: "Plain", currency: "EUR", totalMinor: minorUnits(1) }),
      ],
      today,
      { companies, favoriteVenueNames: ["annex", "other"] },
    );
    expect(ranked.map((item) => item.heldByCompanyName)).toEqual([undefined, "Northwind", undefined, undefined]);
    expect(ranked.find((item) => item.venueName === "Annex")?.favorite).toBe(true);
    expect(ranked.find((item) => item.venueName === "Harbour House")?.favorite).toBe(false);
    expect(compareOffers({ city: "Stockholm" }, [offer({ venueName: "Annex", companyId: 2 })], today, { companies: [{ id: 2, name: "Northwind" }] })[0]?.heldByCompanyName).toBeUndefined();
    expect(compareOffers({}, [offer({ venueName: "Stryker was here" })], today)[0]?.favorite).toBe(false);
    expect(compareOffers({}, [offer({})], today)[0]).toEqual({
      venueName: "",
      currency: "",
      roomsMinor: minorUnits(0),
      foodAndBeverageMinor: minorUnits(0),
      spaceMinor: minorUnits(0),
      extrasMinor: minorUnits(0),
      totalMinor: minorUnits(0),
      gaps: ["venueName", "currency", "totalMinor"],
      neutral: ["breakout", "diet"],
      favorite: false,
      blocks: [],
    });
    expect(
      compareOffers({}, [offer({ blocks: [{ title: "Room", quantity: 1 }] })], today)[0]?.blocks,
    ).toEqual([{ title: "Room", quantity: 1 }]);
  });

  it("keeps offers in the same city that can hold the headcount", () => {
    const offers = [
      offer({ venueName: "A", city: "Malmö", minCapacity: 10, capacity: 30 }),
      offer({ venueName: "B", city: "malmo", capacity: 9 }),
      offer({ venueName: "C", city: "Gothenburg" }),
      offer({ venueName: "D" }),
      offer({ venueName: "E", city: "Stockholm", minCapacity: 40 }),
    ];
    expect(offersForBrief({ city: "Malmo", attendeeCount: 12 }, offers).map((item) => item.venueName)).toEqual(["A", "D"]);
    expect(offersForBrief({ attendeeCount: 12 }, offers).map((item) => item.venueName)).toEqual(["A", "C", "D"]);
    expect(offersForBrief({ city: "Uppsala" }, offers).map((item) => item.venueName)).toEqual(["D"]);
    expect(offersMatchingCity({ city: " Malmo " }, offers).map((item) => item.venueName)).toEqual(["A", "B", "D"]);
    expect(
      offersMatchingCity({ city: "ß" }, [offer({ venueName: "Sharp", city: "SS" }), offer({ venueName: "Other", city: "Malmo" })]).map(
        (item) => item.venueName,
      ),
    ).toEqual([]);
    expect(offersForBrief({ attendeeCount: 10 }, [offer({ venueName: "Min", minCapacity: 10 })]).map((item) => item.venueName)).toEqual(["Min"]);
    expect(offersForBrief({ attendeeCount: 10 }, [offer({ venueName: "Max", capacity: 10 })]).map((item) => item.venueName)).toEqual(["Max"]);
    expect(offersForBrief({}, offers).map((item) => item.venueName)).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("uses the fileable gaps while collecting and the comparable gaps later", () => {
    const partial = { city: "Stockholm" };
    expect(briefGapsForStage(partial, "collecting")).toEqual(briefGapsForStage(partial, "fileable"));
    expect(briefGapsForStage(partial, "filed")).toEqual(briefGapsForStage(partial, "comparing"));
    expect(briefGapsForStage(partial, "collecting")).toContain("contactEmail");
    expect(briefGapsForStage(partial, "collecting")).not.toContain("startTime");
    expect(briefGapsForStage(partial, "filed")).toContain("startTime");
    expect(briefGapsForStage(partial, "filed")).not.toContain("contactEmail");
    expect(briefGapsForStage(partial, "fileable")).toContain("language");
    expect(briefGapsForStage(partial, "comparing")).toContain("endTime");
  });
});
