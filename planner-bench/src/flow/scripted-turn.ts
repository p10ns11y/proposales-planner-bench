import { compareOffers } from "../domain/compare-offers";
import { briefGapsForStage } from "../domain/compare-offers";
import { findBriefGaps, questionForGap } from "../domain/fitness";
import { mergeBrief } from "../domain/planner-brief";
import { normaliseProposal } from "../domain/normalise-proposal";
import type { ProposalesClient } from "../proposales/types";
import { briefDraftFromPlanner } from "./brief-draft";
import { projectBriefFlow } from "./brief-flow";
import { extractBriefPatch, extractPastedOffer, turnIntent } from "./fixture-extractor";
import type { PlannerSnapshot } from "./planner-snapshot";

export async function runFixtureTurn(input: {
  text: string;
  snapshot: PlannerSnapshot;
  client: ProposalesClient;
  today: string;
}): Promise<{ reply: string; snapshot: PlannerSnapshot }> {
  const intent = turnIntent(input.text);
  const brief = mergeBrief(input.snapshot.brief, extractBriefPatch(input.text));
  let filing = input.snapshot.filing;
  let offers = input.snapshot.offers;
  const notes: string[] = [];
  const selectedCompanyId = input.snapshot.selectedCompanyId;

  if (intent === "file") {
    const fileableGaps = findBriefGaps(brief, "brief:fileable");
    if (fileableGaps.length > 0) {
      const firstGap = fileableGaps[0];
      notes.push(firstGap === undefined ? "The brief is still missing details." : questionForGap(firstGap));
    } else if (selectedCompanyId === null) {
      notes.push("Which company should receive the brief?");
    } else {
      filing = await input.client.fileBrief(briefDraftFromPlanner(brief, selectedCompanyId));
      notes.push(
        filing.path === "inbox"
          ? `Filed to the inbox as request ${filing.id}.`
          : `Filed a draft proposal ${filing.uuid}.`,
      );
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

  const projected = projectBriefFlow({ brief, filing, offers });
  const gaps = briefGapsForStage(brief, projected.stage);
  const grid =
    projected.offers.length === 0 ? [] : compareOffers(brief, projected.offers, input.today);
  const nextQuestion = questionForStage(projected.stage, gaps, grid.length, gridHasGaps(grid));
  if (nextQuestion !== "" && !notes.includes(nextQuestion)) {
    notes.push(nextQuestion);
  }

  return {
    reply: notes.join(" "),
    snapshot: {
      brief,
      stage: projected.stage,
      offers: projected.offers,
      filing: projected.filing,
      gaps,
      nextQuestion,
      companies: input.snapshot.companies,
      selectedCompanyId,
      grid,
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
    return "The brief is ready to file. Say file the brief when you want it sent.";
  }
  if (stage === "filed" && offerCount === 0) {
    return "Say add the venue proposals when you have the offers.";
  }
  if (stage === "comparing") {
    return gridShowsGaps
      ? "The comparison grid is ready. Some venues are missing items from the brief."
      : "The comparison grid is ready.";
  }
  if (firstGap !== undefined) {
    return questionForGap(firstGap);
  }
  return "";
}

function gridHasGaps(grid: PlannerSnapshot["grid"]): boolean {
  return grid.some((row) => row.gaps.length > 0);
}
