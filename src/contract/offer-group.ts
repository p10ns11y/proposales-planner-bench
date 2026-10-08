import { z } from "zod";

export const dayPriceNote = "Prices are totals for the day, excl. VAT";

export const offerBlockPartSchema = z.object({
  title: z.string(),
  quantity: z.number(),
});

export const offerPartSchema = z.object({
  proposalUuid: z.string(),
  venueName: z.string(),
  heldByCompanyName: z.string().nullable(),
  total: z.number(),
  currency: z.string(),
  rooms: z.number(),
  foodAndBeverage: z.number(),
  space: z.number(),
  extras: z.number(),
  expires: z.string(),
  expiresLabel: z.string(),
  gaps: z.array(z.string()),
  neutral: z.array(z.string()).optional(),
  bestMatch: z.boolean(),
  favorite: z.boolean(),
  blocks: z.array(offerBlockPartSchema),
});

export const offerGroupPartSchema = z.object({
  summary: z.object({
    count: z.number(),
    city: z.string().nullable(),
    dateLabel: z.string().nullable(),
    people: z.number().nullable(),
    line: z.string(),
  }),
  offers: z.array(offerPartSchema),
  footer: z.string(),
  sampleData: z.boolean(),
  sourceLabel: z.string().nullable(),
});

export type OfferPart = z.infer<typeof offerPartSchema>;
export type OfferGroupPart = z.infer<typeof offerGroupPartSchema>;

export type BreakdownLine = {
  key: "rooms" | "foodAndBeverage" | "space" | "extras" | "other";
  label: string;
  amountMinor: number;
  text: string;
};

const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatOfferPrice(amountMinor: number, currency: string): string {
  const negative = amountMinor < 0;
  const absolute = Math.abs(amountMinor);
  const major = Math.floor(absolute / 100);
  const minor = absolute % 100;
  const sign = negative ? "-" : "";
  const body = minor === 0 ? String(major) : `${major}.${String(minor).padStart(2, "0")}`;
  const amount = `${sign}${body}`;
  return currency === "" ? amount : `${currency} ${amount}`;
}

export function bestNonExpiredIndex(offers: { gaps: string[] }[]): number {
  return offers.findIndex((offer) => !offer.gaps.includes("expired"));
}

export function showCompareToggle(offerCount: number, containerWidth: number): boolean {
  return offerCount >= 2 && offerCount <= 3 && containerWidth >= 640;
}

export function offerBreakdown(
  offer: {
    rooms: number;
    foodAndBeverage: number;
    space: number;
    extras: number;
    total: number;
    currency: string;
    gaps: string[];
  },
  includeExtras: boolean,
): BreakdownLine[] {
  const lines: BreakdownLine[] = [
    breakdownLine("rooms", "Rooms", offer.rooms, offer),
    breakdownLine("foodAndBeverage", "Food", offer.foodAndBeverage, offer),
    breakdownLine("space", "Space", offer.space, offer),
  ];
  if (includeExtras) {
    lines.push(breakdownLine("extras", "Extras", offer.extras, offer));
  }
  const shown = lines.reduce((sum, line) => sum + line.amountMinor, 0);
  const remainder = offer.total - shown;
  if (remainder !== 0) {
    lines.push({
      key: "other",
      label: "Other",
      amountMinor: remainder,
      text: formatOfferPrice(remainder, offer.currency),
    });
  }
  return lines;
}

export function breakdownSumsToTotal(lines: BreakdownLine[], total: number): boolean {
  return lines.reduce((sum, line) => sum + line.amountMinor, 0) === total;
}

export function placesSentence(rows: { venueName: string; gaps: string[] }[]): string {
  if (rows.length === 0) {
    return "No places fit that brief yet.";
  }
  const bestIndex = bestNonExpiredIndex(rows);
  const best = bestIndex < 0 ? null : rows[bestIndex];
  const expired = rows
    .filter((row) => row.gaps.includes("expired"))
    .map((row) => `${row.venueName}\u2019s offer has expired`);
  const others: string[] = [];
  for (const row of rows) {
    if (row.gaps.includes("foodAndBeverage")) {
      others.push(`${row.venueName} has no food included`);
    }
    if (row.gaps.includes("space")) {
      others.push(`${row.venueName} has no meeting space`);
    }
    if (row.gaps.includes("rooms")) {
      others.push(`${row.venueName} has no rooms`);
    }
  }
  const rest = [...expired, ...others];
  const lead = countLead(rows.length);
  if (best === undefined || best === null) {
    return rest.length === 0 ? lead : `${lead} ${joinClauses(rest)}.`;
  }
  const bestClause = `${best.venueName} is the best match`;
  if (rest.length === 0) {
    return `${lead} ${bestClause}.`;
  }
  return `${lead} ${bestClause}; ${joinClauses(rest)}.`;
}

export function expiresLabel(expires: string, expired: boolean): string {
  if (expires === "No expiry") {
    return "No expiry";
  }
  const pretty = prettyDate(expires);
  if (pretty === "") {
    return expired ? "Expired" : expires;
  }
  return expired ? `Expired ${pretty}` : `Expires ${pretty}`;
}

function breakdownLine(
  key: BreakdownLine["key"],
  label: string,
  amountMinor: number,
  offer: { currency: string; gaps: string[] },
): BreakdownLine {
  const gap =
    key === "rooms" ? "rooms" : key === "foodAndBeverage" ? "foodAndBeverage" : key === "space" ? "space" : null;
  const missing = gap !== null && offer.gaps.includes(gap);
  const text = missing ? "Not included" : amountMinor === 0 ? "\u2014" : formatOfferPrice(amountMinor, offer.currency);
  return { key, label, amountMinor, text };
}

function countLead(count: number): string {
  const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const word = words[count] ?? String(count);
  return count === 1 ? `${word} place fits.` : `${word} places fit.`;
}

function joinClauses(parts: string[]): string {
  if (parts.length <= 1) {
    return parts[0] ?? "";
  }
  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function prettyDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    return "";
  }
  const month = monthShort[Number(match[2]) - 1];
  if (month === undefined) {
    return "";
  }
  return `${Number(match[3])} ${month} ${match[1]}`;
}
