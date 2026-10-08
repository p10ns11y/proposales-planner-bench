import {
  briefGapsForStage,
  compareOffers,
  offersForBrief,
  rankComparisonRows,
} from "../domain/compare-offers";
import { briefConfirmHold, findBriefGaps, isFileableGap } from "../domain/fitness";
import { minorUnits } from "../domain/minor-units";
import { briefCurrency, mergeBrief, type PlannerBrief } from "../domain/planner-brief";
import { normaliseProposal } from "../domain/normalise-proposal";
import type { ProposalesClient } from "../proposales/types";
import { addEnglishLanguage } from "./brief-language";
import { describesDifferentEvent } from "./event-split";
import { attemptFiling, fileableBrief, filingFingerprint, preserveOpenVenue, releaseStaleFiling } from "./filing-guard";
import { historyTitle } from "./history-log";
import { inlineValuePatch, leftUnfiledNote, type InlineField } from "./inline-ask";
import { loadComparableProposals, sampleProposalRecords } from "../proposales/comparable-proposals";
import { projectBriefFlow } from "./brief-flow";
import {
  extractBriefPatch,
  matchFavoriteVenues,
  readBudgetScope,
  readClockRange,
  readDurationMinutes,
  readSingleClock,
  turnIntent,
} from "./fixture-extractor";
import { applyMoreDetails, type MoreDetails } from "./more-details";
import { defaultVisibleRowCount, type PlannerSnapshot } from "./planner-snapshot";
import { explainLine, holdLine, isAffirmation, utteranceKind } from "./utterance";

export type BriefPatchReader = (text: string, brief: PlannerBrief) => Promise<PlannerBrief>;

export type ViewportAction =
  | { type: "captureSubmitted"; text: string }
  | { type: "composerSubmitted"; text: string }
  | { type: "gapAnswered"; text: string }
  | { type: "briefEdited"; brief: PlannerBrief }
  | { type: "briefConfirmed"; brief?: PlannerBrief }
  | { type: "moreEdited"; details: MoreDetails }
  | { type: "favoritesSubmitted"; text: string }
  | { type: "inlineAnswered"; field: InlineField; value: string }
  | { type: "inlineSkipped" }
  | { type: "showMore" }
  | { type: "rowOpened"; venueName: string }
  | { type: "rowClosed" };

export async function runViewportAction(input: {
  action: ViewportAction;
  snapshot: PlannerSnapshot;
  client: ProposalesClient;
  today: string;
  readPatch?: BriefPatchReader;
}): Promise<{ snapshot: PlannerSnapshot }> {
  const acted = await applyViewportAction(input);
  return { snapshot: releaseStaleFiling(acted) };
}

async function applyViewportAction(input: {
  action: ViewportAction;
  snapshot: PlannerSnapshot;
  client: ProposalesClient;
  today: string;
  readPatch?: BriefPatchReader;
}): Promise<PlannerSnapshot> {
  const readPatch = input.readPatch;
  switch (input.action.type) {
    case "captureSubmitted":
    case "composerSubmitted":
    case "gapAnswered":
      return ingestText(input.snapshot, input.action.text, input.client, input.today, readPatch);
    case "briefEdited":
      return editBrief(input.snapshot, input.action.brief);
    case "briefConfirmed": {
      const confirmed = input.action;
      const base =
        confirmed.brief === undefined ? input.snapshot : editBrief(input.snapshot, confirmed.brief);
      return confirmBrief(base, input.client);
    }
    case "inlineAnswered":
      return answerInline(input.snapshot, input.action.field, input.action.value, input.client);
    case "inlineSkipped":
      return skipInline(input.snapshot, input.client, input.today);
    case "moreEdited":
      return editMore(input.snapshot, input.action.details, input.client, input.today);
    case "favoritesSubmitted":
      return submitFavorites(input.snapshot, input.action.text, input.client, input.today);
    case "showMore":
      return showMoreRows(input.snapshot);
    case "rowOpened":
      return { ...input.snapshot, openVenueName: input.action.venueName };
    case "rowClosed":
      return { ...input.snapshot, openVenueName: null };
  }
}

async function ingestText(
  snapshot: PlannerSnapshot,
  text: string,
  client: ProposalesClient,
  today: string,
  readPatch: BriefPatchReader | undefined,
): Promise<PlannerSnapshot> {
  const kind = utteranceKind(text, snapshot.phase);
  const answersBudgetBasis =
    snapshot.phase === "confirm" && snapshot.gaps[0] === "budgetBasis" && readBudgetScope(text) !== undefined;
  if (kind === "explain") {
    return { ...snapshot, notice: explainLine };
  }
  if (kind === "hold" && !answersBudgetBasis) {
    return { ...snapshot, notice: holdLine };
  }
  const cleared = { ...snapshot, notice: null, newEvent: null, inlinePaused: false };
  if (turnIntent(text) === "file") {
    return tryFile(cleared, client);
  }
  const patch = await readIncomingPatch(text, cleared.brief, readPatch);
  if (keepsFiledBrief(cleared) && describesDifferentEvent(cleared.brief, patch)) {
    return {
      ...cleared,
      newEvent: { label: historyTitle(patch) },
    };
  }
  if (cleared.phase === "capture") {
    return withConfirmState(cleared, mergeBrief(cleared.brief, patch));
  }
  if (cleared.phase === "confirm") {
    if (cleared.gaps.length === 0 && isAffirmation(text)) {
      return confirmBrief(cleared, client);
    }
    return answerGap(cleared, text, patch);
  }
  if (cleared.phase === "favorites") {
    if (answersOpenFileableGap(cleared, text)) {
      return answerGap(cleared, text, patch);
    }
    return submitFavorites(cleared, text, client, today);
  }
  return reviseDuringResults(cleared, patch, client, today);
}

async function answerGap(
  snapshot: PlannerSnapshot,
  text: string,
  incoming: PlannerBrief,
): Promise<PlannerSnapshot> {
  if (snapshot.gaps[0] === "budgetBasis") {
    return answerBudgetBasis(snapshot, text, incoming);
  }
  const field = snapshot.gaps[0];
  const patch = patchForGap(field, text, incoming);
  return withConfirmState(snapshot, mergeBrief(snapshot.brief, patch));
}

async function answerBudgetBasis(
  snapshot: PlannerSnapshot,
  text: string,
  incoming: PlannerBrief,
): Promise<PlannerSnapshot> {
  const merged = mergeBrief(snapshot.brief, incoming);
  const scope = readBudgetScope(text) ?? incoming.budget?.scope ?? merged.budget?.scope;
  if (scope === undefined || merged.budget === undefined) {
    return withConfirmState(snapshot, merged);
  }
  return withConfirmState(
    snapshot,
    mergeBrief(merged, {
      budget: {
        amount: merged.budget.amount,
        currency: merged.budget.currency,
        scope,
        ...(merged.budget.approximate !== undefined ? { approximate: merged.budget.approximate } : {}),
      },
    }),
  );
}

function editBrief(snapshot: PlannerSnapshot, briefPatch: PlannerBrief): PlannerSnapshot {
  return withConfirmState(snapshot, mergeBrief(snapshot.brief, briefPatch));
}

async function editMore(
  snapshot: PlannerSnapshot,
  details: MoreDetails,
  client: ProposalesClient,
  today: string,
): Promise<PlannerSnapshot> {
  const brief = applyMoreDetails(snapshot.brief, details);
  if (briefConfirmHold(brief) !== null) {
    return withConfirmState(snapshot, brief);
  }
  const next = { ...snapshot, brief, notice: null };
  if (snapshot.phase === "results") {
    const ranked = await rerank(next, client, today);
    return preserveOpenVenue(ranked, snapshot.openVenueName);
  }
  if (snapshot.phase === "confirm") {
    return withConfirmState(snapshot, brief);
  }
  return next;
}

async function confirmBrief(
  snapshot: PlannerSnapshot,
  client: ProposalesClient,
): Promise<PlannerSnapshot> {
  if (briefConfirmHold(snapshot.brief) !== null) {
    return withConfirmState(snapshot, snapshot.brief);
  }
  const brief = fileableBrief(snapshot.brief);
  const attempt = await attemptFiling({
    brief,
    filing: snapshot.filing,
    filingKey: snapshot.filingKey,
    filingAvailable: snapshot.filingAvailable,
    selectedCompanyId: snapshot.selectedCompanyId,
    companies: snapshot.companies,
    client,
  });
  const firstGap = findBriefGaps(brief, "brief:fileable")[0];
  const asking = attempt.filing === null && firstGap !== undefined;
  const projected = projectBriefFlow({
    brief,
    filing: attempt.filing,
    offers: snapshot.offers,
  });
  const favoritesQuestion = "Which places do you already have in mind? You can skip.";
  return {
    ...snapshot,
    brief,
    newEvent: null,
    inlinePaused: false,
    filing: projected.filing,
    filingKey: projected.filing === null ? null : attempt.filingKey,
    stage: projected.stage,
    selectedCompanyId: attempt.selectedCompanyId,
    filingAvailable: attempt.filingAvailable,
    phase: "favorites",
    gaps: asking && firstGap !== undefined ? [firstGap] : [],
    nextQuestion: asking && attempt.notice !== null ? attempt.notice : favoritesQuestion,
    notice: attempt.notice,
    openVenueName: null,
  };
}

async function tryFile(snapshot: PlannerSnapshot, client: ProposalesClient): Promise<PlannerSnapshot> {
  const brief = fileableBrief(snapshot.brief);
  const attempt = await attemptFiling({
    brief,
    filing: snapshot.filing,
    filingKey: snapshot.filingKey,
    filingAvailable: snapshot.filingAvailable,
    selectedCompanyId: snapshot.selectedCompanyId,
    companies: snapshot.companies,
    client,
  });
  const projected = projectBriefFlow({
    brief,
    filing: attempt.filing,
    offers: snapshot.offers,
  });
  const filed = projected.filing !== null;
  const gap = findBriefGaps(brief, "brief:fileable")[0];
  return {
    ...snapshot,
    brief,
    newEvent: null,
    inlinePaused: false,
    filing: projected.filing,
    filingKey: projected.filing === null ? null : attempt.filingKey,
    stage: projected.stage,
    selectedCompanyId: attempt.selectedCompanyId,
    filingAvailable: attempt.filingAvailable,
    notice: attempt.notice,
    gaps: filed || gap === undefined ? [] : [gap],
    nextQuestion: filed ? questionAfterFiling(snapshot) : snapshot.nextQuestion,
  };
}

async function answerInline(
  snapshot: PlannerSnapshot,
  field: InlineField,
  value: string,
  client: ProposalesClient,
): Promise<PlannerSnapshot> {
  const patch = inlineValuePatch(field, value);
  if (patch === null) {
    return snapshot;
  }
  const brief = mergeBrief(snapshot.brief, patch);
  const next = { ...snapshot, brief, newEvent: null, inlinePaused: false, notice: null };
  if (field === "endTime") {
    return withConfirmState(next, brief);
  }
  return tryFile(next, client);
}

async function skipInline(
  snapshot: PlannerSnapshot,
  client: ProposalesClient,
  today: string,
): Promise<PlannerSnapshot> {
  const paused: PlannerSnapshot = {
    ...snapshot,
    inlinePaused: true,
    notice: leftUnfiledNote,
    newEvent: null,
    gaps: snapshot.phase === "confirm" ? snapshot.gaps : [],
    nextQuestion:
      snapshot.phase === "favorites"
        ? "Which places do you already have in mind? You can skip."
        : snapshot.phase === "confirm"
          ? ""
          : snapshot.nextQuestion,
  };
  if (snapshot.phase !== "favorites") {
    return paused;
  }
  const ranked = await submitFavorites(paused, "skip", client, today);
  return { ...ranked, notice: leftUnfiledNote, inlinePaused: true };
}

function keepsFiledBrief(snapshot: PlannerSnapshot): boolean {
  if (snapshot.filing === null || snapshot.filingKey === null) {
    return false;
  }
  return snapshot.filingKey === filingFingerprint(snapshot.brief);
}

function questionAfterFiling(snapshot: PlannerSnapshot): string {
  if (snapshot.phase === "favorites") {
    return "Which places do you already have in mind? You can skip.";
  }
  if (snapshot.phase === "results") {
    return "";
  }
  return snapshot.nextQuestion;
}

function answersOpenFileableGap(snapshot: PlannerSnapshot, text: string): boolean {
  if (!isFileableGap(snapshot.gaps[0])) {
    return false;
  }
  if (/\bskip\b/i.test(text)) {
    return false;
  }
  return true;
}

async function submitFavorites(
  snapshot: PlannerSnapshot,
  text: string,
  client: ProposalesClient,
  today: string,
): Promise<PlannerSnapshot> {
  if (snapshot.phase === "capture" || snapshot.phase === "confirm") {
    return withConfirmState(snapshot, snapshot.brief);
  }
  if (briefConfirmHold(snapshot.brief) !== null) {
    return withConfirmState(snapshot, snapshot.brief);
  }
  const favoriteVenueNames = matchFavoriteVenues(text);
  return rankSnapshot({ ...snapshot, favoriteVenueNames }, client, today);
}

async function reviseDuringResults(
  snapshot: PlannerSnapshot,
  patch: PlannerBrief,
  client: ProposalesClient,
  today: string,
): Promise<PlannerSnapshot> {
  const brief = mergeBrief(snapshot.brief, patch);
  if (briefConfirmHold(brief) !== null) {
    return withConfirmState(snapshot, brief);
  }
  return rerank({ ...snapshot, brief }, client, today);
}

async function rerank(
  snapshot: PlannerSnapshot,
  client: ProposalesClient,
  today: string,
): Promise<PlannerSnapshot> {
  return rankSnapshot(snapshot, client, today);
}

function normaliseLoaded(proposals: unknown[]): {
  offers: ReturnType<typeof normaliseProposal>[];
  sample: boolean;
} {
  try {
    return { offers: proposals.map((proposal) => normaliseProposal(proposal)), sample: false };
  } catch {
    return {
      offers: sampleProposalRecords().map((proposal) => normaliseProposal(proposal)),
      sample: true,
    };
  }
}

async function rankSnapshot(
  snapshot: PlannerSnapshot,
  client: ProposalesClient,
  today: string,
): Promise<PlannerSnapshot> {
  if (briefConfirmHold(snapshot.brief) !== null) {
    return withConfirmState(snapshot, snapshot.brief);
  }
  const loaded = await loadComparableProposals(client);
  const normalised = normaliseLoaded(loaded.proposals);
  const sample = loaded.sample || normalised.sample;
  const offerSource = sample ? "sample" : loaded.source;
  const offers = offersForBrief(snapshot.brief, normalised.offers);
  const grid = rankComparisonRows(
    compareOffers(snapshot.brief, offers, today, {
      favoriteVenueNames: snapshot.favoriteVenueNames,
      companies: snapshot.companies,
    }),
    briefCurrency(snapshot.brief),
  );
  const projected = projectBriefFlow({
    brief: snapshot.brief,
    filing: snapshot.filing,
    offers,
  });
  return {
    ...snapshot,
    offers,
    stage: projected.stage,
    filing: projected.filing,
    gaps: briefGapsForStage(snapshot.brief, projected.stage),
    grid,
    phase: "results",
    nextQuestion: "",
    notice: null,
    sampleOffers: sample,
    offerSource,
    visibleRowCount: snapshot.visibleRowCount || defaultVisibleRowCount,
    openVenueName: null,
    newEvent: null,
    inlinePaused: false,
  };
}

function showMoreRows(snapshot: PlannerSnapshot): PlannerSnapshot {
  return {
    ...snapshot,
    visibleRowCount: snapshot.visibleRowCount + defaultVisibleRowCount,
  };
}

function withConfirmState(snapshot: PlannerSnapshot, brief: PlannerBrief): PlannerSnapshot {
  const hold = briefConfirmHold(brief);
  const projected = projectBriefFlow({
    brief,
    filing: snapshot.filing,
    offers: snapshot.offers,
  });
  return {
    ...snapshot,
    brief,
    stage: projected.stage,
    phase: "confirm",
    gaps: hold?.gaps ?? [],
    nextQuestion: hold?.question ?? "Does this brief look right?",
    grid: [],
    offers: [],
    notice: null,
    openVenueName: null,
    newEvent: null,
    inlinePaused: false,
  };
}

async function readIncomingPatch(
  text: string,
  brief: PlannerBrief,
  readPatch: BriefPatchReader | undefined,
): Promise<PlannerBrief> {
  const extracted = readPatch ? await readPatch(text, brief) : extractBriefPatch(text);
  return addEnglishLanguage(text, brief, extracted);
}

function patchForGap(field: string | undefined, text: string, incoming: PlannerBrief): PlannerBrief {
  const direct = gapAnswerPatch(field, text);
  if (field === "endTime" || field === "endDate" || field === "durationMinutes") {
    return {
      ...clockAnswer(direct, incoming, false),
      endDate: direct.endDate ?? incoming.endDate,
    };
  }
  if (field === "startTime") {
    return clockAnswer(direct, incoming, true);
  }
  if (field === "city") {
    return { ...incoming, city: direct.city ?? incoming.city };
  }
  return mergeBrief(direct, incoming);
}

function clockAnswer(
  direct: PlannerBrief,
  incoming: PlannerBrief,
  includeIncomingStart: boolean,
): PlannerBrief {
  const explicit =
    direct.startTime !== undefined || direct.endTime !== undefined || direct.durationMinutes !== undefined;
  const startTime = direct.startTime ?? (includeIncomingStart ? incoming.startTime : undefined);
  const endTime = direct.endTime ?? incoming.endTime;
  const durationMinutes = direct.durationMinutes ?? incoming.durationMinutes;
  const patch: PlannerBrief = {};
  if (startTime !== undefined) {
    patch.startTime = startTime;
  }
  if (endTime !== undefined) {
    patch.endTime = endTime;
  }
  if (durationMinutes !== undefined) {
    patch.durationMinutes = durationMinutes;
  }
  if (!explicit && incoming.timeAssumption !== undefined) {
    patch.timeAssumption = incoming.timeAssumption;
    if (patch.startTime === undefined && incoming.startTime !== undefined) {
      patch.startTime = incoming.startTime;
    }
    if (patch.endTime === undefined && incoming.endTime !== undefined) {
      patch.endTime = incoming.endTime;
    }
  }
  return patch;
}

function gapAnswerPatch(field: string | undefined, text: string): PlannerBrief {
  const trimmed = text.trim();
  if (field === undefined || trimmed === "") {
    return {};
  }
  if (field === "eventTitle") {
    return { eventTitle: trimmed };
  }
  if (field === "contactEmail") {
    return { contactEmail: trimmed.replace(/[.,]+$/g, "") };
  }
  if (field === "organisationName") {
    return { organisationName: trimmed };
  }
  if (field === "startDate") {
    return { startDate: trimmed };
  }
  if (field === "endDate") {
    return { endDate: trimmed };
  }
  if (field === "startTime") {
    const range = readClockRange(trimmed);
    if (range.startTime !== undefined) {
      return range;
    }
    const clock = readSingleClock(trimmed);
    return clock === undefined ? {} : { startTime: clock };
  }
  if (field === "endTime" || field === "durationMinutes") {
    const range = readClockRange(trimmed);
    if (range.endTime !== undefined) {
      return range;
    }
    const duration = readDurationMinutes(trimmed);
    if (duration !== undefined) {
      return { durationMinutes: duration };
    }
    const clock = readSingleClock(trimmed);
    if (clock !== undefined) {
      return { endTime: clock };
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return { endDate: trimmed };
    }
    return {};
  }
  if (field === "attendeeCount") {
    const count = Number(trimmed);
    return Number.isFinite(count) ? { attendeeCount: count } : {};
  }
  if (field === "roomCount") {
    const count = Number(trimmed);
    return Number.isFinite(count) ? { roomCount: count } : {};
  }
  if (field === "meetingRoomCount") {
    const count = Number(trimmed);
    return Number.isFinite(count) ? { meetingRoomCount: count } : {};
  }
  if (field === "city") {
    return { city: trimmed };
  }
  if (field === "language") {
    return { language: trimmed.slice(0, 2).toLowerCase() };
  }
  if (field === "foodRequired") {
    if (/\byes\b/i.test(trimmed) || /\btrue\b/i.test(trimmed)) {
      return { foodRequired: true };
    }
    if (/\bno\b/i.test(trimmed) || /\bfalse\b/i.test(trimmed)) {
      return { foodRequired: false };
    }
  }
  if (field === "notes") {
    return { notes: trimmed };
  }
  if (field === "budgetMinor") {
    const amount = Number(trimmed);
    return Number.isFinite(amount) ? { budgetMinor: minorUnits(amount) } : {};
  }
  return {};
}
