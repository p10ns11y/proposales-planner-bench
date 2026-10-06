import {
  briefGapsForStage,
  compareOffers,
  offersMatchingCity,
  rankComparisonRows,
} from "../domain/compare-offers";
import { findBriefGaps, questionForGap } from "../domain/fitness";
import { mergeBrief, type PlannerBrief } from "../domain/planner-brief";
import { normaliseProposal } from "../domain/normalise-proposal";
import type { ProposalesClient } from "../proposales/types";
import { briefDraftFromPlanner } from "./brief-draft";
import { projectBriefFlow } from "./brief-flow";
import { extractBriefPatch, matchFavoriteVenues } from "./fixture-extractor";
import {
  defaultVisibleRowCount,
  type PlannerSnapshot,
} from "./planner-snapshot";

export type ViewportAction =
  | { type: "captureSubmitted"; text: string }
  | { type: "gapAnswered"; text: string }
  | { type: "briefEdited"; brief: PlannerBrief }
  | { type: "briefConfirmed"; brief?: PlannerBrief }
  | { type: "favoritesSubmitted"; text: string }
  | { type: "showMore" }
  | { type: "rowOpened"; venueName: string }
  | { type: "rowClosed" };

export async function runViewportAction(input: {
  action: ViewportAction;
  snapshot: PlannerSnapshot;
  client: ProposalesClient;
  today: string;
}): Promise<{ snapshot: PlannerSnapshot }> {
  switch (input.action.type) {
    case "captureSubmitted":
      return { snapshot: captureBrief(input.snapshot, input.action.text) };
    case "gapAnswered":
      return { snapshot: answerGap(input.snapshot, input.action.text) };
    case "briefEdited":
      return { snapshot: editBrief(input.snapshot, input.action.brief) };
    case "briefConfirmed": {
      const confirmed = input.action;
      return {
        snapshot: await confirmBrief(
          confirmed.brief === undefined
            ? input.snapshot
            : editBrief(input.snapshot, confirmed.brief),
          input.client,
        ),
      };
    }
    case "favoritesSubmitted":
      return {
        snapshot: await submitFavorites(
          input.snapshot,
          input.action.text,
          input.client,
          input.today,
        ),
      };
    case "showMore":
      return { snapshot: showMoreRows(input.snapshot) };
    case "rowOpened":
      return { snapshot: { ...input.snapshot, openVenueName: input.action.venueName } };
    case "rowClosed":
      return { snapshot: { ...input.snapshot, openVenueName: null } };
  }
}

function captureBrief(snapshot: PlannerSnapshot, text: string): PlannerSnapshot {
  const brief = mergeBrief(snapshot.brief, extractBriefPatch(text));
  return withConfirmState(snapshot, brief);
}

function answerGap(snapshot: PlannerSnapshot, text: string): PlannerSnapshot {
  const fromStructured = extractBriefPatch(text);
  const fromFreeText = gapAnswerPatch(snapshot.gaps[0], text);
  const brief = mergeBrief(snapshot.brief, mergeBrief(fromFreeText, fromStructured));
  return withConfirmState(snapshot, brief);
}

function editBrief(snapshot: PlannerSnapshot, briefPatch: PlannerBrief): PlannerSnapshot {
  return withConfirmState(snapshot, mergeBrief(snapshot.brief, briefPatch));
}

async function confirmBrief(
  snapshot: PlannerSnapshot,
  client: ProposalesClient,
): Promise<PlannerSnapshot> {
  const fileableGaps = findBriefGaps(snapshot.brief, "brief:fileable");
  const comparableGaps = findBriefGaps(snapshot.brief, "brief:comparable");
  const gaps = uniqueGaps([...fileableGaps, ...comparableGaps]);
  if (gaps.length > 0) {
    const firstGap = gaps[0];
    return {
      ...snapshot,
      phase: "confirm",
      gaps,
      nextQuestion: firstGap === undefined ? "" : questionForGap(firstGap),
      stage: projectBriefFlow({
        brief: snapshot.brief,
        filing: snapshot.filing,
        offers: snapshot.offers,
      }).stage,
    };
  }
  let filing = snapshot.filing;
  const selectedCompanyId = snapshot.selectedCompanyId ?? snapshot.companies[0]?.id ?? null;
  if (filing === null && selectedCompanyId !== null) {
    filing = await client.fileBrief(briefDraftFromPlanner(snapshot.brief, selectedCompanyId));
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
    phase: "favorites",
    gaps: [],
    nextQuestion: "Which places do you already have in mind? You can skip.",
    openVenueName: null,
  };
}

async function submitFavorites(
  snapshot: PlannerSnapshot,
  text: string,
  client: ProposalesClient,
  today: string,
): Promise<PlannerSnapshot> {
  const favoriteVenueNames = matchFavoriteVenues(text);
  const proposals = await client.loadVenueProposals();
  const normalised = proposals.map((proposal) => normaliseProposal(proposal));
  const offers = offersMatchingCity(snapshot.brief, normalised);
  const grid = rankComparisonRows(
    compareOffers(snapshot.brief, offers, today, {
      favoriteVenueNames,
      companies: snapshot.companies,
    }),
  );
  const projected = projectBriefFlow({
    brief: snapshot.brief,
    filing: snapshot.filing,
    offers,
  });
  return {
    ...snapshot,
    favoriteVenueNames,
    offers: projected.offers,
    stage: projected.stage,
    filing: projected.filing,
    gaps: briefGapsForStage(snapshot.brief, projected.stage),
    grid,
    phase: "results",
    nextQuestion: "",
    visibleRowCount: defaultVisibleRowCount,
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
  const fileableGaps = findBriefGaps(brief, "brief:fileable");
  const comparableGaps = findBriefGaps(brief, "brief:comparable");
  const gaps = uniqueGaps([...fileableGaps, ...comparableGaps]);
  const firstGap = gaps[0];
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
    gaps,
    nextQuestion:
      firstGap === undefined
        ? "Does this brief look right?"
        : questionForGap(firstGap),
    grid: [],
    offers: [],
    openVenueName: null,
  };
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
  return {};
}

function uniqueGaps(gaps: string[]): string[] {
  return [...new Set(gaps)];
}
