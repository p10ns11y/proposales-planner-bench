import {
  briefGapsForStage,
  compareOffers,
  offersForBrief,
  rankComparisonRows,
} from "../domain/compare-offers";
import { briefConfirmHold, findBriefGaps, questionForGap } from "../domain/fitness";
import { minorUnits } from "../domain/minor-units";
import { mergeBrief, type PlannerBrief } from "../domain/planner-brief";
import { normaliseProposal } from "../domain/normalise-proposal";
import type { ProposalesClient } from "../proposales/types";
import { addEnglishLanguage } from "./brief-language";
import { noticeForFiling, noticeForMissingEmail, preserveOpenVenue, storedFilingSnapshot } from "./filing-guard";
import { briefDraftFromPlanner } from "./brief-draft";
import { loadComparableProposals, sampleProposalRecords } from "../proposales/comparable-proposals";
import { filingUnavailableNotice } from "../proposales/filing";
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
  const readPatch = input.readPatch;
  switch (input.action.type) {
    case "captureSubmitted":
    case "composerSubmitted":
    case "gapAnswered":
      return {
        snapshot: await ingestText(input.snapshot, input.action.text, input.client, input.today, readPatch),
      };
    case "briefEdited":
      return { snapshot: editBrief(input.snapshot, input.action.brief) };
    case "briefConfirmed": {
      const confirmed = input.action;
      const base =
        confirmed.brief === undefined ? input.snapshot : editBrief(input.snapshot, confirmed.brief);
      return { snapshot: await confirmBrief(base, input.client) };
    }
    case "moreEdited":
      return {
        snapshot: await editMore(input.snapshot, input.action.details, input.client, input.today),
      };
    case "favoritesSubmitted":
      return {
        snapshot: await submitFavorites(input.snapshot, input.action.text, input.client, input.today),
      };
    case "showMore":
      return { snapshot: showMoreRows(input.snapshot) };
    case "rowOpened":
      return { snapshot: { ...input.snapshot, openVenueName: input.action.venueName } };
    case "rowClosed":
      return { snapshot: { ...input.snapshot, openVenueName: null } };
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
  const cleared = { ...snapshot, notice: null };
  if (turnIntent(text) === "file") {
    return tryFile(cleared, client);
  }
  if (cleared.phase === "capture") {
    return captureBrief(cleared, text, readPatch);
  }
  if (cleared.phase === "confirm") {
    if (cleared.gaps.length === 0 && isAffirmation(text)) {
      return confirmBrief(cleared, client);
    }
    return answerGap(cleared, text, readPatch);
  }
  if (cleared.phase === "favorites") {
    return submitFavorites(cleared, text, client, today);
  }
  return reviseDuringResults(cleared, text, client, today, readPatch);
}

async function captureBrief(
  snapshot: PlannerSnapshot,
  text: string,
  readPatch: BriefPatchReader | undefined,
): Promise<PlannerSnapshot> {
  const patch = await readIncomingPatch(text, snapshot.brief, readPatch);
  return withConfirmState(snapshot, mergeBrief(snapshot.brief, patch));
}

async function answerGap(
  snapshot: PlannerSnapshot,
  text: string,
  readPatch: BriefPatchReader | undefined,
): Promise<PlannerSnapshot> {
  if (snapshot.gaps[0] === "budgetBasis") {
    return answerBudgetBasis(snapshot, text, readPatch);
  }
  const field = snapshot.gaps[0];
  const incoming = await readIncomingPatch(text, snapshot.brief, readPatch);
  const patch = patchForGap(field, text, incoming);
  return withConfirmState(snapshot, mergeBrief(snapshot.brief, patch));
}

async function answerBudgetBasis(
  snapshot: PlannerSnapshot,
  text: string,
  readPatch: BriefPatchReader | undefined,
): Promise<PlannerSnapshot> {
  const incoming = await readIncomingPatch(text, snapshot.brief, readPatch);
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
  let filing = snapshot.filing;
  let selectedCompanyId = snapshot.selectedCompanyId;
  let filingAvailable = snapshot.filingAvailable;
  let notice: string | null = null;
  const fileableGaps = findBriefGaps(snapshot.brief, "brief:fileable");
  if (filing === null && fileableGaps.length === 0) {
    selectedCompanyId = selectedCompanyId ?? snapshot.companies[0]?.id ?? null;
    if (selectedCompanyId === null) {
      notice = filingAvailable ? null : filingUnavailableNotice;
    } else {
      try {
        filing = await client.fileBrief(briefDraftFromPlanner(snapshot.brief, selectedCompanyId));
      } catch {
        filingAvailable = false;
        notice = filingUnavailableNotice;
      }
    }
  } else {
    notice = noticeForMissingEmail(filing, fileableGaps);
  }
  const projected = projectBriefFlow({
    brief: snapshot.brief,
    filing,
    offers: snapshot.offers,
  });
  return {
    ...snapshot,
    filing: projected.filing,
    stage: projected.stage,
    selectedCompanyId,
    filingAvailable,
    phase: "favorites",
    gaps: [],
    nextQuestion: "Which places do you already have in mind? You can skip.",
    notice,
    openVenueName: null,
  };
}

async function tryFile(snapshot: PlannerSnapshot, client: ProposalesClient): Promise<PlannerSnapshot> {
  const stored = storedFilingSnapshot(snapshot);
  if (stored !== null) {
    return stored;
  }
  const gaps = findBriefGaps(snapshot.brief, "brief:fileable");
  if (gaps.length > 0) {
    const firstGap = gaps[0];
    return {
      ...snapshot,
      notice: firstGap === undefined ? holdLine : questionForGap(firstGap),
    };
  }
  const selectedCompanyId = snapshot.selectedCompanyId ?? snapshot.companies[0]?.id ?? null;
  if (selectedCompanyId === null) {
    return {
      ...snapshot,
      notice: snapshot.filingAvailable ? "Which company should receive the brief?" : filingUnavailableNotice,
    };
  }
  try {
    const filing = await client.fileBrief(briefDraftFromPlanner(snapshot.brief, selectedCompanyId));
    const projected = projectBriefFlow({
      brief: snapshot.brief,
      filing,
      offers: snapshot.offers,
    });
    return {
      ...snapshot,
      filing: projected.filing,
      stage: projected.stage,
      selectedCompanyId,
      filingAvailable: true,
      notice: noticeForFiling(filing.path),
    };
  } catch {
    return {
      ...snapshot,
      filingAvailable: false,
      notice: filingUnavailableNotice,
    };
  }
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
  text: string,
  client: ProposalesClient,
  today: string,
  readPatch: BriefPatchReader | undefined,
): Promise<PlannerSnapshot> {
  const patch = await readIncomingPatch(text, snapshot.brief, readPatch);
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
    snapshot.brief.budget?.currency,
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
