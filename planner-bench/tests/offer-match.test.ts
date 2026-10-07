import { describe, expect, it } from "vitest";
import { offersForBrief, rankComparisonRows } from "../src/domain/compare-offers";
import type { ComparisonRow } from "../src/domain/comparison-row";
import { minorUnits } from "../src/domain/minor-units";
import { normaliseProposal } from "../src/domain/normalise-proposal";
import type { VenueOffer } from "../src/domain/venue-offer";

describe("offer city and capacity", () => {
  it("reads city, capacity, and day part from proposal data", () => {
    const offer = normaliseProposal(
      proposal("Harbour House", {
        city: " Stockholm ",
        capacity: 80,
        day_part: "full day",
      }),
    );
    expect(offer.city).toBe("Stockholm");
    expect(offer.capacity).toBe(80);
    expect(offer.dayPart).toBe("full-day");
    const seeded = normaliseProposal(
      proposal("Seeded Hall", { city: "Gothenburg", capacity: "30", day_part: "full_day" }),
    );
    expect(seeded.city).toBe("Gothenburg");
    expect(seeded.capacity).toBe(30);
    expect(seeded.dayPart).toBe("full-day");
    const bare = normaliseProposal(proposal("Bare Hall"));
    expect(bare.city).toBeUndefined();
    expect(bare.capacity).toBeUndefined();
    expect(bare.dayPart).toBeUndefined();
  });

  it("filters offers by city when both sides know it", () => {
    const offers = [
      offer("Stockholm House", { city: "Stockholm" }),
      offer("Gothenburg Hall", { city: "Gothenburg" }),
      offer("Unset Place"),
    ];
    expect(names(offersForBrief({ city: "Gothenburg" }, offers))).toEqual([
      "Gothenburg Hall",
      "Unset Place",
    ]);
    expect(names(offersForBrief({ city: "stockholm" }, offers))).toEqual([
      "Stockholm House",
      "Unset Place",
    ]);
  });

  it("excludes a known capacity below the attendee count for 20 and for 40", () => {
    const offers = [
      offer("Room for 30", { city: "Stockholm", capacity: 30 }),
      offer("Room for 40", { city: "Stockholm", capacity: 40 }),
      offer("Room for 80", { city: "Stockholm", capacity: 80 }),
    ];
    expect(names(offersForBrief({ city: "Stockholm", attendeeCount: 20 }, offers))).toEqual([
      "Room for 30",
      "Room for 40",
      "Room for 80",
    ]);
    expect(names(offersForBrief({ city: "Stockholm", attendeeCount: 40 }, offers))).toEqual([
      "Room for 40",
      "Room for 80",
    ]);
  });

  it("includes an offer when the city or the capacity is unknown", () => {
    const offers = [
      offer("Known Stockholm", { city: "Stockholm", capacity: 25 }),
      offer("City only", { city: "Gothenburg" }),
      offer("Capacity only", { capacity: 100 }),
      offer("Neither"),
    ];
    expect(names(offersForBrief({ attendeeCount: 40 }, offers))).toEqual([
      "City only",
      "Capacity only",
      "Neither",
    ]);
    expect(names(offersForBrief({ city: "Gothenburg", attendeeCount: 40 }, offers))).toEqual([
      "City only",
      "Capacity only",
      "Neither",
    ]);
    expect(names(offersForBrief({}, offers))).toEqual([
      "Known Stockholm",
      "City only",
      "Capacity only",
      "Neither",
    ]);
  });
});

describe("mixed currency ranking", () => {
  it("ranks inside the brief currency and leaves other currencies after it", () => {
    const ranked = rankComparisonRows(
      [
        priced("Small Kronor", "SEK", 100),
        priced("Large Euro", "EUR", 80_000),
        priced("Expired Euro", "EUR", 1_000, ["expired"]),
        priced("Other Kronor", "SEK", 50_000),
      ],
      "eur",
    );
    expect(ranked.map((row) => row.venueName)).toEqual([
      "Large Euro",
      "Small Kronor",
      "Other Kronor",
      "Expired Euro",
    ]);
    expect(ranked.find((row) => !row.gaps.includes("expired"))?.venueName).toBe("Large Euro");
    expect(ranked[0]?.venueName).toBe("Large Euro");
  });

  it("puts the stated currency first even when its amount is larger", () => {
    const ranked = rankComparisonRows(
      [priced("Cheap Euro", "EUR", 100), priced("Large Kronor", "SEK", 500_000)],
      "SEK",
    );
    expect(ranked.map((row) => row.venueName)).toEqual(["Large Kronor", "Cheap Euro"]);
    expect(ranked.find((row) => !row.gaps.includes("expired"))?.venueName).toBe("Large Kronor");
  });

  it("does not order different currencies by raw minor units when the brief has no currency", () => {
    const ranked = rankComparisonRows([
      priced("Cheap Kronor", "SEK", 100),
      priced("Dear Euro", "EUR", 90_000),
    ]);
    expect(ranked.map((row) => row.venueName)).toEqual(["Dear Euro", "Cheap Kronor"]);
    expect(ranked.find((row) => !row.gaps.includes("expired"))?.venueName).toBe("Dear Euro");
  });
});

let proposalCount = 0;

function proposal(title: string, data?: Record<string, unknown>): unknown {
  proposalCount += 1;
  return {
    uuid: `00000000-0000-4000-8000-${proposalCount.toString().padStart(12, "0")}`,
    title,
    currency: "EUR",
    blocks: [{ quantity: 1, package_split: [{ type: "food", value_without_tax: 1_000 }] }],
    ...(data !== undefined ? { data } : {}),
  };
}

function offer(venueName: string, facts: Pick<VenueOffer, "city" | "capacity"> = {}): VenueOffer {
  return { venueName, currency: "EUR", totalMinor: minorUnits(1_000), ...facts };
}

function names(offers: VenueOffer[]): string[] {
  return offers.map((item) => item.venueName ?? "");
}

function priced(venueName: string, currency: string, amount: number, gaps: string[] = []): ComparisonRow {
  const money = minorUnits(amount);
  return {
    venueName,
    currency,
    roomsMinor: money,
    foodAndBeverageMinor: money,
    spaceMinor: money,
    extrasMinor: money,
    totalMinor: money,
    gaps,
    favorite: false,
  };
}
