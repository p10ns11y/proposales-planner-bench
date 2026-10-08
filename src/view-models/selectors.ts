import { questionForGap } from "../domain/fitness";
import { firstFileableGap, releaseStaleFiling } from "../flow/filing-guard";
import { inlineAskFor, leftUnfiledNote, type InlineField } from "../flow/inline-ask";
import { formatBudgetMajor, type MinorUnits } from "../domain/minor-units";
import { briefCurrency, type PlannerBrief } from "../domain/planner-brief";
import type { PlannerSnapshot } from "../flow/planner-snapshot";
import { briefFiledNotice, draftCreatedNotice, filingUnavailableNotice } from "../proposales/filing";
import { placesSentence } from "../contract/offer-group";
import { appendBudgetLine } from "./facts-line";
import type { ConfirmFactName, ConfirmRun, InlineAskView, MoreFieldValues, ResultsViewModel, ShellViewModel } from "./view-model";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const composerPlaceholder = "Describe the event: place, people, date, time";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMinorUnits(value: MinorUnits, currency: string): string {
  const negative = value.amount < 0;
  const absolute = Math.abs(value.amount);
  const major = Math.floor(absolute / 100);
  const minor = String(absolute % 100).padStart(2, "0");
  const sign = negative ? "-" : "";
  const currencyLabel = currency === "" ? "" : ` ${currency}`;
  return `${sign}${major}.${minor}${currencyLabel}`;
}

export function shellViewModel(input: {
  snapshot: PlannerSnapshot | null;
  busy: boolean;
  errorText: string | null;
  speechAvailable: boolean;
}): ShellViewModel {
  const snapshot = input.snapshot === null ? null : releaseStaleFiling(input.snapshot);
  const phase = snapshot?.phase ?? "capture";
  const brief = snapshot?.brief ?? {};
  const presented = briefPresentation(brief);
  const gaps = snapshot?.gaps ?? [];
  const readyToConfirm = phase === "confirm" && gaps.length === 0;
  const askingGap = phase === "confirm" && !readyToConfirm;
  const rows = rankedRows(snapshot);
  const visibleRowCount = snapshot?.visibleRowCount ?? 5;
  const visibleRows = phase === "results" ? rows.slice(0, visibleRowCount) : [];
  const offerCount = visibleRows.length;
  const openVenueName = snapshot?.openVenueName ?? null;
  const openRow = openVenueName === null ? null : (rows.find((row) => row.venueName === openVenueName) ?? null);
  const more = moreFields(brief);
  const question = snapshot?.nextQuestion ?? "";
  const inlineField = snapshot === null ? null : inlineAskFor(snapshot);
  return {
    phase,
    busy: input.busy,
    ready: snapshot !== null,
    errorText: input.errorText,
    speechAvailable: input.speechAvailable,
    ask: askText(phase, question, readyToConfirm, visibleRows, inlineField),
    askMark: snapshot?.gaps[0] === "budgetBasis" ? "budget-basis" : null,
    askLabelsComposer: phase === "capture" || askingGap || phase === "favorites" || phase === "results",
    notice: visibleNotice(snapshot),
    draftConfirmation: snapshot?.filing?.path === "draft" ? draftCreatedNotice : null,
    filingMessage: filingMessage(snapshot),
    inlineAsk: inlinePresentation(inlineField),
    newEventLabel: snapshot?.newEvent?.label ?? null,
    fileGap: fileGapOf(snapshot),
    filed: snapshot !== null && snapshot.filing !== null,
    offerLabel: offerLabel(snapshot, phase),
    factsSentence: presented.sentence,
    confirmRuns: presented.runs,
    showFacts: presented.sentence !== "" && (askingGap || readyToConfirm || phase === "favorites"),
    showConfirm: readyToConfirm,
    showFavorites: phase === "favorites" && inlineField === null,
    rows: visibleRows,
    hiddenCount: phase === "results" ? Math.max(0, rows.length - visibleRows.length) : 0,
    openRow,
    more,
    moreStamp: moreStamp(more),
    budgetCurrency: briefCurrency(brief),
    composerPlaceholder,
    offerSummary: offerSummary(brief, offerCount, phase),
    contextChips: phase === "results" ? briefContextChips(brief) : [],
    ...(inlineField === null
      ? inputHints(question)
      : { inputType: "text" as const, inputMode: "text" as const, autoComplete: undefined }),
  };
}

export function resultsViewModel(snapshot: PlannerSnapshot | null): ResultsViewModel {
  const rows = rankedRows(snapshot);
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

function rankedRows(snapshot: PlannerSnapshot | null): ResultsViewModel["rows"] {
  return (snapshot?.grid ?? []).map((row) => ({
    venueName: row.venueName,
    proposalUuid: row.proposalUuid ?? "",
    heldByCompanyName: row.heldByCompanyName ?? null,
    currency: row.currency,
    roomsMinor: row.roomsMinor.amount,
    foodMinor: row.foodAndBeverageMinor.amount,
    spaceMinor: row.spaceMinor.amount,
    extrasMinor: row.extrasMinor.amount,
    totalMinor: row.totalMinor.amount,
    rooms: formatMinorUnits(row.roomsMinor, row.currency),
    foodAndBeverage: formatMinorUnits(row.foodAndBeverageMinor, row.currency),
    space: formatMinorUnits(row.spaceMinor, row.currency),
    extras: formatMinorUnits(row.extrasMinor, row.currency),
    total: formatMinorUnits(row.totalMinor, row.currency),
    expires: row.expiresAt === undefined ? "No expiry" : row.expiresAt.slice(0, 10),
    gaps: row.gaps,
    neutral: row.neutral ?? [],
    favorite: row.favorite,
    blocks: row.blocks ?? [],
  }));
}

function offerLabel(snapshot: PlannerSnapshot | null, phase: ShellViewModel["phase"]): string | null {
  if (snapshot === null || phase !== "results") {
    return null;
  }
  if (snapshot.offerSource === "live") {
    return "Live offers";
  }
  if (snapshot.offerSource === "sample" || snapshot.sampleOffers) {
    return "Sample offers";
  }
  return null;
}

function visibleNotice(snapshot: PlannerSnapshot | null): string | null {
  const notice = noticeText(snapshot);
  if (notice !== null && (snapshot === null || !hideNotice(snapshot, notice))) {
    return notice;
  }
  if (snapshot?.filingAvailable === false) {
    return filingUnavailableNotice;
  }
  return null;
}

function hideNotice(snapshot: PlannerSnapshot, notice: string): boolean {
  const field = inlineAskFor(snapshot);
  if (field !== null && notice === questionForGap(field)) {
    return true;
  }
  return notice === questionForGap("endDate") && firstFileableGap(snapshot.brief) !== "endDate";
}

function filingMessage(snapshot: PlannerSnapshot | null): string | null {
  if (snapshot?.filing?.path === "draft") {
    return draftCreatedNotice;
  }
  if (snapshot?.filing?.path === "inbox") {
    return briefFiledNotice;
  }
  if (snapshot?.notice === leftUnfiledNote) {
    return leftUnfiledNote;
  }
  const gap = snapshot === null ? undefined : firstFileableGap(snapshot.brief);
  if (gap === undefined || gap === "contactEmail" || gap === "endDate") {
    return null;
  }
  return questionForGap(gap);
}

function inlinePresentation(field: InlineField | null): InlineAskView | null {
  if (field === "contactEmail") {
    return { field, inputType: "email", label: "Email" };
  }
  if (field === "endDate") {
    return { field, inputType: "date", label: "End date" };
  }
  if (field === "endTime") {
    return { field, inputType: "time", label: "End time" };
  }
  return null;
}

function fileGapOf(snapshot: PlannerSnapshot | null): string | null {
  if (snapshot === null || snapshot.filing !== null) {
    return null;
  }
  return firstFileableGap(snapshot.brief) ?? null;
}

function noticeText(snapshot: PlannerSnapshot | null): string | null {
  const notice = snapshot?.notice ?? null;
  if (notice === null) {
    return null;
  }
  if (snapshot?.filing?.path === "draft" && notice === draftCreatedNotice) {
    return null;
  }
  return notice;
}

function askText(
  phase: ShellViewModel["phase"],
  question: string,
  readyToConfirm: boolean,
  rows: ResultsViewModel["rows"],
  inlineField: InlineField | null,
): string {
  if (inlineField !== null && phase === "favorites") {
    return "";
  }
  if (inlineField !== null && phase === "confirm" && !readyToConfirm) {
    return "";
  }
  return askFor(phase, question, readyToConfirm, rows);
}

function askFor(
  phase: ShellViewModel["phase"],
  question: string,
  readyToConfirm: boolean,
  rows: ResultsViewModel["rows"],
): string {
  if (phase === "capture") {
    return "What are you planning?";
  }
  if (phase === "confirm" && !readyToConfirm) {
    return question;
  }
  if (phase === "confirm") {
    return "Does this brief look right?";
  }
  if (phase === "favorites") {
    return question === "" ? "Which places do you already have in mind? You can skip." : question;
  }
  return placesSentence(rows);
}

function offerSummary(brief: PlannerBrief, count: number, phase: ShellViewModel["phase"]): string | null {
  if (phase !== "results" || count === 0) {
    return null;
  }
  const parts = [`${count} ${count === 1 ? "offer" : "offers"}`];
  if (brief.city !== undefined && brief.city !== "") {
    parts.push(brief.city);
  }
  if (brief.startDate !== undefined) {
    const when = shortWeekday(brief.startDate);
    if (when !== "") {
      parts.push(when);
    }
  }
  if (brief.attendeeCount !== undefined) {
    const guests = brief.attendeeCount === 1 ? "guest" : "guests";
    parts.push(`${brief.attendeeCount} ${guests}`);
  }
  return parts.join(" · ");
}

function briefContextChips(brief: PlannerBrief): string[] {
  const chips: string[] = [];
  if (brief.city !== undefined && brief.city !== "") {
    chips.push(brief.city);
  }
  if (brief.attendeeCount !== undefined) {
    chips.push(brief.attendeeCount === 1 ? "1 person" : `${brief.attendeeCount} people`);
  }
  const when = contextWhen(brief);
  if (when !== "") {
    chips.push(when);
  }
  return chips;
}

function contextWhen(brief: PlannerBrief): string {
  const day = brief.startDate === undefined ? "" : shortWeekday(brief.startDate);
  const clocks =
    brief.startTime !== undefined && brief.endTime !== undefined ? `${brief.startTime}-${brief.endTime}` : "";
  if (day !== "" && clocks !== "") {
    return `${day} ${clocks}`;
  }
  return day;
}

function shortWeekday(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    return "";
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return "";
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = weekdays[date.getUTCDay()];
  const monthLabel = shortMonths[month - 1];
  if (weekday === undefined || monthLabel === undefined) {
    return "";
  }
  return `${weekday} ${day} ${monthLabel}`;
}

function briefPresentation(brief: PlannerBrief): { runs: ConfirmRun[]; sentence: string } {
  const parts: { name: ConfirmFactName; text: string }[] = [];
  if (brief.city !== undefined && brief.city !== "") {
    parts.push({ name: "city", text: brief.city });
  }
  const dated = datePhrase(brief);
  if (dated !== "") {
    parts.push({ name: "date", text: dated });
  }
  const clocks = clockPhrase(brief);
  if (clocks !== "") {
    parts.push({ name: "time", text: clocks });
  }
  if (brief.attendeeCount !== undefined) {
    parts.push({ name: "attendees", text: `${brief.attendeeCount} people` });
  }
  const runs: ConfirmRun[] = [];
  parts.forEach((part, index) => {
    if (index > 0) {
      runs.push({ kind: "text", text: ", ", inSentence: true });
    }
    runs.push({ kind: "fact", name: part.name, text: part.text, inSentence: true });
  });
  const assumption = brief.timeAssumption?.statement;
  if (assumption !== undefined && assumption !== "") {
    if (parts.length > 0) {
      runs.push({ kind: "text", text: ". ", inSentence: true });
    }
    runs.push({ kind: "text", text: assumption, inSentence: true });
  }
  appendBudgetLine(runs, brief);
  return {
    runs,
    sentence: runs
      .filter((run) => run.inSentence)
      .map((run) => run.text)
      .join(""),
  };
}

function datePhrase(brief: PlannerBrief): string {
  const start = brief.startDate === undefined ? "" : formatIsoDate(brief.startDate);
  const end =
    brief.endDate !== undefined && brief.endDate !== brief.startDate ? formatIsoDate(brief.endDate) : "";
  if (start !== "" && end !== "") {
    return `${start} to ${end}`;
  }
  return start;
}

function clockPhrase(brief: PlannerBrief): string {
  if (brief.startTime !== undefined && brief.endTime !== undefined) {
    return `${brief.startTime}\u2013${brief.endTime}`;
  }
  if (brief.startTime !== undefined && brief.durationMinutes !== undefined) {
    return `${brief.startTime}, ${durationPhrase(brief.durationMinutes)}`;
  }
  if (brief.startTime !== undefined) {
    return brief.startTime;
  }
  if (brief.durationMinutes !== undefined) {
    return durationPhrase(brief.durationMinutes);
  }
  return "";
}

function durationPhrase(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

function formatIsoDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    return value;
  }
  const month = monthNames[Number(match[2]) - 1];
  if (month === undefined) {
    return value;
  }
  return `${Number(match[3])} ${month} ${match[1]}`;
}

function moreFields(brief: PlannerBrief): MoreFieldValues {
  return {
    eventTitle: brief.eventTitle ?? "",
    organisationName: brief.organisationName ?? "",
    contactEmail: brief.contactEmail ?? "",
    city: brief.city ?? "",
    language: brief.language ?? "",
    startDate: brief.startDate ?? "",
    endDate: brief.endDate ?? "",
    startTime: brief.startTime ?? "",
    endTime: brief.endTime ?? "",
    attendeeCount: brief.attendeeCount === undefined ? "" : String(brief.attendeeCount),
    roomCount: brief.roomCount === undefined ? "" : String(brief.roomCount),
    meetingRoomCount: brief.meetingRoomCount === undefined ? "" : String(brief.meetingRoomCount),
    foodRequired: brief.foodRequired === undefined ? "" : brief.foodRequired ? "yes" : "no",
    notes: brief.notes ?? "",
    budget: budgetMajor(brief),
    budgetBasis: brief.budget?.scope ?? "",
    currency: briefCurrency(brief),
  };
}

function budgetMajor(brief: PlannerBrief): string {
  if (brief.budgetMinor !== undefined) {
    return formatBudgetMajor(brief.budgetMinor.amount);
  }
  if (brief.budget === undefined) {
    return "";
  }
  return formatMajorAmount(brief.budget.amount);
}

function formatMajorAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    return "";
  }
  const cents = Math.round(amount * 100);
  const major = Math.floor(cents / 100);
  const minor = cents % 100;
  if (minor === 0) {
    return String(major);
  }
  if (minor % 10 === 0) {
    return `${major}.${String(minor / 10)}`;
  }
  return `${major}.${String(minor).padStart(2, "0")}`;
}

function moreStamp(more: MoreFieldValues): string {
  return [
    more.eventTitle,
    more.organisationName,
    more.contactEmail,
    more.city,
    more.language,
    more.startDate,
    more.endDate,
    more.startTime,
    more.endTime,
    more.attendeeCount,
    more.roomCount,
    more.meetingRoomCount,
    more.foodRequired,
    more.notes,
    more.budget,
    more.budgetBasis,
    more.currency,
  ].join("\u001f");
}

function inputHints(question: string): {
  inputType: "email" | "text";
  inputMode: "email" | "numeric" | "text";
  autoComplete: string | undefined;
} {
  if (question.toLowerCase().includes("email")) {
    return { inputType: "email", inputMode: "email", autoComplete: "email" };
  }
  if (question.startsWith("How many")) {
    return { inputType: "text", inputMode: "numeric", autoComplete: undefined };
  }
  return { inputType: "text", inputMode: "text", autoComplete: undefined };
}
