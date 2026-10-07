import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  briefConfirmHold,
  findBriefGaps,
  findGaps,
  findOfferGaps,
  questionForGap,
} from "../src/domain/fitness";
import type { PlannerBrief } from "../src/domain/planner-brief";

const comparable: PlannerBrief = {
  city: "Stockholm",
  startDate: "2026-12-03",
  startTime: "09:00",
  endTime: "17:00",
  attendeeCount: 25,
};

describe("brief and offer gaps", () => {
  it("asks for a clock end unless a duration, an end, or a later date is known", () => {
    expect(findBriefGaps({ ...comparable, endTime: undefined, durationMinutes: 30 }, "brief:comparable")).toEqual([]);
    expect(findBriefGaps({ ...comparable, endTime: "18:00" }, "brief:comparable")).toEqual([]);
    expect(
      findBriefGaps(
        { city: "Oslo", startDate: "2026-06-01", endDate: "2026-06-03", startTime: "15:00", attendeeCount: 4 },
        "brief:comparable",
      ),
    ).toEqual([]);
    expect(findBriefGaps({ ...comparable, endTime: undefined, endDate: "2026-12-03" }, "brief:comparable")).toEqual([
      "endTime",
    ]);
    expect(findBriefGaps({ ...comparable, endTime: undefined, endDate: "2026-12-02" }, "brief:comparable")).toEqual([
      "endTime",
    ]);
    expect(
      findBriefGaps({ city: "Oslo", endDate: "2026-06-03", startTime: "15:00", attendeeCount: 4 }, "brief:comparable"),
    ).toEqual(["startDate", "endTime"]);
  });

  it("requires rooms only when the stay continues", () => {
    const overnight = {
      contactEmail: "ada@example.com",
      startDate: "2026-06-01",
      endDate: "2026-06-03",
      attendeeCount: 4,
      language: "en",
    };
    expect(findBriefGaps(overnight, "brief:fileable")).toEqual(["roomCount"]);
    expect(findBriefGaps({ ...overnight, roomCount: 2 }, "brief:fileable")).toEqual([]);
    expect(findBriefGaps({ ...overnight, endDate: "2026-06-01" }, "brief:fileable")).toEqual([]);
  });

  it("lists offer gaps in config order and ignores a non-string issue path", () => {
    expect(findOfferGaps({})).toEqual(["venueName", "currency", "totalMinor"]);
    expect(findOfferGaps({ venueName: "Hall", currency: "EUR", totalMinor: { unit: "minor", amount: 1 } })).toEqual([]);
    const schema = z.array(z.string());
    expect(findGaps([1], schema, { "0": true })).toEqual([]);
    expect(findGaps({ city: "Stockholm" }, z.object({ city: z.string() }), { city: true })).toEqual([]);
  });

  it("asks one question for a known gap, a basis, or an unknown field", () => {
    const questions: Record<string, string> = {
      eventTitle: "What should we call this event?",
      contactEmail: "What email should receive the venue replies?",
      startDate: "What is the start date? Use YYYY-MM-DD.",
      endDate: "What is the end date? Use YYYY-MM-DD.",
      attendeeCount: "How many people are coming?",
      language: "Which two-letter language should the request use?",
      roomCount: "The stay runs past the start date. How many rooms do you need?",
      city: "Which city is the event in?",
      startTime: "What time does it start?",
      endTime: "When does it end, or how long does it run?",
      durationMinutes: "How long does it run?",
      meetingRoomCount: "How many meeting rooms do you need?",
      foodRequired: "Do you need food and drink included?",
      venueName: "Which venue sent this offer?",
      currency: "Which currency is this offer in?",
      totalMinor: "What is the offer total in minor units?",
      budgetBasis: "Is that per person or total?",
    };
    for (const [field, question] of Object.entries(questions)) {
      expect(questionForGap(field)).toBe(question);
    }
    expect(questionForGap("theme")).toBe("What should we use for theme?");
    expect(briefConfirmHold({})).toEqual({
      gaps: ["city", "startDate", "startTime", "attendeeCount", "endTime"],
      question: questions.city,
    });
    expect(briefConfirmHold(comparable)).toBeNull();
    expect(briefConfirmHold({ ...comparable, budget: { amount: 300, currency: "EUR" } })).toEqual({
      gaps: ["budgetBasis"],
      question: questions.budgetBasis,
    });
    expect(briefConfirmHold({ ...comparable, budget: { amount: 300, currency: "EUR", scope: "total" } })).toBeNull();
    expect(briefConfirmHold({ ...comparable, budget: { amount: 12, currency: "EUR", scope: "per-person" } })).toBeNull();
  });
});
