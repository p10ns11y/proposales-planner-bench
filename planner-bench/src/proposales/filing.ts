import type { BriefDraft, FilingPath } from "./types";

export function filingPath(inboxToken: string | null): FilingPath {
  if (inboxToken === null || inboxToken === "") {
    return "draft";
  }
  return "inbox";
}

export function inboxBody(brief: BriefDraft): Record<string, string> {
  const body: Record<string, string> = {
    email: brief.email,
    company_name: brief.companyName,
    message: brief.message,
    language: brief.language,
    is_test: "1",
  };
  if (brief.startDate !== null) {
    body.start_date = brief.startDate;
  }
  if (brief.endDate !== null) {
    body.end_date = brief.endDate;
  }
  if (brief.eventTitle !== undefined) {
    body.event_title = brief.eventTitle;
  }
  if (brief.city !== undefined) {
    body.city = brief.city;
  }
  if (brief.attendeeCount !== undefined) {
    body.attendee_count = String(brief.attendeeCount);
  }
  if (brief.roomCount !== undefined) {
    body.room_count = String(brief.roomCount);
  }
  if (brief.meetingRoomCount !== undefined) {
    body.meeting_room_count = String(brief.meetingRoomCount);
  }
  if (brief.foodRequired !== undefined) {
    body.food_required = brief.foodRequired ? "yes" : "no";
  }
  return body;
}

export function draftBody(brief: BriefDraft): {
  company_id: number;
  language: string;
  title_md: string;
  data: Record<string, string>;
} {
  return {
    company_id: brief.companyId,
    language: brief.language,
    title_md: brief.eventTitle ?? brief.message,
    data: inboxBody(brief),
  };
}
