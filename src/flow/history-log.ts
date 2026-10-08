import { z } from "zod";
import type { PlannerBrief } from "../domain/planner-brief";
import { plannerSnapshotSchema, type PlannerSnapshot } from "./planner-snapshot";

const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const historyEntrySchema = z.object({
  id: z.string(),
  savedAt: z.string(),
  title: z.string(),
  stage: z.string(),
  venueCount: z.number(),
  filedCount: z.number().int().nonnegative().default(1),
  snapshot: plannerSnapshotSchema,
});

export type HistoryEntry = z.infer<typeof historyEntrySchema>;

export const historyLogSchema = z.array(historyEntrySchema);

export const historyStorageKey = "planner-bench.history";

export function historyTitle(brief: PlannerBrief): string {
  const title = clean(brief.eventTitle);
  if (title !== "") {
    return title;
  }
  const kind = eventKind(brief);
  const city = clean(brief.city);
  if (kind !== "" && city !== "") {
    return `${kind} in ${city}`;
  }
  const date = historyDate(brief.startDate);
  if (city !== "" && date !== "") {
    return `${city}, ${date}`;
  }
  if (kind !== "") {
    return kind;
  }
  if (city !== "") {
    return city;
  }
  if (date !== "") {
    return date;
  }
  return "Untitled brief";
}

export function upsertHistory(
  entries: HistoryEntry[],
  snapshot: PlannerSnapshot,
  savedAt: string,
): HistoryEntry[] {
  if (snapshot.filing === null && snapshot.offers.length === 0) {
    return entries;
  }
  const id = snapshot.chatId;
  const previous = entries.find((existing) => existing.id === id);
  const entry: HistoryEntry = {
    id,
    savedAt,
    title: historyTitle(snapshot.brief),
    stage: snapshot.stage,
    venueCount: snapshot.offers.length,
    filedCount: nextFiledCount(previous, snapshot),
    snapshot,
  };
  return [entry, ...entries.filter((existing) => existing.id !== id)];
}

export function readHistoryLog(value: unknown): HistoryEntry[] {
  const parsed = historyLogSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

function nextFiledCount(previous: HistoryEntry | undefined, snapshot: PlannerSnapshot): number {
  const prior = previous?.filedCount ?? 0;
  if (snapshot.filing === null) {
    return prior;
  }
  if (previous !== undefined && sameFiling(previous.snapshot.filing, snapshot.filing)) {
    return Math.max(prior, 1);
  }
  return prior + 1;
}

function sameFiling(
  left: PlannerSnapshot["filing"],
  right: PlannerSnapshot["filing"],
): boolean {
  if (left === null || right === null || left.path !== right.path) {
    return false;
  }
  if (left.path === "inbox" && right.path === "inbox") {
    return left.id === right.id;
  }
  if (left.path === "draft" && right.path === "draft") {
    return left.uuid === right.uuid;
  }
  return false;
}

function eventKind(brief: PlannerBrief): string {
  const meal = brief.foodRequest?.meal;
  if (meal === "breakfast") {
    return "Breakfast";
  }
  if (meal === "lunch") {
    return "Lunch";
  }
  if (meal === "dinner") {
    return "Dinner";
  }
  if ((brief.meetingRoomCount ?? 0) > 0) {
    return "Meeting";
  }
  if ((brief.roomCount ?? 0) > 0) {
    return "Stay";
  }
  return "";
}

function historyDate(value: string | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (match === null) {
    return "";
  }
  const month = shortMonths[Number(match[2]) - 1];
  if (month === undefined) {
    return "";
  }
  return `${Number(match[3])} ${month}`;
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}
