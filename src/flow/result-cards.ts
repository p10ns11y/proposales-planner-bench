import { z } from "zod";
import { comparisonRowSchema, type ComparisonRow } from "../domain/comparison-row";
import { holdLine } from "./utterance";

export const steerBackLine = "Let's get back to planning the event.";

export const cannotNarrowLine = "I can't narrow that list. Tell me what to change.";

export const resultCardSchema = z.object({
  id: z.string().min(1),
  query: z.string(),
  summary: z.string(),
  rows: z.array(comparisonRowSchema),
});

export type ResultCard = z.infer<typeof resultCardSchema>;

export type CardRecord = "seed" | "append" | "refresh";

export type NarrowOutcome = { kind: "card"; rows: ComparisonRow[] } | { kind: "reply"; text: string };

const twoRequest = /^\s*(?:please\s+)?pick only two\s*\.?\s*$/i;

export function asksForTwo(text: string): boolean {
  return twoRequest.test(text);
}

export function twoRowSlice<T>(rows: readonly T[]): T[] | null {
  if (rows.length < 3) {
    return null;
  }
  return rows.slice(0, 2);
}

export function narrowToTwo(rows: readonly ComparisonRow[]): NarrowOutcome {
  const sliced = twoRowSlice(rows);
  if (sliced === null) {
    return { kind: "reply", text: cannotNarrowLine };
  }
  return { kind: "card", rows: sliced };
}

export function holdReply(hasCards: boolean): string {
  if (hasCards) {
    return steerBackLine;
  }
  return holdLine;
}

export function cardSummary(input: {
  count: number;
  city: string | undefined;
  attendees: number | undefined;
}): string {
  const offer = input.count === 1 ? "offer" : "offers";
  const parts = [`${input.count} ${offer}`];
  if (hasText(input.city)) {
    parts.push(input.city);
  }
  if (input.attendees !== undefined) {
    parts.push(guestCount(input.attendees));
  }
  return parts.join(" · ");
}

export function nextResultCard(
  cards: readonly ResultCard[],
  query: string,
  rows: readonly ComparisonRow[],
  summary: string,
): ResultCard {
  return {
    id: `result-${cards.length + 1}`,
    query,
    summary,
    rows: [...rows],
  };
}

export function withResultCard(cards: readonly ResultCard[], card: ResultCard): ResultCard[] {
  return [...cards, card];
}

export function rewriteLatestCard(
  cards: readonly ResultCard[],
  rows: readonly ComparisonRow[],
  summary: string,
): ResultCard[] {
  const latest = cards.at(-1);
  if (latest === undefined) {
    return [...cards];
  }
  const next = { ...latest, rows: [...rows], summary };
  return [...cards.slice(0, -1), next];
}

export function rememberRank(input: {
  cards: readonly ResultCard[];
  rows: readonly ComparisonRow[];
  visibleRowCount: number;
  record: CardRecord;
  query: string;
  activeQuery: string;
  city: string | undefined;
  attendees: number | undefined;
}): ResultCard[] {
  const visible = input.rows.slice(0, input.visibleRowCount);
  const summary = cardSummary({
    count: visible.length,
    city: input.city,
    attendees: input.attendees,
  });
  if (input.record === "refresh") {
    return rewriteLatestCard(input.cards, visible, summary);
  }
  if (keepsSeed(input.record, input.cards.length)) {
    return [...input.cards];
  }
  const card = nextResultCard(input.cards, rankQuery(input.query, input.activeQuery), visible, summary);
  return withResultCard(input.cards, card);
}

function hasText(value: string | undefined): value is string {
  return value !== undefined && value !== "";
}

function guestCount(attendees: number): string {
  const guest = attendees === 1 ? "guest" : "guests";
  return `${attendees} ${guest}`;
}

function keepsSeed(record: CardRecord, count: number): boolean {
  return record === "seed" && count > 0;
}

function rankQuery(query: string, activeQuery: string): string {
  const trimmed = query.trim();
  if (trimmed === "") {
    return activeQuery;
  }
  return trimmed;
}
