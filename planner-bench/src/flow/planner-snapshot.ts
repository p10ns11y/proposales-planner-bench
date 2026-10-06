import { z } from "zod";
import { comparisonRowSchema } from "../domain/comparison-row";
import { plannerBriefSchema } from "../domain/planner-brief";
import { venueOfferSchema } from "../domain/venue-offer";
import type { BriefStage } from "./brief-flow";

export const viewportPhaseSchema = z.enum(["capture", "confirm", "favorites", "results"]);

export type ViewportPhase = z.infer<typeof viewportPhaseSchema>;

export const companyRecordSchema = z.object({
  id: z.number(),
  name: z.string(),
  inboxToken: z.string().nullable(),
});

export const fileBriefResultSchema = z.discriminatedUnion("path", [
  z.object({ path: z.literal("inbox"), id: z.number() }),
  z.object({ path: z.literal("draft"), uuid: z.string() }),
]);

export const plannerSnapshotSchema = z.object({
  brief: plannerBriefSchema,
  stage: z.enum(["collecting", "fileable", "filed", "comparing"]),
  phase: viewportPhaseSchema,
  offers: z.array(venueOfferSchema),
  filing: fileBriefResultSchema.nullable(),
  gaps: z.array(z.string()),
  nextQuestion: z.string(),
  companies: z.array(companyRecordSchema),
  selectedCompanyId: z.number().nullable(),
  grid: z.array(comparisonRowSchema),
  favoriteVenueNames: z.array(z.string()),
  visibleRowCount: z.number().int().positive(),
  openVenueName: z.string().nullable(),
});

export type PlannerSnapshot = z.infer<typeof plannerSnapshotSchema>;

export const defaultVisibleRowCount = 5;

export function emptySnapshot(
  companies: PlannerSnapshot["companies"],
  nextQuestion: string,
  gaps: string[],
): PlannerSnapshot {
  const firstCompany = companies[0];
  return {
    brief: {},
    stage: "collecting" satisfies BriefStage,
    phase: "capture",
    offers: [],
    filing: null,
    gaps,
    nextQuestion,
    companies,
    selectedCompanyId: firstCompany === undefined ? null : firstCompany.id,
    grid: [],
    favoriteVenueNames: [],
    visibleRowCount: defaultVisibleRowCount,
    openVenueName: null,
  };
}
