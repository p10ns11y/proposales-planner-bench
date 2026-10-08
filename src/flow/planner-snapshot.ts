import { z } from "zod";
import { comparisonRowSchema } from "../domain/comparison-row";
import { plannerBriefSchema } from "../domain/planner-brief";
import { venueOfferSchema } from "../domain/venue-offer";
import type { BriefStage } from "./brief-flow";
import { companiesForClient, companyRecordSchema, type ClientCompany } from "./client-company";

export const viewportPhaseSchema = z.enum(["capture", "confirm", "favorites", "results"]);

export type ViewportPhase = z.infer<typeof viewportPhaseSchema>;

export const fileBriefResultSchema = z.discriminatedUnion("path", [
  z.object({ path: z.literal("inbox"), id: z.number() }),
  z.object({ path: z.literal("draft"), uuid: z.string() }),
]);

export const newEventOfferSchema = z.object({
  label: z.string(),
});

export const plannerSnapshotSchema = z.object({
  chatId: z.string().min(1).default("chat"),
  brief: plannerBriefSchema,
  stage: z.enum(["collecting", "fileable", "filed", "comparing"]),
  phase: viewportPhaseSchema,
  offers: z.array(venueOfferSchema),
  filing: fileBriefResultSchema.nullable(),
  filingKey: z.string().nullable().default(null),
  newEvent: newEventOfferSchema.nullable().default(null),
  inlinePaused: z.boolean().default(false),
  gaps: z.array(z.string()),
  nextQuestion: z.string(),
  companies: z.array(companyRecordSchema),
  selectedCompanyId: z.number().nullable(),
  grid: z.array(comparisonRowSchema),
  favoriteVenueNames: z.array(z.string()),
  visibleRowCount: z.number().int().positive(),
  openVenueName: z.string().nullable(),
  notice: z.string().nullable().default(null),
  sampleOffers: z.boolean().default(false),
  offerSource: z.enum(["fixture", "live", "sample"]).default("fixture"),
  filingAvailable: z.boolean().default(true),
});

export type PlannerSnapshot = z.infer<typeof plannerSnapshotSchema>;

export const defaultVisibleRowCount = 5;

export function emptySnapshot(
  companies: readonly ClientCompany[],
  nextQuestion: string,
  gaps: string[],
): PlannerSnapshot {
  const listed = companiesForClient(companies);
  const firstCompany = listed[0];
  return {
    chatId: newChatId(),
    brief: {},
    newEvent: null,
    inlinePaused: false,
    stage: "collecting" satisfies BriefStage,
    phase: "capture",
    offers: [],
    filing: null,
    filingKey: null,
    gaps,
    nextQuestion,
    companies: listed,
    selectedCompanyId: firstCompany === undefined ? null : firstCompany.id,
    grid: [],
    favoriteVenueNames: [],
    visibleRowCount: defaultVisibleRowCount,
    openVenueName: null,
    notice: null,
    sampleOffers: false,
    offerSource: "fixture",
    filingAvailable: true,
  };
}

export function newChatId(): string {
  return crypto.randomUUID();
}

export function snapshotForClient(snapshot: PlannerSnapshot): PlannerSnapshot {
  return {
    ...snapshot,
    companies: companiesForClient(snapshot.companies),
  };
}
