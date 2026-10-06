import { z } from "zod";
import { minorUnitsSchema } from "./minor-units";

export const plannerBriefSchema = z.object({
  eventTitle: z.string().optional(),
  contactEmail: z.string().optional(),
  organisationName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  attendeeCount: z.number().int().nonnegative().optional(),
  roomCount: z.number().int().nonnegative().optional(),
  meetingRoomCount: z.number().int().nonnegative().optional(),
  foodRequired: z.boolean().optional(),
  city: z.string().optional(),
  budgetMinor: minorUnitsSchema.optional(),
  notes: z.string().optional(),
  language: z.string().optional(),
});

export type PlannerBrief = z.infer<typeof plannerBriefSchema>;

export function stayNeedsRooms(brief: PlannerBrief): boolean {
  if (brief.startDate === undefined || brief.endDate === undefined) {
    return false;
  }
  return brief.endDate > brief.startDate;
}

export function mergeBrief(current: PlannerBrief, patch: PlannerBrief): PlannerBrief {
  return plannerBriefSchema.parse({
    eventTitle: patch.eventTitle ?? current.eventTitle,
    contactEmail: patch.contactEmail ?? current.contactEmail,
    organisationName: patch.organisationName ?? current.organisationName,
    startDate: patch.startDate ?? current.startDate,
    endDate: patch.endDate ?? current.endDate,
    attendeeCount: patch.attendeeCount ?? current.attendeeCount,
    roomCount: patch.roomCount ?? current.roomCount,
    meetingRoomCount: patch.meetingRoomCount ?? current.meetingRoomCount,
    foodRequired: patch.foodRequired ?? current.foodRequired,
    city: patch.city ?? current.city,
    budgetMinor: patch.budgetMinor ?? current.budgetMinor,
    notes: patch.notes ?? current.notes,
    language: patch.language ?? current.language,
  });
}
