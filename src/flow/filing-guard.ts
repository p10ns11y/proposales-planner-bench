import { findBriefGaps, questionForGap } from "../domain/fitness";
import { singleDayClockBrief, type PlannerBrief } from "../domain/planner-brief";
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
  filingKey: string | null;
  notice: string | null;
  filingAvailable: boolean;
  selectedCompanyId: number | null;
};

type AttemptInput = {
  brief: PlannerBrief;
  filing: FileBriefResult | null;
  filingKey?: string | null;
  filingAvailable: boolean;
  selectedCompanyId: number | null;
  companies: readonly { id: number }[];
  client: Pick<ProposalesClient, "fileBrief">;
};

function token(value: string | number | boolean | undefined): string {
  if (value === undefined) {
    return "";
  }
  return String(value);
}

export function filingFingerprint(brief: PlannerBrief): string {
  return [
    token(brief.contactEmail),
    token(brief.eventTitle),
    token(brief.organisationName),
    token(brief.startDate),
    token(brief.endDate),
    token(brief.startTime),
    token(brief.endTime),
    token(brief.attendeeCount),
    token(brief.roomCount),
    token(brief.meetingRoomCount),
    token(brief.foodRequired),
    token(brief.city),
    token(brief.notes),
    token(brief.language),
    token(brief.budgetMinor?.amount),
    token(brief.budget?.amount),
    token(brief.budget?.currency),
    token(brief.budget?.scope),
    token(brief.budget?.approximate),
  ].join("\u001f");
}

export function fileableBrief(brief: PlannerBrief): PlannerBrief {
  return datedBrief(blankEmailRemoved(brief));
}

export function firstFileableGap(brief: PlannerBrief): string | undefined {
  return findBriefGaps(fileableBrief(brief), "brief:fileable")[0];
}

function blankEmailRemoved(brief: PlannerBrief): PlannerBrief {
  const email = brief.contactEmail;
  if (email === undefined) {
    return brief;
  }
  if (email.trim() !== "") {
    return brief;
  }
  const next = { ...brief };
  delete next.contactEmail;
  return next;
}

function datedBrief(brief: PlannerBrief): PlannerBrief {
  if (brief.endDate !== undefined) {
    return brief;
  }
  const startDate = brief.startDate;
  if (startDate === undefined || singleDayClockBrief(brief) === false) {
    return brief;
  }
  return { ...brief, endDate: startDate };
}

function withoutFilingNotice(notice: string | null): string | null {
  if (notice === draftCreatedNotice) {
    return null;
  }
  if (notice === briefFiledNotice) {
    return null;
  }
  return notice;
}

export function releaseStaleFiling<T extends {
  brief: PlannerBrief;
  filing: FileBriefResult | null;
  filingKey: string | null;
  notice: string | null;
}>(snapshot: T): T {
  if (snapshot.filing === null) {
    if (snapshot.filingKey === null) {
      return snapshot;
    }
    return { ...snapshot, filingKey: null };
  }
  if (snapshot.filingKey === filingFingerprint(snapshot.brief)) {
    return snapshot;
  }
  return {
    ...snapshot,
    filing: null,
    filingKey: null,
    notice: withoutFilingNotice(snapshot.notice),
  };
}

function held(input: AttemptInput, notice: string): FilingAttempt {
  return {
    filing: null,
    filingKey: null,
    notice,
    filingAvailable: input.filingAvailable,
    selectedCompanyId: input.selectedCompanyId,
  };
}

function storedFilingResult(input: AttemptInput): FilingAttempt | null {
  if (input.filing === null) {
    return null;
  }
  const key = input.filingKey ?? null;
  if (key === null) {
    return null;
  }
  if (key !== filingFingerprint(input.brief)) {
    return null;
  }
  return {
    filing: input.filing,
    filingKey: key,
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
      filingKey: filingFingerprint(input.brief),
      notice: noticeForFiling(filing.path),
      filingAvailable: true,
      selectedCompanyId,
    };
  } catch {
    return {
      filing: null,
      filingKey: null,
      notice: filingUnavailableNotice,
      filingAvailable: false,
      selectedCompanyId,
    };
  }
}

export async function attemptFiling(input: AttemptInput): Promise<FilingAttempt> {
  const ready = { ...input, brief: fileableBrief(input.brief) };
  const gap = noticeForFileableGap(null, findBriefGaps(ready.brief, "brief:fileable"));
  if (gap !== null) {
    return held(ready, gap);
  }
  const stored = storedFilingResult(ready);
  if (stored !== null) {
    return stored;
  }
  const selectedCompanyId = chosenCompanyId(ready);
  if (selectedCompanyId === null) {
    return held(ready, missingCompanyNotice(ready.filingAvailable));
  }
  return postFiling(ready, selectedCompanyId);
}
