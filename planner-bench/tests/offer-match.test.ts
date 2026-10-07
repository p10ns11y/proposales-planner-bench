import { describe, expect, it } from "vitest";
import { offersForBrief, rankComparisonRows } from "../src/domain/compare-offers";
import type { ComparisonRow } from "../src/domain/comparison-row";
import { minorUnits } from "../src/domain/minor-units";
import { normaliseProposal } from "../src/domain/normalise-proposal";
import type { VenueOffer } from "../src/domain/venue-offer";

describe("offer city and capacity", () => {
  it("reads city, capacity bounds, day part, and event type from proposal data", () => {
    const offer = normaliseProposal(
      proposal("Harbour House", {
        city: " Stockholm ",
        capacity: 80,
        min_capacity: 10,
        day_part: "full day",
        event_type: " offsite ",
      }),
    );
    expect(offer.city).toBe("Stockholm");
    expect(offer.capacity).toBe(80);
    expect(offer.minCapacity).toBe(10);
    expect(offer.dayPart).toBe("full_day");
    expect(offer.eventType).toBe("offsite");
    const seeded = normaliseProposal(
      proposal("Seeded Hall", {
        city: "Gothenburg",
        capacity: "30",
        min_capacity: "12",
        day_part: "half_day_morning",
        event_type: "meeting",
      }),
    );
    expect(seeded.city).toBe("Gothenburg");
    expect(seeded.capacity).toBe(30);
    expect(seeded.minCapacity).toBe(12);
    expect(seeded.dayPart).toBe("half_day_morning");
    expect(seeded.eventType).toBe("meeting");
    const bare = normaliseProposal(proposal("Bare Hall", { day_part: "morning" }));
    expect(bare.city).toBeUndefined();
    expect(bare.capacity).toBeUndefined();
    expect(bare.minCapacity).toBeUndefined();
    expect(bare.dayPart).toBeUndefined();
    expect(bare.eventType).toBeUndefined();
    expect(bare.venueName).toBe("Bare Hall");
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

  it("keeps an offer only inside the capacity bounds that are known", () => {
    const offers = [
      offer("Room for 30", { city: "Stockholm", capacity: 30 }),
      offer("Room for 40", { city: "Stockholm", capacity: 40 }),
      offer("Room for 80", { city: "Stockholm", capacity: 80 }),
      offer("Needs 25", { city: "Stockholm", minCapacity: 25, capacity: 100 }),
      offer("At least 30", { city: "Stockholm", minCapacity: 30 }),
    ];
    expect(names(offersForBrief({ city: "Stockholm", attendeeCount: 20 }, offers))).toEqual([
      "Room for 30",
      "Room for 40",
      "Room for 80",
    ]);
    expect(names(offersForBrief({ city: "Stockholm", attendeeCount: 40 }, offers))).toEqual([
      "Room for 40",
      "Room for 80",
      "Needs 25",
      "At least 30",
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

describe("live demo draft counts", () => {
  it("matches the live city and headcount counts without using day part", () => {
    const demoOffers = demoDrafts.map((draft) => normaliseProposal(draft));
    expect(demoOffers).toHaveLength(12);
    expect(demoOffers.map((item) => item.dayPart)).toEqual([
      "full_day",
      "half_day_morning",
      "evening",
      "full_day",
      "overnight",
      "multi_day",
      "full_day",
      "half_day_afternoon",
      "evening",
      "half_day_morning",
      "overnight",
      "multi_day",
    ]);
    expect(names(offersForBrief({ city: "Stockholm", attendeeCount: 40 }, demoOffers))).toEqual([
      "North Quay",
      "Birch Room",
      "Canal Annex",
      "Grand Atrium",
      "Stone Works",
      "Harbour Loft",
    ]);
    expect(names(offersForBrief({ city: "Stockholm", attendeeCount: 20 }, demoOffers))).toEqual([
      "North Quay",
      "Birch Room",
      "Canal Annex",
    ]);
    expect(names(offersForBrief({ city: "Gothenburg", attendeeCount: 30 }, demoOffers))).toEqual([
      "River House",
    ]);
    expect(names(offersForBrief({ city: "Malmö", attendeeCount: 80 }, demoOffers))).toEqual(["Lime Court"]);
    expect(names(offersForBrief({ city: "Uppsala", attendeeCount: 20 }, demoOffers))).toEqual([
      "Castle Yard",
      "Seminar Hut",
    ]);
    expect(demoOffers.find((item) => item.venueName === "Canal Annex")?.dayPart).toBe("evening");
    expect(demoOffers.find((item) => item.venueName === "Stone Works")?.eventType).toBe("dinner");
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

function offer(
  venueName: string,
  facts: Pick<VenueOffer, "city" | "capacity" | "minCapacity"> = {},
): VenueOffer {
  return { venueName, currency: "EUR", totalMinor: minorUnits(1_000), ...facts };
}

function names(offers: VenueOffer[]): string[] {
  return offers.map((item) => item.venueName ?? "");
}

const demoDrafts = [
  {
    title: "North Quay",
    data: { city: "Stockholm", min_capacity: 10, capacity: 80, day_part: "full_day", event_type: "offsite" },
  },
  {
    title: "Birch Room",
    data: { city: "Stockholm", min_capacity: 12, capacity: 40, day_part: "half_day_morning", event_type: "meeting" },
  },
  {
    title: "Canal Annex",
    data: { city: "Stockholm", capacity: 60, day_part: "evening", event_type: "dinner" },
  },
  {
    title: "Grand Atrium",
    data: { city: "Stockholm", min_capacity: 30, capacity: 120, day_part: "full_day", event_type: "conference" },
  },
  {
    title: "Stone Works",
    data: { city: "Stockholm", min_capacity: 25, capacity: 50, day_part: "overnight", event_type: "dinner" },
  },
  {
    title: "Harbour Loft",
    data: { city: "Stockholm", min_capacity: 40, capacity: 90, day_part: "multi_day", event_type: "offsite" },
  },
  {
    title: "Winter Hall",
    data: { city: "Stockholm", min_capacity: 50, capacity: 200, day_part: "full_day", event_type: "conference" },
  },
  {
    title: "River House",
    data: { city: "Gothenburg", min_capacity: 10, capacity: 40, day_part: "half_day_afternoon", event_type: "meeting" },
  },
  {
    title: "Dock Studio",
    data: { city: "Gothenburg", capacity: 20, day_part: "evening", event_type: "dinner" },
  },
  {
    title: "Lime Court",
    data: { city: "Malmö", min_capacity: 40, capacity: 100, day_part: "half_day_morning", event_type: "offsite" },
  },
  {
    title: "Castle Yard",
    data: { city: "Uppsala", min_capacity: 8, capacity: 30, day_part: "overnight", event_type: "meeting" },
  },
  {
    title: "Seminar Hut",
    data: { city: "Uppsala", day_part: "multi_day", event_type: "workshop" },
  },
].map((draft, index) => ({
  ...draft,
  uuid: `10000000-0000-4000-8000-${(index + 1).toString().padStart(12, "0")}`,
  currency: "EUR",
  blocks: [{ quantity: 1, package_split: [{ type: "food", value_without_tax: 1_000 }] }],
}));

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
