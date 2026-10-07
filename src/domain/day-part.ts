export const dayPartNames = ["full-day", "all-day", "half-day", "morning", "afternoon"] as const;

export type DayPart = (typeof dayPartNames)[number];

export type DayPartBrief = {
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  timeAssumption?: { dayPart: DayPart; statement: string };
};

const dayPartDetails = {
  "full-day": { startTime: "09:00", endTime: "17:00", phrase: "a full day" },
  "all-day": { startTime: "09:00", endTime: "17:00", phrase: "all day" },
  "half-day": { startTime: "09:00", endTime: "12:00", phrase: "a half day" },
  morning: { startTime: "09:00", endTime: "12:00", phrase: "the morning" },
  afternoon: { startTime: "13:00", endTime: "17:00", phrase: "the afternoon" },
} as const satisfies Record<DayPart, { startTime: string; endTime: string; phrase: string }>;

export type AssumedSpan = {
  startTime: string;
  endTime: string;
  timeAssumption: { dayPart: DayPart; statement: string };
};

export function assumedSpan(dayPart: DayPart): AssumedSpan {
  const details = dayPartDetails[dayPart];
  return {
    startTime: details.startTime,
    endTime: details.endTime,
    timeAssumption: {
      dayPart,
      statement: `Assumed ${details.startTime}\u2013${details.endTime} for ${details.phrase}`,
    },
  };
}

export function applyDayPartClock<T extends DayPartBrief>(brief: T): T {
  const dayPart = brief.timeAssumption?.dayPart;
  if (dayPart === undefined || explicitClock(brief)) {
    return brief;
  }
  return fillOpenClock(brief, assumedSpan(dayPart), false);
}

export function completeDayPart<T extends DayPartBrief>(brief: T): T {
  const dayPart = brief.timeAssumption?.dayPart;
  if (dayPart === undefined) {
    return brief;
  }
  const assumed = assumedSpan(dayPart);
  if (explicitClock(brief)) {
    return explicitClockAssumption(brief, assumed);
  }
  return fillOpenClock(brief, assumed, true);
}

function explicitClock(brief: DayPartBrief): boolean {
  return brief.startTime !== undefined && (brief.endTime !== undefined || brief.durationMinutes !== undefined);
}

function explicitClockAssumption<T extends DayPartBrief>(brief: T, assumed: AssumedSpan): T {
  if (matchesAssumedSpan(brief, assumed)) {
    return { ...brief, timeAssumption: assumed.timeAssumption };
  }
  const next = { ...brief };
  delete next.timeAssumption;
  return next;
}

function matchesAssumedSpan(brief: DayPartBrief, assumed: { startTime: string; endTime: string }): boolean {
  return (
    brief.durationMinutes === undefined &&
    brief.startTime === assumed.startTime &&
    brief.endTime === assumed.endTime
  );
}

function fillOpenClock<T extends DayPartBrief>(brief: T, assumed: AssumedSpan, replaceAssumption: boolean): T {
  const startTime = brief.startTime ?? assumed.startTime;
  const endTime = openEnd(brief, assumed.endTime);
  const timeAssumption = replaceAssumption ? assumed.timeAssumption : brief.timeAssumption;
  if (endTime === undefined) {
    return { ...brief, startTime, timeAssumption };
  }
  return { ...brief, startTime, endTime, timeAssumption };
}

function openEnd(brief: DayPartBrief, assumedEnd: string): string | undefined {
  if (brief.endTime !== undefined) {
    return brief.endTime;
  }
  if (brief.durationMinutes !== undefined) {
    return undefined;
  }
  return assumedEnd;
}
