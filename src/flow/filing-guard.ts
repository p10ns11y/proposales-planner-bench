import { findBriefGaps, questionForGap } from "../domain/fitness";
import type { PlannerBrief } from "../domain/planner-brief";
import { briefDraftFromPlanner } from "./brief-draft";
import { briefFiledNotice, draftCreatedNotice, filingUnavailableNotice } from "../proposales/filing";
import type { FileBriefResult, ProposalesClient } from "../proposales/types";

export function noticeForFiling(path: FileBriefResult["path"]): string {
  return path === "draft" ? draftCreatedNotice : briefFiledNotice;
}

type StoredFiling<T> = Omit<T, "notice" | "filingAvailable"> & {
  filingAvailable: true;
  notice: string;
};

export function storedFilingSnapshot<T extends { filing: FileBriefResult | null }>(
  snapshot: T,
): StoredFiling<T> | null {
  if (snapshot.filing === null) {
    return null;
  }
  return {
    ...snapshot,
    filingAvailable: true,
    notice: noticeForFiling(snapshot.filing.path),
  };
}

export function noticeForFileableGap(filing: FileBriefResult | null, gaps: readonly string[]): string | null {
  if (filing !== null) {
    return null;
  }
  const first = gaps[0];
  if (first === undefined) {
    return null;
  }
  return questionForGap(first);
}

export function preserveOpenVenue<T extends { openVenueName: string | null }>(
  ranked: T,
  openVenueName: string | null,
): T {
  if (openVenueName === null) {
    return ranked;
  }
  return { ...ranked, openVenueName };
}

const companyQuestion = "Which company should receive the brief?";

export type FilingAttempt = {
  filing: FileBriefResult | null;
  notice: string | null;
  filingAvailable: boolean;
  selectedCompanyId: number | null;
};

type AttemptInput = {
  brief: PlannerBrief;
  filing: FileBriefResult | null;
  filingAvailable: boolean;
  selectedCompanyId: number | null;
  companies: readonly { id: number }[];
  client: Pick<ProposalesClient, "fileBrief">;
};

function held(input: AttemptInput, notice: string): FilingAttempt {
  return {
    filing: null,
    notice,
    filingAvailable: input.filingAvailable,
    selectedCompanyId: input.selectedCompanyId,
  };
}

function storedFilingResult(input: AttemptInput): FilingAttempt | null {
  if (input.filing === null) {
    return null;
  }
  return {
    filing: input.filing,
    notice: noticeForFiling(input.filing.path),
    filingAvailable: true,
    selectedCompanyId: input.selectedCompanyId,
  };
}

function chosenCompanyId(input: AttemptInput): number | null {
  if (input.selectedCompanyId !== null) {
    return input.selectedCompanyId;
  }
  const first = input.companies[0];
  if (first === undefined) {
    return null;
  }
  return first.id;
}

function missingCompanyNotice(filingAvailable: boolean): string {
  if (filingAvailable) {
    return companyQuestion;
  }
  return filingUnavailableNotice;
}

async function postFiling(input: AttemptInput, selectedCompanyId: number): Promise<FilingAttempt> {
  try {
    const filing = await input.client.fileBrief(briefDraftFromPlanner(input.brief, selectedCompanyId));
    return {
      filing,
      notice: noticeForFiling(filing.path),
      filingAvailable: true,
      selectedCompanyId,
    };
  } catch {
    return {
      filing: null,
      notice: filingUnavailableNotice,
      filingAvailable: false,
      selectedCompanyId,
    };
  }
}

export async function attemptFiling(input: AttemptInput): Promise<FilingAttempt> {
  const stored = storedFilingResult(input);
  if (stored !== null) {
    return stored;
  }
  const gap = noticeForFileableGap(null, findBriefGaps(input.brief, "brief:fileable"));
  if (gap !== null) {
    return held(input, gap);
  }
  const selectedCompanyId = chosenCompanyId(input);
  if (selectedCompanyId === null) {
    return held(input, missingCompanyNotice(input.filingAvailable));
  }
  return postFiling(input, selectedCompanyId);
}
