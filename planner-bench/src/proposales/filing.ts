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
  return body;
}

export function draftBody(brief: BriefDraft): {
  company_id: number;
  language: string;
  title_md: string;
  data: Record<string, string>;
} {
  const data: Record<string, string> = {
    email: brief.email,
    company_name: brief.companyName,
    message: brief.message,
    language: brief.language,
  };
  if (brief.startDate !== null) {
    data.start_date = brief.startDate;
  }
  if (brief.endDate !== null) {
    data.end_date = brief.endDate;
  }
  return {
    company_id: brief.companyId,
    language: brief.language,
    title_md: brief.message,
    data,
  };
}
