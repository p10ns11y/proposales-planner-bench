import { z } from "zod";
import { plannerSnapshotSchema, type PlannerSnapshot } from "./planner-snapshot";

export const historyEntrySchema = z.object({
  id: z.string(),
  savedAt: z.string(),
  title: z.string(),
  stage: z.string(),
  venueCount: z.number(),
  snapshot: plannerSnapshotSchema,
});

export type HistoryEntry = z.infer<typeof historyEntrySchema>;

export const historyLogSchema = z.array(historyEntrySchema);

export const historyStorageKey = "planner-bench.history";

export function upsertHistory(
  entries: HistoryEntry[],
  snapshot: PlannerSnapshot,
  savedAt: string,
): HistoryEntry[] {
  if (snapshot.filing === null && snapshot.offers.length === 0) {
    return entries;
  }
  const entry: HistoryEntry = {
    id: historyId(snapshot),
    savedAt,
    title: snapshot.brief.eventTitle ?? "Untitled brief",
    stage: snapshot.stage,
    venueCount: snapshot.offers.length,
    snapshot,
  };
  return [entry, ...entries.filter((existing) => existing.id !== entry.id)];
}

function historyId(snapshot: PlannerSnapshot): string {
  if (snapshot.filing?.path === "inbox") {
    return `inbox-${snapshot.filing.id}`;
  }
  if (snapshot.filing?.path === "draft") {
    return `draft-${snapshot.filing.uuid}`;
  }
  return `offers-${snapshot.offers.map((offer) => offer.proposalUuid ?? offer.venueName).join("-")}`;
}

export function readHistoryLog(value: unknown): HistoryEntry[] {
  const parsed = historyLogSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}
