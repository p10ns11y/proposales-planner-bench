import { briefGapsForStage, compareOffers, offersForBrief, rankComparisonRows } from "../domain/compare-offers";
import { briefConfirmHold, questionForGap } from "../domain/fitness";
import { briefCurrency, mergeBrief } from "../domain/planner-brief";
import { normaliseProposal } from "../domain/normalise-proposal";
import { filingUnavailableNotice } from "../proposales/filing";
import type { ProposalesClient } from "../proposales/types";
import { attemptFiling, fileableBrief, releaseStaleFiling } from "./filing-guard";
import { projectBriefFlow } from "./brief-flow";
import { addEnglishLanguage } from "./brief-language";
import { extractBriefPatch, extractPastedOffer, isFileUtterance, readBudgetScope, turnIntent } from "./fixture-extractor";
import type { PlannerSnapshot } from "./planner-snapshot";

export async function runFixtureTurn(input: {
  text: string;
  snapshot: PlannerSnapshot;
  client: ProposalesClient;
  today: string;
  filingSettled?: boolean;
  userText?: string;
}): Promise<{ reply: string; snapshot: PlannerSnapshot }> {
  const spoken = input.userText ?? "";
  const textIntent = turnIntent(input.text);
  const intent = textIntent === "file" && !isFileUtterance(spoken) ? "update" : textIntent;
  const userAsked = isFileUtterance(spoken);
  const brief = userAsked
    ? fileableBrief(briefWithAnsweredBasis(input.snapshot.brief, input.text))
    : briefWithAnsweredBasis(input.snapshot.brief, input.text);
  let filing = input.snapshot.filing;
  let filingKey = input.snapshot.filingKey;
  let filingAvailable = input.snapshot.filingAvailable;
  let offers = input.snapshot.offers;
  const notes: string[] = [];
  let selectedCompanyId = input.snapshot.selectedCompanyId;
  const favoriteVenueNames = input.snapshot.favoriteVenueNames;
  let filingNotice: string | null = null;

  if (userAsked) {
    const attempt = input.filingSettled
      ? {
          filing,
          filingKey,
          notice: input.snapshot.notice,
          filingAvailable,
          selectedCompanyId,
        }
      : await attemptFiling({
          brief,
          filing,
          filingKey,
          filingAvailable,
          selectedCompanyId,
          companies: input.snapshot.companies,
          client: input.client,
          utterance: spoken,
        });
    filing = attempt.filing;
    filingKey = attempt.filingKey;
    filingAvailable = attempt.filingAvailable;
    selectedCompanyId = attempt.selectedCompanyId;
    filingNotice = attempt.notice;
    if (attempt.notice !== null) {
      notes.push(attempt.notice);
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

  const briefStarted = Object.keys(brief).length > 0;
  const hold = briefStarted ? briefConfirmHold(brief) : null;
  const blockingGap = hold?.gaps[0];
  const projected = projectBriefFlow({
    brief,
    filing,
    offers: blockingGap === undefined ? offers : [],
  });
  const gaps =
    hold !== null
      ? hold.gaps
      : projected.stage === "collecting" || projected.stage === "fileable"
        ? []
        : briefGapsForStage(brief, projected.stage);
  const matchedOffers = offersForBrief(brief, projected.offers);
  const grid =
    matchedOffers.length === 0
      ? []
      : rankComparisonRows(
          compareOffers(brief, matchedOffers, input.today, {
            favoriteVenueNames,
            companies: input.snapshot.companies,
          }),
          briefCurrency(brief),
        );
  const nextQuestion =
    hold !== null
      ? hold.question
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
    snapshot: releaseStaleFiling({
      chatId: input.snapshot.chatId,
      brief,
      newEvent: null,
      inlinePaused: false,
      fileAsked: false,
      fileAskedGap: null,
      fileAskedUtterance: null,
      stage: projected.stage,
      phase,
      offers: projected.offers,
      filing: projected.filing,
      filingKey: projected.filing === null ? null : filingKey,
      gaps,
      nextQuestion,
      companies: input.snapshot.companies,
      selectedCompanyId,
      grid,
      favoriteVenueNames,
      visibleRowCount: input.snapshot.visibleRowCount,
      openVenueName: null,
      notice: userAsked ? filingNotice : filingAvailable ? null : filingUnavailableNotice,
      sampleOffers: false,
      offerSource: input.snapshot.offerSource,
      filingAvailable,
      activeQuery: input.snapshot.activeQuery,
      resultCards: input.snapshot.resultCards,
    }),
  };
}

function briefWithAnsweredBasis(current: PlannerSnapshot["brief"], text: string): PlannerSnapshot["brief"] {
  const patch = addEnglishLanguage(text, current, extractBriefPatch(text));
  const merged = mergeBrief(current, patch);
  const scope = patch.budget === undefined ? readBudgetScope(text) : undefined;
  if (scope === undefined || merged.budget === undefined || merged.budget.scope !== undefined) {
    return merged;
  }
  return mergeBrief(merged, {
    budget: {
      amount: merged.budget.amount,
      currency: merged.budget.currency,
      scope,
      ...(merged.budget.approximate !== undefined ? { approximate: merged.budget.approximate } : {}),
    },
  });
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
