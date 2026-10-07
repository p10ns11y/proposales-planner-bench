import {
  bestNonExpiredIndex,
  dayPriceNote,
  expiresLabel,
  offerGroupPartSchema,
  offerPartSchema,
  type OfferGroupPart,
  type OfferPart,
} from "../contract/offer-group";
import type { ShellRow, ShellViewModel } from "./view-model";

export function offerGroupFromShell(view: ShellViewModel): OfferGroupPart | null {
  if (view.phase !== "results" || view.rows.length === 0 || view.offerSummary === null) {
    return null;
  }
  const bestIndex = bestNonExpiredIndex(view.rows);
  const summary = summaryParts(view.offerSummary);
  return offerGroupPartSchema.parse({
    summary: {
      count: summary.count,
      city: summary.city,
      dateLabel: summary.dateLabel,
      people: summary.people,
      line: view.offerSummary,
    },
    offers: view.rows.map((row, index) => offerPartFromRow(row, index === bestIndex)),
    footer: dayPriceNote,
    sampleData: view.offerLabel === "Sample offers",
    sourceLabel: view.offerLabel,
  });
}

export function offerPartFromRow(row: ShellRow, bestMatch: boolean): OfferPart {
  const expired = row.gaps.includes("expired");
  return offerPartSchema.parse({
    proposalUuid: row.proposalUuid === "" ? row.venueName : row.proposalUuid,
    venueName: row.venueName,
    heldByCompanyName: row.heldByCompanyName,
    total: row.totalMinor,
    currency: row.currency,
    rooms: row.roomsMinor,
    foodAndBeverage: row.foodMinor,
    space: row.spaceMinor,
    extras: row.extrasMinor,
    expires: row.expires,
    expiresLabel: expiresLabel(row.expires, expired),
    gaps: row.gaps,
    bestMatch: bestMatch && !expired,
    favorite: row.favorite,
    blocks: row.blocks,
  });
}

function summaryParts(line: string): {
  count: number;
  city: string | null;
  dateLabel: string | null;
  people: number | null;
} {
  const pieces = line.split(" · ");
  const countMatch = /^(\d+)/.exec(pieces[0] ?? "");
  const count = countMatch?.[1] === undefined ? pieces.length : Number(countMatch[1]);
  const city = pieces[1] ?? null;
  const dateLabel = pieces.length > 3 ? (pieces[2] ?? null) : null;
  const peoplePiece = pieces[pieces.length - 1] ?? "";
  const peopleMatch = /^(\d+)\s+guest/.exec(peoplePiece);
  const people = peopleMatch?.[1] === undefined ? null : Number(peopleMatch[1]);
  return { count, city, dateLabel, people };
}
