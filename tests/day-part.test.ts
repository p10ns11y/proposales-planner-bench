import { describe, expect, it } from "vitest";
import {
  applyDayPartClock,
  assumedSpan,
  completeDayPart,
  dayPartNames,
  type DayPart,
  type DayPartBrief,
} from "../src/domain/day-part";

const phrases: Record<DayPart, { startTime: string; endTime: string; phrase: string }> = {
  "full-day": { startTime: "09:00", endTime: "17:00", phrase: "a full day" },
  "all-day": { startTime: "09:00", endTime: "17:00", phrase: "all day" },
  "half-day": { startTime: "09:00", endTime: "12:00", phrase: "a half day" },
  morning: { startTime: "09:00", endTime: "12:00", phrase: "the morning" },
  afternoon: { startTime: "13:00", endTime: "17:00", phrase: "the afternoon" },
};

describe("day part mapping", () => {
  it("maps every day part onto its clock and statement", () => {
    expect(dayPartNames).toEqual(["full-day", "all-day", "half-day", "morning", "afternoon"]);
    for (const dayPart of dayPartNames) {
      const details = phrases[dayPart];
      expect(assumedSpan(dayPart)).toEqual({
        startTime: details.startTime,
        endTime: details.endTime,
        timeAssumption: {
          dayPart,
          statement: `Assumed ${details.startTime}\u2013${details.endTime} for ${details.phrase}`,
        },
      });
    }
  });

  it("leaves a brief unchanged when no day part is stored", () => {
    const brief: DayPartBrief = { startTime: "10:00", endTime: "16:00" };
    const open: DayPartBrief = {};
    expect(applyDayPartClock(brief)).toBe(brief);
    expect(applyDayPartClock(open)).toBe(open);
    expect(completeDayPart(brief)).toBe(brief);
    expect(completeDayPart(open)).toBe(open);
  });

  it("fills an open clock and keeps the stored assumption", () => {
    const brief: DayPartBrief = { timeAssumption: assumedSpan("full-day").timeAssumption };
    expect(applyDayPartClock(brief)).toEqual({
      startTime: "09:00",
      endTime: "17:00",
      timeAssumption: brief.timeAssumption,
    });
    const custom = { dayPart: "full-day" as const, statement: "Kept" };
    expect(applyDayPartClock({ timeAssumption: custom }).timeAssumption).toEqual(custom);
  });

  it("keeps an explicit clock, including a start paired with a duration", () => {
    const assumed = assumedSpan("morning").timeAssumption;
    const ranged: DayPartBrief = { startTime: "10:00", endTime: "11:00", timeAssumption: assumed };
    const timed: DayPartBrief = { startTime: "10:00", durationMinutes: 90, timeAssumption: assumed };
    expect(applyDayPartClock(ranged)).toBe(ranged);
    expect(applyDayPartClock(timed)).toBe(timed);
  });

  it("fills only the missing side of an open clock", () => {
    const timeAssumption = assumedSpan("afternoon").timeAssumption;
    expect(applyDayPartClock({ startTime: "14:00", timeAssumption })).toEqual({
      startTime: "14:00",
      endTime: "17:00",
      timeAssumption,
    });
    expect(applyDayPartClock({ endTime: "16:00", timeAssumption })).toEqual({
      startTime: "13:00",
      endTime: "16:00",
      timeAssumption,
    });
    expect(applyDayPartClock({ durationMinutes: 120, timeAssumption })).toStrictEqual({
      startTime: "13:00",
      durationMinutes: 120,
      timeAssumption,
    });
    expect(applyDayPartClock({ endTime: "16:00", durationMinutes: 30, timeAssumption })).toEqual({
      startTime: "13:00",
      endTime: "16:00",
      durationMinutes: 30,
      timeAssumption,
    });
  });

  it("rewrites a matching explicit clock and drops a conflicting one", () => {
    const assumed = assumedSpan("half-day");
    expect(completeDayPart({ startTime: "09:00", endTime: "12:00", timeAssumption: { dayPart: "half-day", statement: "custom" } })).toEqual({
      startTime: "09:00",
      endTime: "12:00",
      timeAssumption: assumed.timeAssumption,
    });
    expect(
      completeDayPart({ startTime: "10:00", endTime: "12:00", timeAssumption: assumed.timeAssumption }),
    ).toEqual({ startTime: "10:00", endTime: "12:00" });
    expect(
      completeDayPart({ startTime: "09:00", endTime: "12:00", durationMinutes: 180, timeAssumption: assumed.timeAssumption }),
    ).toEqual({ startTime: "09:00", endTime: "12:00", durationMinutes: 180 });
    expect(
      completeDayPart({ startTime: "09:00", endTime: "11:00", timeAssumption: { dayPart: "half-day", statement: "custom" } }),
    ).toEqual({ startTime: "09:00", endTime: "11:00" });
  });

  it("fills a missing clock and stores the assumed statement", () => {
    const assumed = assumedSpan("all-day");
    expect(completeDayPart({ timeAssumption: { dayPart: "all-day", statement: "custom" } })).toEqual({
      startTime: assumed.startTime,
      endTime: assumed.endTime,
      timeAssumption: assumed.timeAssumption,
    });
    expect(completeDayPart({ durationMinutes: 45, timeAssumption: assumed.timeAssumption })).toStrictEqual({
      startTime: "09:00",
      durationMinutes: 45,
      timeAssumption: assumed.timeAssumption,
    });
  });
});
