import { assumedSpan, type DayPart, type PlannerBrief } from "../domain/planner-brief";
import { minorUnits } from "../domain/minor-units";
import type { VenueOffer } from "../domain/venue-offer";

export type TurnIntent = "file" | "addOffers" | "compare" | "update";

const monthIndexByName: Record<string, string> = {
  january: "01",
  jan: "01",
  february: "02",
  feb: "02",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  may: "05",
  june: "06",
  jun: "06",
  july: "07",
  jul: "07",
  august: "08",
  aug: "08",
  september: "09",
  sept: "09",
  sep: "09",
  october: "10",
  oct: "10",
  november: "11",
  nov: "11",
  december: "12",
  dec: "12",
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
  if (
    next.timeAssumption === undefined &&
    next.startTime === undefined &&
    next.endTime === undefined &&
    next.durationMinutes === undefined
  ) {
    const dayPart = readDayPartName(text);
    if (dayPart !== undefined) {
      const assumed = assumedSpan(dayPart);
      next.startTime = assumed.startTime;
      next.endTime = assumed.endTime;
      next.timeAssumption = assumed.timeAssumption;
    }
  }
  if (next.breakoutRoomCount === undefined) {
    const breakoutRoomCount = readBreakoutRoomCount(text);
    if (breakoutRoomCount !== undefined) {
      next.breakoutRoomCount = breakoutRoomCount;
    }
  }
  if (next.foodRequest === undefined) {
    const foodRequest = readFoodRequest(text);
    if (foodRequest !== undefined) {
      next.foodRequest = foodRequest;
    }
  }
  if (
    next.foodRequired === undefined &&
    (next.foodRequest !== undefined || /\b(dinner|lunch|breakfast|catering|food)\b/i.test(text))
  ) {
    next.foodRequired = true;
  }
  if (next.budget === undefined) {
    const budget = readSpokenBudget(text);
    if (budget !== undefined) {
      next.budget = budget;
    }
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

const monthToken = Object.keys(monthIndexByName)
  .sort((left, right) => right.length - left.length)
  .join("|");

const dayPartFinders: { pattern: RegExp; dayPart: DayPart }[] = [
  { pattern: /\bfull[-\s]?day\b/i, dayPart: "full-day" },
  { pattern: /\ball[-\s]?day\b/i, dayPart: "all-day" },
  { pattern: /\bhalf[-\s]?day\b/i, dayPart: "half-day" },
  { pattern: /(?<!good\s)\bmorning\b/i, dayPart: "morning" },
  { pattern: /(?<!good\s)\bafternoon\b/i, dayPart: "afternoon" },
];

const dietFinders: { pattern: RegExp; name: string }[] = [
  { pattern: /\bvegetarian\b/i, name: "vegetarian" },
  { pattern: /\bvegan\b/i, name: "vegan" },
  { pattern: /\bgluten[-\s]?free\b/i, name: "gluten-free" },
  { pattern: /\b(?:celiac|coeliac)\b/i, name: "gluten-free" },
  { pattern: /\bdairy[-\s]?free\b/i, name: "dairy-free" },
  { pattern: /\bnut[-\s]?free\b/i, name: "nut-free" },
  { pattern: /\bnut\s+allerg(?:y|ies)\b/i, name: "nut-free" },
  { pattern: /\bhalal\b/i, name: "halal" },
  { pattern: /\bkosher\b/i, name: "kosher" },
  { pattern: /\bpescatarian\b/i, name: "pescatarian" },
];

const currencyWords: Record<string, string> = {
  eur: "EUR",
  euro: "EUR",
  euros: "EUR",
  usd: "USD",
  dollar: "USD",
  dollars: "USD",
  gbp: "GBP",
  pound: "GBP",
  pounds: "GBP",
  sek: "SEK",
  krona: "SEK",
  kronor: "SEK",
  nok: "NOK",
  dkk: "DKK",
  chf: "CHF",
};

function readDayPartName(text: string): DayPart | undefined {
  let found: { dayPart: DayPart; index: number } | undefined;
  for (const finder of dayPartFinders) {
    const match = finder.pattern.exec(text);
    if (match === null) {
      continue;
    }
    if (found === undefined || match.index < found.index) {
      found = { dayPart: finder.dayPart, index: match.index };
    }
  }
  return found?.dayPart;
}

function readBreakoutRoomCount(text: string): number | undefined {
  const numbered = /\b(\d+)\s+breakout\s+(?:rooms?|spaces?)\b/i.exec(text);
  if (numbered?.[1]) {
    const count = Number(numbered[1]);
    if (Number.isInteger(count) && count > 0) {
      return count;
    }
  }
  if (/\bbreakout\b/i.test(text)) {
    return 1;
  }
  return undefined;
}

function readFoodRequest(text: string): PlannerBrief["foodRequest"] {
  const found: { index: number; name: string }[] = [];
  for (const finder of dietFinders) {
    const match = finder.pattern.exec(text);
    if (match === null) {
      continue;
    }
    found.push({ index: match.index, name: finder.name });
  }
  found.sort((left, right) => left.index - right.index);
  const dietaryNeeds: string[] = [];
  for (const item of found) {
    if (!dietaryNeeds.includes(item.name)) {
      dietaryNeeds.push(item.name);
    }
  }
  const mealMatch = /\b(breakfast|lunch|dinner)\b/i.exec(text);
  const meal = mealMatch?.[1]?.toLowerCase();
  const request: NonNullable<PlannerBrief["foodRequest"]> = {};
  if (meal === "breakfast" || meal === "lunch" || meal === "dinner") {
    request.meal = meal;
  }
  if (dietaryNeeds.length > 0) {
    request.dietaryNeeds = dietaryNeeds;
  }
  if (request.meal === undefined && request.dietaryNeeds === undefined) {
    return undefined;
  }
  return request;
}

function readSpokenBudget(text: string): PlannerBrief["budget"] {
  const clause = /budget\b[^.\n]*/i.exec(text);
  if (clause?.[0] === undefined) {
    return undefined;
  }
  const money = readMoney(clause[0]);
  if (money === undefined) {
    return undefined;
  }
  const scope = readBudgetScope(clause[0]);
  const approximate = /\b(?:around|about|approx(?:imately)?|roughly)\b/i.test(clause[0]);
  return {
    amount: money.amount,
    currency: money.currency,
    ...(scope !== undefined ? { scope } : {}),
    ...(approximate ? { approximate: true } : {}),
  };
}

function readBudgetScope(text: string): "total" | "per-person" | undefined {
  if (/\bper\s+(?:person|head|attendee|guest)\b/i.test(text) || /\ba\s+head\b/i.test(text)) {
    return "per-person";
  }
  if (/\b(?:in\s+total|overall|total)\b/i.test(text)) {
    return "total";
  }
  return undefined;
}

function readMoney(text: string): { amount: number; currency: string } | undefined {
  for (const match of text.matchAll(/(€|\$|£)\s*(\d+(?:[.,]\d+)?)/g)) {
    const parsed = money(match[1] ?? "", match[2] ?? "");
    if (parsed !== undefined) {
      return parsed;
    }
  }
  for (const match of text.matchAll(/\b([A-Za-z]{3})\s*(\d+(?:[.,]\d+)?)\b/g)) {
    const parsed = money(match[1] ?? "", match[2] ?? "");
    if (parsed !== undefined) {
      return parsed;
    }
  }
  for (const match of text.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(€|\$|£|[A-Za-z]+)\b/g)) {
    const parsed = money(match[2] ?? "", match[1] ?? "");
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
}

function money(currencyToken: string, amountToken: string): { amount: number; currency: string } | undefined {
  const currency = currencyCode(currencyToken);
  const amount = parseAmount(amountToken);
  if (currency === undefined || amount === undefined) {
    return undefined;
  }
  return { amount, currency };
}

function currencyCode(token: string): string | undefined {
  if (token === "€") {
    return "EUR";
  }
  if (token === "$") {
    return "USD";
  }
  if (token === "£") {
    return "GBP";
  }
  return currencyWords[token.toLowerCase()];
}

function parseAmount(raw: string): number | undefined {
  const normalised = raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw.replace(/,/g, "");
  const amount = Number(normalised);
  if (!Number.isFinite(amount) || amount < 0) {
    return undefined;
  }
  return amount;
}

function collectIsoDates(text: string): string[] {
  const found: { index: number; end: number; iso: string }[] = [];
  const remember = (match: RegExpMatchArray, iso: string) => {
    const index = match.index;
    const span = match[0];
    if (index === undefined) {
      return;
    }
    const end = index + span.length;
    const overlaps = found.some((item) => index < item.end && end > item.index);
    if (overlaps) {
      return;
    }
    found.push({ index, end, iso });
  };
  for (const match of text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)) {
    if (match[1]) {
      remember(match, match[1]);
    }
  }
  const dayFirst = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthToken})\\s+(\\d{4})\\b`,
    "gi",
  );
  for (const match of text.matchAll(dayFirst)) {
    if (match[1] && match[2] && match[3]) {
      remember(match, toIsoDate(match[3], match[2], match[1]));
    }
  }
  const monthFirst = new RegExp(
    `\\b(${monthToken})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`,
    "gi",
  );
  for (const match of text.matchAll(monthFirst)) {
    if (match[1] && match[2] && match[3]) {
      remember(match, toIsoDate(match[3], match[1], match[2]));
    }
  }
  found.sort((left, right) => left.index - right.index);
  return found.map((item) => item.iso);
}

function toIsoDate(year: string, monthName: string, day: string): string {
  const month = monthIndexByName[monthName.toLowerCase()];
  if (month === undefined) {
    return `${year}-01-01`;
  }
  return `${year}-${month}-${day.padStart(2, "0")}`;
}
