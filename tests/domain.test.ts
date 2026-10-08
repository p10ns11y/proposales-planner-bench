import { describe, expect, it } from "vitest";
import {
  canalLoftProposal,
  harbourHouseProposal,
  lumenOvernightBrief,
  northwindDayBrief,
  ridgeHallProposal,
} from "../src/contract/fixtures";
import { compareOffers } from "../src/domain/compare-offers";
import { briefComparableConfig, findBriefGaps } from "../src/domain/fitness";
import { normaliseProposal } from "../src/domain/normalise-proposal";
import { mergeBrief, plannerBriefSchema } from "../src/domain/planner-brief";

const today = "2026-10-06";

describe("brief fitness", () => {
  it("accepts the sample briefs", () => {
    expect(plannerBriefSchema.parse(northwindDayBrief).eventTitle).toBe("Northwind offsite");
    expect(plannerBriefSchema.parse(lumenOvernightBrief).roomCount).toBe(10);
  });

  it("does not require rooms when the event starts and ends on the same day", () => {
    expect(findBriefGaps(northwindDayBrief, "brief:fileable")).toEqual([]);
  });

  it("requires rooms when the end date is after the start date", () => {
    const overnightWithoutRooms = { ...lumenOvernightBrief, roomCount: undefined };
    expect(findBriefGaps(overnightWithoutRooms, "brief:fileable")).toEqual(["roomCount"]);
    expect(findBriefGaps(lumenOvernightBrief, "brief:fileable")).toEqual([]);
  });

  it("lists comparable gaps in config order", () => {
    expect(findBriefGaps({ eventTitle: "Workshop" }, "brief:comparable")).toEqual([
      "city",
      "startDate",
      "startTime",
      "attendeeCount",
      "endTime",
    ]);
  });

  it("compares a same-day brief that has a start, an end, and a headcount", () => {
    expect(
      findBriefGaps(
        {
          city: "Stockholm",
          startDate: "2026-11-12",
          endDate: "2026-11-12",
          startTime: "09:00",
          endTime: "17:00",
          attendeeCount: 40,
        },
        "brief:comparable",
      ),
    ).toEqual([]);
  });

  it("accepts a duration in place of an end", () => {
    expect(
      findBriefGaps(
        {
          city: "Stockholm",
          startDate: "2026-11-12",
          startTime: "09:00",
          durationMinutes: 480,
          attendeeCount: 40,
        },
        "brief:comparable",
      ),
    ).toEqual([]);
  });

  it("accepts a later end date without a clock end", () => {
    expect(
      findBriefGaps(
        {
          city: "Gothenburg",
          startDate: "2026-06-01",
          endDate: "2026-06-03",
          startTime: "15:00",
          attendeeCount: 18,
        },
        "brief:comparable",
      ),
    ).toEqual([]);
  });

  it("maps a full day onto the clock before the comparable gap check", () => {
    const fullDay = {
      city: "Stockholm",
      startDate: "2026-12-03",
      endDate: "2026-12-03",
      attendeeCount: 25,
      timeAssumption: {
        dayPart: "full-day" as const,
        statement: "Assumed 09:00\u201317:00 for a full day",
      },
    };
    expect(briefComparableConfig.startTime).toBe(true);
    expect(findBriefGaps(fullDay, "brief:comparable")).toEqual(["startTime", "endTime"]);
    const mapped = mergeBrief({}, fullDay);
    expect(mapped.startTime).toBe("09:00");
    expect(mapped.endTime).toBe("17:00");
    expect(mapped.timeAssumption).toEqual(fullDay.timeAssumption);
    expect(findBriefGaps(mapped, "brief:comparable")).toEqual([]);
  });

  it("still asks for an end when only a start time is known", () => {
    expect(
      findBriefGaps(
        {
          city: "Stockholm",
          startDate: "2026-11-12",
          endDate: "2026-11-12",
          startTime: "09:00",
          attendeeCount: 40,
        },
        "brief:comparable",
      ),
    ).toEqual(["endTime"]);
  });

  it("does not gate a match on meeting rooms, food, or overnight rooms", () => {
    const gaps = findBriefGaps(
      {
        city: "Stockholm",
        startDate: "2026-11-12",
        startTime: "09:00",
        endTime: "17:00",
        attendeeCount: 40,
      },
      "brief:comparable",
    );
    expect(gaps).not.toContain("meetingRoomCount");
    expect(gaps).not.toContain("foodRequired");
    expect(gaps).not.toContain("roomCount");
  });

  it("still requires email before a brief is fileable", () => {
    const withoutEmail = { ...northwindDayBrief, contactEmail: undefined };
    expect(findBriefGaps(withoutEmail, "brief:fileable")).toEqual(["contactEmail"]);
  });

  it("files without an event name when the other filing fields are present", () => {
    const withoutTitle = { ...northwindDayBrief, eventTitle: undefined };
    expect(findBriefGaps(withoutTitle, "brief:fileable")).toEqual([]);
  });

  it("keeps an explicit false when merging a brief", () => {
    const merged = mergeBrief(plannerBriefSchema.parse(northwindDayBrief), { foodRequired: false });
    expect(merged.foodRequired).toBe(false);
    expect(merged.city).toBe("Stockholm");
  });
});

describe("proposal normaliser", () => {
  it("sums package split amounts in minor units by type, times quantity", () => {
    expect(normaliseProposal(harbourHouseProposal)).toMatchObject({
      venueName: "Harbour House",
      currency: "EUR",
      roomsMinor: { unit: "minor", amount: 20_000 },
      foodAndBeverageMinor: { unit: "minor", amount: 6_000 },
      spaceMinor: { unit: "minor", amount: 10_000 },
      extrasMinor: { unit: "minor", amount: 500 },
      totalMinor: { unit: "minor", amount: 36_500 },
    });
    expect(normaliseProposal(ridgeHallProposal).foodAndBeverageMinor).toEqual({
      unit: "minor",
      amount: 0,
    });
    expect(normaliseProposal(canalLoftProposal).extrasMinor).toEqual({
      unit: "minor",
      amount: 12_000,
    });
  });

  it("names a live draft from its title and totals the blocks when the proposal total is zero", () => {
    const offer = normaliseProposal({
      uuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      status: "draft",
      title: "Harbour House (demo venue)",
      company_name: "Example Desk",
      company_id: 9,
      value_without_tax: 0,
      blocks: [
        {
          quantity: 2,
          package_split: [
            { type: "accommodation", value_without_tax: 10_000, value_with_tax: 12_500 },
            { type: "food", value_without_tax: 3_000, value_with_tax: 3_750 },
            { type: "meetingRoom", value_without_tax: 5_000, value_with_tax: 6_250 },
            { type: "other", value_without_tax: 250, value_with_tax: 313 },
          ],
        },
      ],
    });
    expect(offer.venueName).toBe("Harbour House");
    expect(offer.totalMinor).toEqual({ unit: "minor", amount: 36_500 });
    expect(JSON.stringify(offer)).not.toContain("Example Desk");
  });

  it("does not use the account company name when the title is missing", () => {
    const offer = normaliseProposal({
      uuid: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1",
      company_name: "Example Desk",
      title: " (demo venue)",
      value_without_tax: 0,
      blocks: [],
    });
    expect(offer.venueName).toBe("Untitled venue");
  });

  it("keeps a proposal status on the offer", () => {
    const expired = normaliseProposal({
      uuid: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
      status: "expired",
      title: "Old Hall",
      currency: "EUR",
      expires_at: Math.trunc(Date.parse("2027-06-01T00:00:00.000Z") / 1000),
      blocks: [],
    });
    expect(expired.status).toBe("expired");
    const open = normaliseProposal({
      uuid: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2",
      status: "active",
      title: "Open Hall",
      currency: "EUR",
      blocks: [],
    });
    expect(open.status).toBe("active");
    expect(normaliseProposal({ uuid: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3", status: null, blocks: [] }).status).toBeUndefined();
  });

  it("prefers value_without_tax over value_with_tax", () => {
    const offer = normaliseProposal({
      uuid: "44444444-4444-4444-8444-444444444444",
      blocks: [
        {
          quantity: 1,
          package_split: [{ type: "food", value_without_tax: 100, value_with_tax: 125 }],
        },
      ],
    });
    expect(offer.foodAndBeverageMinor?.amount).toBe(100);
  });
});

describe("comparison gaps", () => {
  it("does not show the only account company as a venue holder", () => {
    const offer = normaliseProposal({
      uuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      title: "Harbour House (demo venue)",
      company_name: "Example Desk",
      company_id: 9,
      blocks: [{ quantity: 1, package_split: [{ type: "food", value_without_tax: 100 }] }],
    });
    const rows = compareOffers(plannerBriefSchema.parse(northwindDayBrief), [offer], today, {
      companies: [{ id: 9, name: "Example Desk" }],
    });
    expect(rows[0]?.venueName).toBe("Harbour House");
    expect(rows[0]?.heldByCompanyName).toBeUndefined();
  });

  it("marks missing food, missing rooms on an overnight stay, and an expired offer", () => {
    const offers = [harbourHouseProposal, ridgeHallProposal, canalLoftProposal].map(normaliseProposal);
    const rows = compareOffers(plannerBriefSchema.parse(lumenOvernightBrief), offers, today);
    expect(rows[0]?.gaps).toEqual([]);
    expect(rows[1]?.gaps).toEqual(["foodAndBeverage"]);
    expect(rows[2]?.gaps).toContain("rooms");
    expect(rows[2]?.gaps).toContain("expired");
  });
});
