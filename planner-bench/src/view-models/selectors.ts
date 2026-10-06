import type { MinorUnits } from "../domain/minor-units";
import type { PlannerBrief } from "../domain/planner-brief";
import type { PlannerSnapshot } from "../flow/planner-snapshot";
import type { CaptureViewModel, ResultsViewModel } from "./view-model";

export function formatMinorUnits(value: MinorUnits, currency: string): string {
  const negative = value.amount < 0;
  const absolute = Math.abs(value.amount);
  const major = Math.floor(absolute / 100);
  const minor = String(absolute % 100).padStart(2, "0");
  const sign = negative ? "-" : "";
  const currencyLabel = currency === "" ? "" : ` ${currency}`;
  return `${sign}${major}.${minor}${currencyLabel}`;
}

export function captureViewModel(input: {
  snapshot: PlannerSnapshot | null;
  busy: boolean;
  errorText: string | null;
  speechAvailable: boolean;
}): CaptureViewModel {
  const snapshot = input.snapshot;
  return {
    phase: snapshot?.phase ?? "capture",
    busy: input.busy,
    ready: snapshot !== null,
    errorText: input.errorText,
    speechAvailable: input.speechAvailable,
    nextQuestion: snapshot?.nextQuestion ?? "",
    briefFields: briefFields(snapshot?.brief ?? {}),
    briefLines: briefLines(snapshot),
  };
}

export function resultsViewModel(snapshot: PlannerSnapshot | null): ResultsViewModel {
  const rows = (snapshot?.grid ?? []).map((row) => ({
    venueName: row.venueName,
    heldByCompanyName: row.heldByCompanyName ?? null,
    rooms: formatMinorUnits(row.roomsMinor, row.currency),
    foodAndBeverage: formatMinorUnits(row.foodAndBeverageMinor, row.currency),
    space: formatMinorUnits(row.spaceMinor, row.currency),
    extras: formatMinorUnits(row.extrasMinor, row.currency),
    total: formatMinorUnits(row.totalMinor, row.currency),
    expires: row.expiresAt === undefined ? "No expiry" : row.expiresAt.slice(0, 10),
    gaps: row.gaps,
    favorite: row.favorite,
  }));
  const visibleRowCount = snapshot?.visibleRowCount ?? 5;
  const visibleRows = rows.slice(0, visibleRowCount);
  const openVenueName = snapshot?.openVenueName ?? null;
  const openRow = openVenueName === null ? null : (rows.find((row) => row.venueName === openVenueName) ?? null);
  return {
    phase: snapshot?.phase ?? "capture",
    rows: visibleRows,
    hiddenCount: Math.max(0, rows.length - visibleRows.length),
    openRow,
  };
}

function briefFields(brief: PlannerBrief): CaptureViewModel["briefFields"] {
  return {
    eventTitle: brief.eventTitle ?? "",
    contactEmail: brief.contactEmail ?? "",
    organisationName: brief.organisationName ?? "",
    startDate: brief.startDate ?? "",
    endDate: brief.endDate ?? "",
    attendeeCount: brief.attendeeCount === undefined ? "" : String(brief.attendeeCount),
    roomCount: brief.roomCount === undefined ? "" : String(brief.roomCount),
    meetingRoomCount: brief.meetingRoomCount === undefined ? "" : String(brief.meetingRoomCount),
    city: brief.city ?? "",
    language: brief.language ?? "",
    foodRequired:
      brief.foodRequired === undefined ? "" : brief.foodRequired ? "yes" : "no",
    notes: brief.notes ?? "",
  };
}

function briefLines(snapshot: PlannerSnapshot | null): CaptureViewModel["briefLines"] {
  if (snapshot === null) {
    return [];
  }
  const brief = snapshot.brief;
  const lines: CaptureViewModel["briefLines"] = [];
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

function pushLine(lines: CaptureViewModel["briefLines"], label: string, value: string | undefined) {
  if (value === undefined || value === "") {
    return;
  }
  lines.push({ label, value });
}
