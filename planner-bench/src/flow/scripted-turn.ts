import { compareOffers } from "../domain/compare-offers";
import { briefGapsForStage } from "../domain/compare-offers";
import { findBriefGaps, questionForGap } from "../domain/fitness";
import { mergeBrief } from "../domain/planner-brief";
import { normaliseProposal } from "../domain/normalise-proposal";
import { filingUnavailableNotice } from "../proposales/filing";
import type { ProposalesClient } from "../proposales/types";
import { briefDraftFromPlanner } from "./brief-draft";
import { projectBriefFlow } from "./brief-flow";
import { extractBriefPatch, extractPastedOffer, turnIntent } from "./fixture-extractor";
import type { PlannerSnapshot } from "./planner-snapshot";
import { rankComparisonRows } from "../domain/compare-offers";

export async function runFixtureTurn(input: {
  text: string;
  snapshot: PlannerSnapshot;
  client: ProposalesClient;
  today: string;
}): Promise<{ reply: string; snapshot: PlannerSnapshot }> {
  const intent = turnIntent(input.text);
  const brief = mergeBrief(input.snapshot.brief, extractBriefPatch(input.text));
  let filing = input.snapshot.filing;
  let filingAvailable = input.snapshot.filingAvailable;
  let offers = input.snapshot.offers;
  const notes: string[] = [];
  const selectedCompanyId = input.snapshot.selectedCompanyId;
  const favoriteVenueNames = input.snapshot.favoriteVenueNames;

  if (intent === "file") {
    const fileableGaps = findBriefGaps(brief, "brief:fileable");
    if (fileableGaps.length > 0) {
      const firstGap = fileableGaps[0];
      notes.push(firstGap === undefined ? "The brief is still missing details." : questionForGap(firstGap));
    } else if (selectedCompanyId === null) {
      notes.push(filingAvailable ? "Which company should receive the brief?" : filingUnavailableNotice);
    } else {
      try {
        filing = await input.client.fileBrief(briefDraftFromPlanner(brief, selectedCompanyId));
        filingAvailable = true;
        notes.push(filing.path === "draft" ? "A draft was created in Proposales." : "The brief is filed.");
      } catch {
        filingAvailable = false;
        notes.push(filingUnavailableNotice);
      }
    }
  }

  if (intent === "addOffers") {
    if (filing === null) {
      notes.push("File the brief before adding venue proposals.");
    } else {
      const proposals = await input.client.loadVenueProposals();
      offers = proposals.map((proposal) => normaliseProposal(proposal));
      notes.push(`Added ${offers.length} venue proposals.`);
    }
  }

  const pastedOffer = extractPastedOffer(input.text);
  if (pastedOffer) {
    if (filing === null) {
      notes.push("File the brief before adding a pasted offer.");
    } else {
      offers = [...offers, pastedOffer];
      notes.push(`Added ${pastedOffer.venueName}.`);
    }
  }

  const comparableGaps = findBriefGaps(brief, "brief:comparable");
  const briefStarted = Object.keys(brief).length > 0;
  const blockingGap = briefStarted ? comparableGaps[0] : undefined;
  const projected = projectBriefFlow({
    brief,
    filing,
    offers: blockingGap === undefined ? offers : [],
  });
  const gaps =
    blockingGap !== undefined
      ? comparableGaps
      : projected.stage === "collecting" || projected.stage === "fileable"
        ? []
        : briefGapsForStage(brief, projected.stage);
  const grid =
    projected.offers.length === 0
      ? []
      : rankComparisonRows(
          compareOffers(brief, projected.offers, input.today, {
            favoriteVenueNames,
            companies: input.snapshot.companies,
          }),
        );
  const nextQuestion =
    blockingGap !== undefined
      ? questionForGap(blockingGap)
      : questionForStage(projected.stage, gaps, grid.length, gridHasGaps(grid));
  if (brief.timeAssumption !== undefined && !notes.includes(brief.timeAssumption.statement)) {
    notes.unshift(brief.timeAssumption.statement);
  }
  if (nextQuestion !== "" && !notes.includes(nextQuestion)) {
    notes.push(nextQuestion);
  }

  const phase =
    blockingGap !== undefined
      ? ("confirm" as const)
      : projected.stage === "comparing"
        ? ("results" as const)
        : projected.filing !== null
          ? ("favorites" as const)
          : briefStarted
            ? ("confirm" as const)
            : input.snapshot.phase;

  return {
    reply: notes.join(" "),
    snapshot: {
      brief,
      stage: projected.stage,
      phase,
      offers: projected.offers,
      filing: projected.filing,
      gaps,
      nextQuestion,
      companies: input.snapshot.companies,
      selectedCompanyId,
      grid,
      favoriteVenueNames,
      visibleRowCount: input.snapshot.visibleRowCount,
      openVenueName: null,
      notice: filingAvailable ? null : filingUnavailableNotice,
      sampleOffers: false,
      offerSource: input.snapshot.offerSource,
      filingAvailable,
    },
  };
}

function questionForStage(
  stage: PlannerSnapshot["stage"],
  gaps: string[],
  offerCount: number,
  gridShowsGaps: boolean,
): string {
  const firstGap = gaps[0];
  if (firstGap !== undefined && (stage === "collecting" || stage === "filed")) {
    return questionForGap(firstGap);
  }
  if (stage === "fileable") {
    return "The brief is ready. Confirm it when you want it filed.";
  }
  if (stage === "filed" && offerCount === 0) {
    return "Which places do you already have in mind? You can skip.";
  }
  if (stage === "comparing") {
    return gridShowsGaps
      ? "The ranked venues are ready. Some are missing items from the brief."
      : "The ranked venues are ready.";
  }
  if (firstGap !== undefined) {
    return questionForGap(firstGap);
  }
  return "";
}

function gridHasGaps(grid: PlannerSnapshot["grid"]): boolean {
  return grid.some((row) => row.gaps.length > 0);
}
