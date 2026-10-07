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

export const plannerBenchBriefKey = "planner_bench_brief";

export function isPlannerBenchBrief(data: unknown): boolean {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  return Reflect.get(data, plannerBenchBriefKey) === true;
}

export const draftCreatedNotice = "A draft was created in Proposales.";

export const filingUnavailableNotice = "Filing is unavailable right now.";

export function draftTitle(brief: BriefDraft): string {
  const eventTitle = brief.eventTitle?.trim() ?? "";
  if (eventTitle !== "") {
    return eventTitle;
  }
  const city = brief.city?.trim() ?? "";
  const date = brief.startDate === null ? "" : brief.startDate.slice(0, 10);
  if (city !== "" && date !== "") {
    return `${city}, ${date}`;
  }
  if (city !== "") {
    return city;
  }
  if (date !== "") {
    return date;
  }
  const message = brief.message.trim();
  return message === "" ? "Event" : message;
}

export function draftBody(brief: BriefDraft): {
  company_id: number;
  language: string;
  title_md: string;
  data: Record<string, string | boolean>;
} {
  return {
    company_id: brief.companyId,
    language: brief.language,
    title_md: draftTitle(brief),
    data: {
      ...inboxBody(brief),
      [plannerBenchBriefKey]: true,
    },
  };
}
