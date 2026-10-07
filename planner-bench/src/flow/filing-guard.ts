import { questionForGap } from "../domain/fitness";
import { briefFiledNotice, draftCreatedNotice } from "../proposales/filing";
import type { FileBriefResult } from "../proposales/types";

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

export function noticeForMissingEmail(filing: FileBriefResult | null, gaps: readonly string[]): string | null {
  if (filing !== null || !gaps.includes("contactEmail")) {
    return null;
  }
  return questionForGap("contactEmail");
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
