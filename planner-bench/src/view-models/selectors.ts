import type { MinorUnits } from "../domain/minor-units";
import type { PlannerSnapshot } from "../flow/planner-snapshot";
import type { ChatViewModel, ResultsViewModel } from "./view-model";

export function formatMinorUnits(value: MinorUnits, currency: string): string {
  const negative = value.amount < 0;
  const absolute = Math.abs(value.amount);
  const major = Math.floor(absolute / 100);
  const minor = String(absolute % 100).padStart(2, "0");
  const sign = negative ? "-" : "";
  const currencyLabel = currency === "" ? "" : ` ${currency}`;
  return `${sign}${major}.${minor}${currencyLabel}`;
}

export function chatViewModel(input: {
  snapshot: PlannerSnapshot | null;
  messages: ChatViewModel["messages"];
  busy: boolean;
  errorText: string | null;
  speechAvailable: boolean;
}): ChatViewModel {
  const snapshot = input.snapshot;
  return {
    stage: snapshot?.stage ?? "collecting",
    nextQuestion: snapshot?.nextQuestion ?? "",
    busy: input.busy,
    ready: snapshot !== null,
    errorText: input.errorText,
    speechAvailable: input.speechAvailable,
    companies: (snapshot?.companies ?? []).map((company) => ({
      id: company.id,
      name: company.name,
      filingPath: company.inboxToken === null || company.inboxToken === "" ? "draft" : "inbox",
    })),
    selectedCompanyId: snapshot?.selectedCompanyId ?? null,
    briefLines: briefLines(snapshot),
    messages: input.messages,
  };
}

export function resultsViewModel(snapshot: PlannerSnapshot | null): ResultsViewModel {
  return {
    rows: (snapshot?.grid ?? []).map((row) => ({
      venueName: row.venueName,
      rooms: formatMinorUnits(row.roomsMinor, row.currency),
      foodAndBeverage: formatMinorUnits(row.foodAndBeverageMinor, row.currency),
      space: formatMinorUnits(row.spaceMinor, row.currency),
      extras: formatMinorUnits(row.extrasMinor, row.currency),
      total: formatMinorUnits(row.totalMinor, row.currency),
      expires: row.expiresAt === undefined ? "No expiry" : row.expiresAt.slice(0, 10),
      gaps: row.gaps,
    })),
  };
}

function briefLines(snapshot: PlannerSnapshot | null): ChatViewModel["briefLines"] {
  if (snapshot === null) {
    return [];
  }
  const brief = snapshot.brief;
  const lines: ChatViewModel["briefLines"] = [];
  pushLine(lines, "Event", brief.eventTitle);
  pushLine(lines, "Email", brief.contactEmail);
  pushLine(lines, "Organisation", brief.organisationName);
  pushLine(lines, "Start", brief.startDate);
  pushLine(lines, "End", brief.endDate);
  pushLine(lines, "Attendees", brief.attendeeCount?.toString());
  pushLine(lines, "Rooms", brief.roomCount?.toString());
  pushLine(lines, "Meeting rooms", brief.meetingRoomCount?.toString());
  pushLine(lines, "City", brief.city);
  pushLine(lines, "Language", brief.language);
  if (brief.foodRequired !== undefined) {
    pushLine(lines, "Food", brief.foodRequired ? "yes" : "no");
  }
  if (brief.budgetMinor !== undefined) {
    pushLine(lines, "Budget", formatMinorUnits(brief.budgetMinor, ""));
  }
  return lines;
}

function pushLine(lines: ChatViewModel["briefLines"], label: string, value: string | undefined) {
  if (value === undefined || value === "") {
    return;
  }
  lines.push({ label, value });
}
