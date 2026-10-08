import {
  briefGapsForStage,
  compareOffers,
  offersForBrief,
  rankComparisonRows,
} from "../domain/compare-offers";
import { briefConfirmHold, findBriefGaps, isFileableGap, questionForGap } from "../domain/fitness";
import { minorUnits } from "../domain/minor-units";
import { briefCurrency, mergeBrief, type PlannerBrief } from "../domain/planner-brief";
import { normaliseProposal } from "../domain/normalise-proposal";
import type { ProposalesClient } from "../proposales/types";
import { addEnglishLanguage } from "./brief-language";
import { describesDifferentEvent } from "./event-split";
import { attemptFiling, fileableBrief, filingFingerprint, preserveOpenVenue, releaseStaleFiling } from "./filing-guard";
import { historyTitle } from "./history-log";
import { inlineAskFor, inlineValuePatch, isInlineField, leftUnfiledNote, type InlineField } from "./inline-ask";
import { loadComparableProposals, sampleProposalRecords } from "../proposales/comparable-proposals";
import { projectBriefFlow } from "./brief-flow";
import {
  extractBriefPatch,
  isFileUtterance,
  singleFieldPatch,
  matchFavoriteVenues,
  readBudgetScope,
  readClockRange,
  readDurationMinutes,
  readSingleClock,
} from "./fixture-extractor";
import { applyMoreDetails, type MoreDetails } from "./more-details";
import { defaultVisibleRowCount, type PlannerSnapshot } from "./planner-snapshot";
import {
  asksForTwo,
  cardSummary,
  holdReply,
  narrowToTwo,
  nextResultCard,
  rememberRank,
  withResultCard,
  type CardRecord,
} from "./result-cards";
import { explainLine, isAffirmation, utteranceKind } from "./utterance";

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
  const kept = preservesFileAsk(input.snapshot, input.action) ? acted : withoutFileAsk(acted);
  return { snapshot: releaseStaleFiling(kept) };
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
      return confirmBrief(base);
    }
    case "inlineAnswered":
      return answerInline(input.snapshot, input.action.field, input.action.value, input.client, input.today);
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
  if (snapshot.phase === "results" && asksForTwo(text)) {
    return narrowResults(snapshot, text);
  }
  if (kind === "explain") {
    return withoutFileAsk({ ...snapshot, notice: explainLine });
  }
  if (kind === "hold" && !answersBudgetBasis) {
    return withoutFileAsk({ ...snapshot, notice: holdReply(snapshot.resultCards.length > 0) });
  }
  const cleared = withoutFileAsk({ ...snapshot, notice: null, newEvent: null, inlinePaused: false });
  if (isFileUtterance(text)) {
    return applyAskedFile(cleared, client, text);
  }
  const patch = await readIncomingPatch(text, cleared.brief, readPatch);
  if (keepsFiledBrief(cleared) && describesDifferentEvent(cleared.brief, patch)) {
    const brief = mergeBrief(cleared.brief, patch);
    await attemptFiling({
      brief,
      filing: null,
      filingKey: null,
      filingAvailable: cleared.filingAvailable,
      selectedCompanyId: cleared.selectedCompanyId,
      companies: cleared.companies,
      client,
      utterance: text,
    });
    return {
      ...cleared,
      newEvent: { label: historyTitle(patch) },
    };
  }
  if (cleared.phase === "capture") {
    return withConfirmState({ ...cleared, activeQuery: text.trim() }, mergeBrief(cleared.brief, patch));
  }
  if (cleared.phase === "confirm") {
    if (cleared.gaps.length === 0 && isAffirmation(text)) {
      return confirmBrief(cleared);
    }
    return answerGap(cleared, text, patch);
  }
  if (cleared.phase === "favorites") {
    if (answersOpenFileableGap(cleared, text)) {
      return answerGap(cleared, text, patch);
    }
    return submitFavorites(cleared, text, client, today);
  }
  return reviseDuringResults(cleared, patch, client, today, text.trim());
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
    if (JSON.stringify(brief) === JSON.stringify(snapshot.brief)) {
      return snapshot;
    }
    const ranked = await rerank(next, client, today, "append", moreQuery(details));
    return preserveOpenVenue(ranked, snapshot.openVenueName);
  }
  if (snapshot.phase === "confirm") {
    return withConfirmState(snapshot, brief);
  }
  return next;
}

function confirmBrief(snapshot: PlannerSnapshot): PlannerSnapshot {
  if (briefConfirmHold(snapshot.brief) !== null) {
    return withConfirmState(withoutFileAsk(snapshot), snapshot.brief);
  }
  const brief = fileableBrief(snapshot.brief);
  const firstGap = findBriefGaps(brief, "brief:fileable")[0];
  const asking = firstGap !== undefined;
  const projected = projectBriefFlow({
    brief,
    filing: snapshot.filing,
    offers: snapshot.offers,
  });
  const favoritesQuestion = "Which places do you already have in mind? You can skip.";
  const question = asking && firstGap !== undefined ? questionForGap(firstGap) : favoritesQuestion;
  return {
    ...snapshot,
    brief,
    newEvent: null,
    inlinePaused: false,
    fileAsked: false,
    fileAskedGap: null,
    fileAskedUtterance: null,
    filing: projected.filing,
    filingKey: projected.filing === null ? null : snapshot.filingKey,
    stage: projected.stage,
    phase: "favorites",
    gaps: asking && firstGap !== undefined ? [firstGap] : [],
    nextQuestion: question,
    notice: asking && firstGap !== undefined ? question : null,
    openVenueName: null,
  };
}

async function applyAskedFile(
  snapshot: PlannerSnapshot,
  client: ProposalesClient,
  utterance: string,
): Promise<PlannerSnapshot> {
  const brief = fileableBrief(snapshot.brief);
  const attempt = await attemptFiling({
    brief,
    filing: snapshot.filing,
    filingKey: snapshot.filingKey,
    filingAvailable: snapshot.filingAvailable,
    selectedCompanyId: snapshot.selectedCompanyId,
    companies: snapshot.companies,
    client,
    utterance,
  });
  const projected = projectBriefFlow({
    brief,
    filing: attempt.filing,
    offers: snapshot.offers,
  });
  const filed = projected.filing !== null;
  const gap = findBriefGaps(brief, "brief:fileable")[0];
  const inlineGap = isInlineField(gap) ? gap : null;
  const sameCard = snapshot.fileAskedGap === null || snapshot.fileAskedGap === inlineGap;
  const arm = !filed && inlineGap !== null && sameCard && isFileUtterance(utterance);
  return {
    ...snapshot,
    brief,
    newEvent: null,
    inlinePaused: false,
    fileAsked: arm,
    fileAskedGap: arm ? inlineGap : null,
    fileAskedUtterance: arm ? utterance : null,
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
  today: string,
): Promise<PlannerSnapshot> {
  const patch = inlineValuePatch(field, value);
  if (patch === null) {
    return snapshot;
  }
  const brief = mergeBrief(snapshot.brief, patch);
  const next = { ...snapshot, brief, newEvent: null, inlinePaused: false, notice: null };
  const utterance = snapshot.fileAskedUtterance;
  if (keepsFileCard(snapshot, field) && utterance !== null) {
    return applyAskedFile(next, client, utterance);
  }
  await attemptFiling({
    brief,
    filing: null,
    filingKey: null,
    filingAvailable: snapshot.filingAvailable,
    selectedCompanyId: snapshot.selectedCompanyId,
    companies: snapshot.companies,
    client,
    utterance: null,
  });
  return storeInline(next, client, today, value.trim());
}

async function storeInline(
  snapshot: PlannerSnapshot,
  client: ProposalesClient,
  today: string,
  query: string,
): Promise<PlannerSnapshot> {
  const next = withoutFileAsk({ ...snapshot, newEvent: null, inlinePaused: false, notice: null });
  if (snapshot.phase === "results") {
    if (briefConfirmHold(next.brief) !== null) {
      return withConfirmState(next, next.brief);
    }
    return rerank(next, client, today, "append", query);
  }
  if (snapshot.phase === "favorites") {
    const gap = findBriefGaps(fileableBrief(next.brief), "brief:fileable")[0];
    const favoritesQuestion = "Which places do you already have in mind? You can skip.";
    return {
      ...next,
      gaps: gap === undefined ? [] : [gap],
      nextQuestion: gap === undefined ? favoritesQuestion : questionForGap(gap),
      notice: gap === undefined ? null : questionForGap(gap),
    };
  }
  return withConfirmState(next, next.brief);
}

async function skipInline(
  snapshot: PlannerSnapshot,
  client: ProposalesClient,
  today: string,
): Promise<PlannerSnapshot> {
  const keep = keepsFileCard(snapshot);
  const paused: PlannerSnapshot = {
    ...(keep ? snapshot : withoutFileAsk(snapshot)),
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

function withoutFileAsk(snapshot: PlannerSnapshot): PlannerSnapshot {
  return { ...snapshot, fileAsked: false, fileAskedGap: null, fileAskedUtterance: null };
}

function keepsFileCard(snapshot: PlannerSnapshot, field?: InlineField): boolean {
  if (!snapshot.fileAsked || snapshot.fileAskedGap === null || snapshot.fileAskedUtterance === null) {
    return false;
  }
  if (!isFileUtterance(snapshot.fileAskedUtterance)) {
    return false;
  }
  if (inlineAskFor(snapshot) !== snapshot.fileAskedGap) {
    return false;
  }
  if (field !== undefined && field !== snapshot.fileAskedGap) {
    return false;
  }
  return true;
}

function preservesFileAsk(snapshot: PlannerSnapshot, action: ViewportAction): boolean {
  if (action.type === "rowOpened" || action.type === "rowClosed" || action.type === "showMore") {
    return true;
  }
  if (action.type === "inlineAnswered") {
    return keepsFileCard(snapshot, action.field);
  }
  if (action.type === "inlineSkipped") {
    return keepsFileCard(snapshot);
  }
  if (action.type === "captureSubmitted" || action.type === "composerSubmitted" || action.type === "gapAnswered") {
    return isFileUtterance(action.text);
  }
  return false;
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
  const record = snapshot.resultCards.length === 0 ? "seed" : "follow";
  return rankSnapshot({ ...snapshot, favoriteVenueNames }, client, today, record, snapshot.activeQuery);
}

async function reviseDuringResults(
  snapshot: PlannerSnapshot,
  patch: PlannerBrief,
  client: ProposalesClient,
  today: string,
  query: string,
): Promise<PlannerSnapshot> {
  const brief = mergeBrief(mergeBrief(snapshot.brief, singleFieldPatch(query)), patch);
  if (briefConfirmHold(brief) !== null) {
    return withConfirmState(snapshot, brief);
  }
  return rankSnapshot({ ...snapshot, brief, activeQuery: query }, client, today, "append", query);
}

async function rerank(
  snapshot: PlannerSnapshot,
  client: ProposalesClient,
  today: string,
  record: CardRecord,
  query: string,
): Promise<PlannerSnapshot> {
  return rankSnapshot(snapshot, client, today, record, query);
}

function moreQuery(details: MoreDetails): string {
  const guests = details.attendeeCount?.trim() ?? "";
  if (guests !== "") {
    return `${guests} guests`;
  }
  const city = details.city?.trim() ?? "";
  if (city !== "") {
    return city;
  }
  return "updated brief";
}

function narrowResults(snapshot: PlannerSnapshot, text: string): PlannerSnapshot {
  const latest = snapshot.resultCards.at(-1);
  const source = latest !== undefined && latest.rows.length > 0 ? latest.rows : snapshot.grid;
  const outcome = narrowToTwo(source);
  if (outcome.kind === "reply") {
    return { ...snapshot, notice: outcome.text };
  }
  const summary = cardSummary({
    count: outcome.rows.length,
    city: snapshot.brief.city,
    attendees: snapshot.brief.attendeeCount,
  });
  const card = nextResultCard(snapshot.resultCards, text.trim(), outcome.rows, summary);
  return {
    ...snapshot,
    notice: null,
    grid: outcome.rows,
    resultCards: withResultCard(snapshot.resultCards, card),
    openVenueName: null,
  };
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
  record: CardRecord,
  query: string,
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
  const visibleRowCount = snapshot.visibleRowCount || defaultVisibleRowCount;
  const ranked = {
    ...snapshot,
    offers,
    stage: projected.stage,
    filing: projected.filing,
    gaps: briefGapsForStage(snapshot.brief, projected.stage),
    grid,
    phase: "results" as const,
    nextQuestion: "",
    notice: null,
    sampleOffers: sample,
    offerSource,
    visibleRowCount,
    openVenueName: null,
    newEvent: null,
    inlinePaused: false,
  };
  return {
    ...ranked,
    resultCards: rememberRank({
      cards: ranked.resultCards,
      rows: grid,
      visibleRowCount,
      record,
      query,
      activeQuery: ranked.activeQuery,
      city: ranked.brief.city,
      attendees: ranked.brief.attendeeCount,
    }),
  };
}

function showMoreRows(snapshot: PlannerSnapshot): PlannerSnapshot {
  const visibleRowCount = snapshot.visibleRowCount + defaultVisibleRowCount;
  const ranked = { ...snapshot, visibleRowCount };
  return {
    ...ranked,
    resultCards: rememberRank({
      cards: ranked.resultCards,
      rows: ranked.grid,
      visibleRowCount,
      record: "refresh",
      query: "",
      activeQuery: ranked.activeQuery,
      city: ranked.brief.city,
      attendees: ranked.brief.attendeeCount,
    }),
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
