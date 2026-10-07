import type { PlannerBrief } from "../domain/planner-brief";
import { minorUnits } from "../domain/minor-units";
import type { VenueOffer } from "../domain/venue-offer";

export type TurnIntent = "file" | "addOffers" | "compare" | "update";

const monthIndexByName: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

const fixtureVenueNames = ["Harbour House", "Ridge Hall", "Canal Loft"] as const;

export function turnIntent(text: string): TurnIntent {
  const normalised = text.toLowerCase();
  if (normalised.includes("file the brief") || normalised.trim() === "file") {
    return "file";
  }
  if (normalised.includes("add the venue proposals") || normalised.includes("add offers")) {
    return "addOffers";
  }
  if (normalised.includes("compare")) {
    return "compare";
  }
  return "update";
}

export function extractBriefPatch(text: string): PlannerBrief {
  const withoutMeetingRooms = text.replace(/Meeting rooms\s+\d+/gi, "");
  const patch: PlannerBrief = {};
  const title = /Title\s+([^.]+)\./i.exec(text);
  const organisation = /Organisation\s+([^.]+)\./i.exec(text);
  const email = /Email\s+(\S+)/i.exec(text);
  const startDate = /Start\s+(\d{4}-\d{2}-\d{2})/i.exec(text);
  const endDate = /End\s+(\d{4}-\d{2}-\d{2})/i.exec(text);
  const attendees = /Attendees\s+(\d+)/i.exec(text);
  const rooms = /(?:^|\s)Rooms\s+(\d+)/i.exec(withoutMeetingRooms);
  const meetingRooms = /Meeting rooms\s+(\d+)/i.exec(text);
  const language = /Language\s+([a-z]{2})\b/i.exec(text);
  const city = /City\s+([^.]+)\./i.exec(text);
  const food = /Food\s+(yes|no)/i.exec(text);
  const budget = /Budget\s+(\d+)/i.exec(text);
  const notes = /Notes\s+(.+)$/i.exec(text);
  if (title?.[1]) {
    patch.eventTitle = title[1].trim();
  }
  if (organisation?.[1]) {
    patch.organisationName = organisation[1].trim();
  }
  if (email?.[1]) {
    patch.contactEmail = email[1].replace(/[.,]+$/g, "");
  }
  if (startDate?.[1]) {
    patch.startDate = startDate[1];
  }
  if (endDate?.[1]) {
    patch.endDate = endDate[1];
  }
  if (attendees?.[1]) {
    patch.attendeeCount = Number(attendees[1]);
  }
  if (rooms?.[1]) {
    patch.roomCount = Number(rooms[1]);
  }
  if (meetingRooms?.[1]) {
    patch.meetingRoomCount = Number(meetingRooms[1]);
  }
  if (language?.[1]) {
    patch.language = language[1].toLowerCase();
  }
  if (city?.[1]) {
    patch.city = city[1].trim();
  }
  if (food?.[1]) {
    patch.foodRequired = food[1].toLowerCase() === "yes";
  }
  if (budget?.[1]) {
    patch.budgetMinor = minorUnits(Number(budget[1]));
  }
  if (notes?.[1]) {
    const noteText = notes[1]
      .replace(/\s+Start time\s+.*/i, "")
      .replace(/\s+End time\s+.*/i, "")
      .replace(/\s+Duration\s+\d+\b.*/i, "")
      .trim();
    if (noteText !== "") {
      patch.notes = noteText;
    }
  }
  const labeledStart = /Start time\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i.exec(text);
  const labeledEnd = /End time\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i.exec(text);
  const labeledDuration = /Duration\s+(\d+)\b/i.exec(text);
  const startClock = labeledStart?.[1] === undefined ? undefined : normaliseClock(labeledStart[1]);
  const endClock = labeledEnd?.[1] === undefined ? undefined : normaliseClock(labeledEnd[1]);
  if (startClock !== undefined) {
    patch.startTime = startClock;
  }
  if (endClock !== undefined) {
    patch.endTime = endClock;
  }
  if (labeledDuration?.[1]) {
    const minutes = Number(labeledDuration[1]);
    if (Number.isInteger(minutes) && minutes > 0) {
      patch.durationMinutes = minutes;
    }
  }
  return mergePlainEnglish(patch, text);
}

export function matchFavoriteVenues(text: string): string[] {
  const normalised = text.toLowerCase();
  if (normalised.trim() === "" || /\bskip\b/i.test(text)) {
    return [];
  }
  return fixtureVenueNames.filter((venueName) => normalised.includes(venueName.toLowerCase()));
}

export function extractPastedOffer(text: string): VenueOffer | null {
  const venue = /Venue:\s*([^.]+)\./i.exec(text);
  if (!venue?.[1]) {
    return null;
  }
  const currency = /Currency\s+([A-Za-z]{3})/i.exec(text);
  const rooms = /Rooms\s+(\d+)/i.exec(text);
  const food = /Food\s+(\d+)/i.exec(text);
  const space = /Space\s+(\d+)/i.exec(text);
  const extras = /Extras\s+(\d+)/i.exec(text);
  const expires = /Expires\s+(\d{4}-\d{2}-\d{2})/i.exec(text);
  const roomsMinor = minorUnits(rooms?.[1] ? Number(rooms[1]) : 0);
  const foodAndBeverageMinor = minorUnits(food?.[1] ? Number(food[1]) : 0);
  const spaceMinor = minorUnits(space?.[1] ? Number(space[1]) : 0);
  const extrasMinor = minorUnits(extras?.[1] ? Number(extras[1]) : 0);
  return {
    venueName: venue[1].trim(),
    currency: currency?.[1]?.toUpperCase(),
    expiresAt: expires?.[1] ? `${expires[1]}T00:00:00.000Z` : undefined,
    roomsMinor,
    foodAndBeverageMinor,
    spaceMinor,
    extrasMinor,
    totalMinor: minorUnits(
      roomsMinor.amount + foodAndBeverageMinor.amount + spaceMinor.amount + extrasMinor.amount,
    ),
  };
}

function mergePlainEnglish(patch: PlannerBrief, text: string): PlannerBrief {
  const next: PlannerBrief = { ...patch };
  if (next.city === undefined) {
    const cityMatch =
      /\bin\s+([A-Za-z][A-Za-z-]+(?:\s+[A-Za-z][A-Za-z-]+)?)\s+(?:for|on|with|,)/i.exec(text) ??
      /\bcity\s+(?:is\s+)?([A-Za-z][A-Za-z-]+)/i.exec(text);
    if (cityMatch?.[1]) {
      next.city = cityMatch[1].trim();
    }
  }
  if (next.attendeeCount === undefined) {
    const peopleMatch = /(?:for\s+)?(\d+)\s+people/i.exec(text) ?? /(?:about|around)\s+(\d+)/i.exec(text);
    if (peopleMatch?.[1]) {
      next.attendeeCount = Number(peopleMatch[1]);
    }
  }
  const dates = collectIsoDates(text);
  if (next.startDate === undefined && dates[0] !== undefined) {
    next.startDate = dates[0];
  }
  if (next.endDate === undefined && dates[1] !== undefined) {
    next.endDate = dates[1];
  }
  if (next.endDate === undefined && next.startDate !== undefined) {
    next.endDate = next.startDate;
  }
  const clocks = readClockRange(text);
  if (next.startTime === undefined && clocks.startTime !== undefined) {
    next.startTime = clocks.startTime;
  }
  if (next.endTime === undefined && clocks.endTime !== undefined) {
    next.endTime = clocks.endTime;
  }
  if (next.startTime === undefined) {
    const single = readSingleClock(text);
    if (single !== undefined) {
      next.startTime = single;
    }
  }
  if (next.durationMinutes === undefined) {
    const duration = readDurationMinutes(text);
    if (duration !== undefined) {
      next.durationMinutes = duration;
    }
  }
  if (next.foodRequired === undefined && /\b(dinner|lunch|breakfast|catering|food)\b/i.test(text)) {
    next.foodRequired = true;
  }
  if (next.meetingRoomCount === undefined) {
    const numberedRooms = /(\d+)\s+meeting\s+rooms?\b/i.exec(text);
    if (numberedRooms?.[1]) {
      next.meetingRoomCount = Number(numberedRooms[1]);
    } else if (/\ba\s+meeting\s+room\b/i.test(text) || /\bmeeting\s+room\b/i.test(text)) {
      next.meetingRoomCount = 1;
    }
  }
  if (next.roomCount === undefined) {
    const strippedMeeting = text.replace(/\d*\s*meeting\s+rooms?/gi, "");
    const overnightRooms = /(\d+)\s+rooms?\b/i.exec(strippedMeeting);
    if (overnightRooms?.[1]) {
      next.roomCount = Number(overnightRooms[1]);
    }
  }
  return next;
}

const clockToken = "(\\d{1,2}:\\d{2}\\s*(?:am|pm)?|\\d{1,2}\\s*(?:am|pm))";

export function readClockRange(text: string): { startTime?: string; endTime?: string } {
  const range = new RegExp(
    `\\b(?:from\\s+)?${clockToken}\\s*(?:to|until|–|-)\\s*${clockToken}\\b`,
    "i",
  ).exec(text);
  if (!range?.[1] || !range[2]) {
    return {};
  }
  const startTime = normaliseClock(range[1]);
  const endTime = normaliseClock(range[2]);
  if (startTime === undefined || endTime === undefined) {
    return {};
  }
  return { startTime, endTime };
}

export function readSingleClock(text: string): string | undefined {
  const whole = /^\s*(\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm))\s*$/i.exec(text);
  const prefixed = /\b(?:at|from)\s+(\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm))\b/i.exec(text);
  const token = whole?.[1] ?? prefixed?.[1];
  if (token === undefined) {
    return undefined;
  }
  return normaliseClock(token);
}

export function readDurationMinutes(text: string): number | undefined {
  const hours = /(\d+)\s+hours?\b/i.exec(text);
  if (hours?.[1]) {
    return Number(hours[1]) * 60;
  }
  const minutes = /(\d+)\s+minutes?\b/i.exec(text);
  if (minutes?.[1]) {
    return Number(minutes[1]);
  }
  return undefined;
}

function normaliseClock(raw: string): string | undefined {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(raw.trim());
  if (!match?.[1]) {
    return undefined;
  }
  let hour = Number(match[1]);
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  const suffix = match[3]?.toLowerCase();
  if (suffix === "pm" && hour < 12) {
    hour += 12;
  }
  if (suffix === "am" && hour === 12) {
    hour = 0;
  }
  if (hour > 23 || minute > 59) {
    return undefined;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function collectIsoDates(text: string): string[] {
  const pattern =
    /\b(\d{4}-\d{2}-\d{2})\b|\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/gi;
  const dates: string[] = [];
  for (const match of text.matchAll(pattern)) {
    if (match[1]) {
      dates.push(match[1]);
      continue;
    }
    if (match[2] && match[3] && match[4]) {
      dates.push(toIsoDate(match[4], match[3], match[2]));
      continue;
    }
    if (match[5] && match[6] && match[7]) {
      dates.push(toIsoDate(match[7], match[5], match[6]));
    }
  }
  return dates;
}

function toIsoDate(year: string, monthName: string, day: string): string {
  const month = monthIndexByName[monthName.toLowerCase()];
  if (month === undefined) {
    return `${year}-01-01`;
  }
  return `${year}-${month}-${day.padStart(2, "0")}`;
}
