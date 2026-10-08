import type { PlannerBrief } from "../domain/planner-brief";
import type { BriefDraft } from "../proposales/types";

export function briefDraftFromPlanner(brief: PlannerBrief, companyId: number): BriefDraft {
  return {
    email: brief.contactEmail ?? "",
    companyId,
    companyName: brief.organisationName ?? "",
    message: brief.notes ?? brief.eventTitle ?? "",
    language: brief.language ?? "",
    startDate: brief.startDate === undefined ? null : clockStamp(brief.startDate, brief.startTime),
    endDate: brief.endDate === undefined ? null : clockStamp(brief.endDate, brief.endTime),
    eventTitle: brief.eventTitle,
    attendeeCount: brief.attendeeCount,
    roomCount: brief.roomCount,
    meetingRoomCount: brief.meetingRoomCount,
    city: brief.city,
    foodRequired: brief.foodRequired,
  };
}

function clockStamp(date: string, time: string | undefined): string {
  return `${date}T${time ?? "00:00"}:00.000Z`;
}
