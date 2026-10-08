import { describe, expect, it } from "vitest";
import { questionForGap } from "../src/domain/fitness";
import type { PlannerBrief } from "../src/domain/planner-brief";
import { addEnglishLanguage, briefWrittenInEnglish, statesOtherLanguage } from "../src/flow/brief-language";
import { isFileUtterance, turnIntent } from "../src/flow/fixture-extractor";
import {
  attemptFiling,
  filingFingerprint,
  noticeForFileableGap,
  noticeForFiling,
  preserveOpenVenue,
  releaseStaleFiling,
  storedFilingSnapshot,
} from "../src/flow/filing-guard";
import { emptySnapshot } from "../src/flow/planner-snapshot";
import { runViewportAction } from "../src/flow/viewport-turn";
import { briefFiledNotice, draftCreatedNotice, filingUnavailableNotice } from "../src/proposales/filing";
import type { BriefDraft, FileBriefResult } from "../src/proposales/types";
import { shellViewModel } from "../src/view-models/selectors";
import {
  detailStatusLine,
  emailApplyDecision,
  emailReplyHint,
  fileBriefChoice,
  fileBriefDisabled,
  fileBriefLabel,
  fileBriefPressable,
  moreOpenedForEmail,
} from "../src/views/file-brief-state";

const englishWords = [
  "the",
  "and",
  "with",
  "from",
  "people",
  "need",
  "needs",
  "meeting",
  "place",
  "places",
  "for",
  "day",
  "offsite",
  "attendees",
  "budget",
  "dinner",
  "lunch",
  "breakfast",
  "room",
  "rooms",
  "full",
];

const otherLanguageWords = [
  "och",
  "att",
  "jag",
  "inte",
  "det",
  "som",
  "ett",
  "med",
  "till",
  "personer",
  "behover",
  "plats",
  "ska",
  "vill",
  "lokal",
  "dagar",
  "une",
  "pour",
  "avec",
  "les",
  "des",
  "dans",
  "bonjour",
  "cherche",
  "personnes",
  "und",
  "ich",
  "nicht",
  "eine",
  "einen",
  "personen",
];

const emailQuestion = questionForGap("contactEmail");

describe("English brief language", () => {
  it("needs two English words and rejects accents, other languages, and a single word", () => {
    expect(briefWrittenInEnglish("")).toBe(false);
    expect(briefWrittenInEnglish("xyz")).toBe(false);
    expect(briefWrittenInEnglish("people")).toBe(false);
    expect(briefWrittenInEnglish("people for")).toBe(true);
    expect(briefWrittenInEnglish("café people for")).toBe(false);
    expect(briefWrittenInEnglish("People FOR")).toBe(true);
    for (const word of englishWords) {
      const partner = word === "the" ? "people" : "the";
      expect(briefWrittenInEnglish(`${partner} ${word}`)).toBe(true);
    }
    for (const word of otherLanguageWords) {
      expect(briefWrittenInEnglish(`people for ${word}`)).toBe(false);
    }
  });

  it("stores en only when neither side has a language and the words do not name another language", () => {
    expect(addEnglishLanguage("people for a day", {}, { city: "Stockholm" }).language).toBe("en");
    expect(addEnglishLanguage("people for a day", { language: "sv" }, { city: "Stockholm" }).language).toBeUndefined();
    expect(addEnglishLanguage("people for a day", { language: "   " }, { city: "Stockholm" }).language).toBe("en");
    expect(addEnglishLanguage("people for a day", {}, { language: "de" }).language).toBe("de");
    expect(addEnglishLanguage("people for a day", {}, { language: "" }).language).toBe("en");
    expect(addEnglishLanguage("people for a day", {}, { language: " en " }).language).toBe(" en ");
    expect(addEnglishLanguage("people for a day in swedish", {}, { city: "Stockholm" }).language).toBeUndefined();
    expect(addEnglishLanguage("people for a day in  swedish", {}, { city: "Stockholm" }).language).toBeUndefined();
    expect(addEnglishLanguage("people for a day IN SWEDISH", {}, { city: "Stockholm" }).language).toBeUndefined();
    expect(addEnglishLanguage("people for a day på svenska", {}, { city: "Stockholm" }).language).toBeUndefined();
    expect(addEnglishLanguage("people for a day language sv", {}, { city: "Stockholm" }).language).toBeUndefined();
    expect(addEnglishLanguage("people for a day language  sv", {}, { city: "Stockholm" }).language).toBeUndefined();
    expect(statesOtherLanguage("in swedish")).toBe(true);
    expect(statesOtherLanguage("in  swedish")).toBe(true);
    expect(statesOtherLanguage("på svenska")).toBe(true);
    expect(statesOtherLanguage("på  svenska")).toBe(true);
    expect(statesOtherLanguage("language sv")).toBe(true);
    expect(statesOtherLanguage("language  sv")).toBe(true);
    expect(statesOtherLanguage("language EN")).toBe(false);
    expect(statesOtherLanguage("language  EN")).toBe(false);
    expect(statesOtherLanguage("people for a day")).toBe(false);
    expect(addEnglishLanguage("people for a day language EN", {}, { city: "Stockholm" }).language).toBe("en");
    expect(addEnglishLanguage("people for a day language en", {}, {}).language).toBe("en");
    expect(addEnglishLanguage("xyz", {}, { city: "Stockholm" }).language).toBeUndefined();
  });
});

describe("filing guard", () => {
  it("returns the stored filing and does not invent one", () => {
    expect(storedFilingSnapshot({ filing: null, notice: "earlier" })).toBeNull();
    const draft = storedFilingSnapshot({ filing: { path: "draft" as const, uuid: "d-1" }, notice: null });
    expect(draft).toEqual({
      filing: { path: "draft", uuid: "d-1" },
      notice: draftCreatedNotice,
      filingAvailable: true,
    });
    const inbox = storedFilingSnapshot({ filing: { path: "inbox" as const, id: 4 }, notice: null });
    expect(inbox?.notice).toBe(briefFiledNotice);
    expect(inbox?.filingAvailable).toBe(true);
    expect(noticeForFiling("draft")).toBe(draftCreatedNotice);
    expect(noticeForFiling("inbox")).toBe(briefFiledNotice);
  });

  it("asks for the first missing fileable field while filing is empty", () => {
    const fields = ["contactEmail", "startDate", "endDate", "attendeeCount", "language", "roomCount"] as const;
    for (const field of fields) {
      expect(noticeForFileableGap(null, [field])).toBe(questionForGap(field));
    }
    expect(noticeForFileableGap(null, ["contactEmail", "startDate"])).toBe(emailQuestion);
    expect(noticeForFileableGap(null, ["language", "roomCount"])).toBe(questionForGap("language"));
    expect(noticeForFileableGap(null, [])).toBeNull();
    expect(noticeForFileableGap({ path: "inbox", id: 1 }, ["contactEmail"])).toBeNull();
    expect(noticeForFileableGap({ path: "draft", uuid: "d" }, ["startDate"])).toBeNull();
    expect(noticeForFileableGap({ path: "inbox", id: 1 }, [])).toBeNull();
  });

  it("keeps the open offer when More is saved from results", () => {
    const ranked = { openVenueName: null, phase: "results" };
    expect(preserveOpenVenue(ranked, null)).toBe(ranked);
    expect(preserveOpenVenue(ranked, "Canal Loft")).toEqual({ openVenueName: "Canal Loft", phase: "results" });
  });
});

describe("file brief control", () => {
  it("ignores a second file, asks when the email is blank, and sends otherwise", () => {
    const ready = { filed: false, busy: false, ready: true, email: "planner@northwind.example" };
    expect(fileBriefChoice(ready)).toBe("send");
    expect(fileBriefChoice({ ...ready, email: "  " })).toBe("ask-email");
    expect(fileBriefChoice({ ...ready, email: "" })).toBe("ask-email");
    expect(fileBriefChoice({ ...ready, filed: true })).toBe("ignore");
    expect(fileBriefChoice({ ...ready, busy: true })).toBe("ignore");
    expect(fileBriefChoice({ ...ready, ready: false })).toBe("ignore");
    expect(fileBriefChoice({ ...ready, filed: true, busy: true, ready: false, email: "" })).toBe("ignore");
  });

  it("reads Filed and stays disabled once the brief is filed", () => {
    expect(fileBriefLabel(false)).toBe("File this brief");
    expect(fileBriefLabel(true)).toBe("Filed");
    expect(fileBriefDisabled(false, false)).toBe(false);
    expect(fileBriefDisabled(true, false)).toBe(true);
    expect(fileBriefDisabled(false, true)).toBe(true);
    expect(fileBriefDisabled(true, true)).toBe(true);
  });

  it("requires an email only when File opened More, and keeps File pressable after a transport error", () => {
    expect(emailReplyHint).toBe("Venues reply to this address");
    expect(moreOpenedForEmail).toBe("Add details opened so venues reply to this address.");
    expect(emailApplyDecision({ required: false, email: "" })).toBe("apply");
    expect(emailApplyDecision({ required: false, email: "  " })).toBe("apply");
    expect(emailApplyDecision({ required: true, email: "" })).toBe("need-email");
    expect(emailApplyDecision({ required: true, email: "  " })).toBe("need-email");
    expect(emailApplyDecision({ required: true, email: "planner@northwind.example" })).toBe("apply");
    expect(fileBriefPressable({ ready: false, busy: false, filed: false })).toBe(false);
    expect(fileBriefPressable({ ready: true, busy: true, filed: false })).toBe(false);
    expect(fileBriefPressable({ ready: true, busy: false, filed: true })).toBe(false);
    expect(fileBriefPressable({ ready: false, busy: true, filed: true })).toBe(false);
    expect(fileBriefPressable({ ready: true, busy: false, filed: false })).toBe(true);
    const error = "Couldn't reach Proposales. Your brief is saved.";
    expect(detailStatusLine({ errorText: null, filingMessage: null, whyMore: null })).toBeNull();
    expect(detailStatusLine({ errorText: "  ", filingMessage: "  ", whyMore: "  " })).toBeNull();
    expect(detailStatusLine({ errorText: `  ${error}  `, filingMessage: briefFiledNotice, whyMore: moreOpenedForEmail })).toBe(error);
    expect(detailStatusLine({ errorText: null, filingMessage: briefFiledNotice, whyMore: `  ${moreOpenedForEmail}  ` })).toBe(moreOpenedForEmail);
    expect(detailStatusLine({ errorText: "", filingMessage: `  ${briefFiledNotice}  `, whyMore: null })).toBe(briefFiledNotice);
  });
});

const readyBrief: PlannerBrief = {
  contactEmail: "planner@northwind.example",
  startDate: "2026-12-03",
  endDate: "2026-12-03",
  attendeeCount: 25,
  language: "en",
};

function omitField(field: "contactEmail" | "startDate" | "endDate" | "attendeeCount" | "language"): PlannerBrief {
  const next: PlannerBrief = { ...readyBrief };
  if (field === "contactEmail") {
    delete next.contactEmail;
  }
  if (field === "startDate") {
    delete next.startDate;
  }
  if (field === "endDate") {
    delete next.endDate;
  }
  if (field === "attendeeCount") {
    delete next.attendeeCount;
  }
  if (field === "language") {
    delete next.language;
  }
  return next;
}

function countingFileClient(mode: "ok" | "throw" | "once") {
  const filings: BriefDraft[] = [];
  return {
    filings,
    client: {
      async fileBrief(brief: BriefDraft): Promise<FileBriefResult> {
        filings.push(brief);
        if (mode === "throw" || (mode === "once" && filings.length === 1)) {
          throw new Error("down");
        }
        if (brief.companyId === 2) {
          return { path: "draft", uuid: "00000000-0000-4000-8000-000000000001" };
        }
        return { path: "inbox", id: 100 };
      },
    },
  };
}

describe("attempt filing", () => {
  it("returns a stored filing without calling the client", async () => {
    const watched = countingFileClient("throw");
    const stored: FileBriefResult = { path: "inbox", id: 100 };
    const attempt = await attemptFiling({
      brief: readyBrief,
      filing: stored,
      filingKey: filingFingerprint(readyBrief),
      filingAvailable: false,
      selectedCompanyId: 1,
      companies: [{ id: 2 }],
      client: watched.client,
    });
    expect(watched.filings).toHaveLength(0);
    expect(attempt.filing).toEqual(stored);
    expect(attempt.filingKey).toBe(filingFingerprint(readyBrief));
    expect(attempt.notice).toBe(briefFiledNotice);
    expect(attempt.filingAvailable).toBe(true);
    expect(attempt.selectedCompanyId).toBe(1);
  });

  it("clears the filed state when the brief changes", async () => {
    const key = filingFingerprint(readyBrief);
    const filed = {
      brief: readyBrief,
      filing: { path: "inbox" as const, id: 100 },
      filingKey: key,
      notice: briefFiledNotice,
    };
    expect(releaseStaleFiling(filed)).toBe(filed);
    const edited = releaseStaleFiling({
      ...filed,
      brief: { ...readyBrief, attendeeCount: 30 },
    });
    expect(filingFingerprint(edited.brief)).not.toBe(key);
    expect(edited.filing).toBeNull();
    expect(edited.filingKey).toBeNull();
    expect(edited.notice).toBeNull();
    const drafted = releaseStaleFiling({
      ...filed,
      brief: { ...readyBrief, city: "Gothenburg" },
      filing: { path: "draft" as const, uuid: "d-1" },
      notice: draftCreatedNotice,
    });
    expect(drafted.filing).toBeNull();
    expect(drafted.notice).toBeNull();
    const kept = releaseStaleFiling({ ...filed, filingKey: "other", notice: "Saved for later." });
    expect(kept.filing).toBeNull();
    expect(kept.notice).toBe("Saved for later.");
    const orphan = { brief: readyBrief, filing: null, filingKey: "stale", notice: emailQuestion };
    expect(releaseStaleFiling(orphan)).toEqual({ ...orphan, filingKey: null });
    const clear = { brief: readyBrief, filing: null, filingKey: null, notice: null };
    expect(releaseStaleFiling(clear)).toBe(clear);
    const base = emptySnapshot([{ id: 1, name: "Harbour House" }], "", []);
    const changed = shellViewModel({
      snapshot: {
        ...base,
        brief: { ...readyBrief, attendeeCount: 30 },
        phase: "results",
        filing: { path: "inbox", id: 100 },
        filingKey: key,
        notice: briefFiledNotice,
      },
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(changed.filed).toBe(false);
    expect(changed.draftConfirmation).toBeNull();
    expect(changed.filingMessage).toBeNull();
    const legacy = shellViewModel({
      snapshot: {
        ...base,
        brief: readyBrief,
        phase: "results",
        filing: { path: "draft", uuid: "d-1" },
        filingKey: null,
        notice: draftCreatedNotice,
      },
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(legacy.filed).toBe(false);
    expect(legacy.draftConfirmation).toBeNull();
    const watched = countingFileClient("ok");
    const posted = await attemptFiling({
      brief: readyBrief,
      filing: { path: "inbox", id: 4 },
      filingAvailable: true,
      selectedCompanyId: 1,
      companies: [{ id: 1 }],
      client: watched.client,
    });
    expect(watched.filings).toHaveLength(1);
    expect(posted.filingKey).toBe(key);
  });

  it("refuses a file when the email is missing, including sample mode", async () => {
    const watched = countingFileClient("ok");
    const stored: FileBriefResult = { path: "draft", uuid: "d-1" };
    const missing = await attemptFiling({
      brief: omitField("contactEmail"),
      filing: stored,
      filingKey: filingFingerprint(readyBrief),
      filingAvailable: true,
      selectedCompanyId: 2,
      companies: [{ id: 2 }],
      client: watched.client,
    });
    const blank = await attemptFiling({
      brief: { ...readyBrief, contactEmail: "   " },
      filing: stored,
      filingAvailable: true,
      selectedCompanyId: 2,
      companies: [{ id: 2 }],
      client: watched.client,
    });
    expect(watched.filings).toHaveLength(0);
    expect(missing.filing).toBeNull();
    expect(missing.filingKey).toBeNull();
    expect(missing.notice).toBe(emailQuestion);
    expect(blank.filing).toBeNull();
    expect(blank.notice).toBe(emailQuestion);
    expect(turnIntent("file")).toBe("file");
    expect(turnIntent("file it")).toBe("file");
    expect(isFileUtterance("file this")).toBe(true);
    expect(isFileUtterance("file this brief")).toBe(true);
    const sample = {
      ...emptySnapshot([{ id: 2, name: "Northwind" }], "", []),
      brief: omitField("contactEmail"),
      filing: stored,
      phase: "results" as const,
      sampleOffers: true,
      offerSource: "sample" as const,
    };
    const refused = await runViewportAction({
      action: { type: "composerSubmitted", text: "file it" },
      snapshot: sample,
      client: {
        readsLiveProposals: false,
        listCompanies: async () => [{ id: 2, name: "Northwind", inboxToken: null }],
        getProposal: async () => ({}),
        loadVenueProposals: async () => [],
        fileBrief: (brief) => watched.client.fileBrief(brief),
      },
      today: "2026-10-06",
    });
    expect(watched.filings).toHaveLength(0);
    expect(refused.snapshot.filing).toBeNull();
    expect(refused.snapshot.notice).toBe(emailQuestion);
    expect(refused.snapshot.sampleOffers).toBe(true);
    const view = shellViewModel({
      snapshot: refused.snapshot,
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(view.filed).toBe(false);
    expect(view.filingMessage).toBe(emailQuestion);
    expect(view.offerLabel).toBe("Sample offers");
  });

  it("files a changed brief once more and keeps a repeat of the same brief", async () => {
    const watched = countingFileClient("ok");
    const shared = {
      filingAvailable: true,
      selectedCompanyId: 1,
      companies: [{ id: 1 }],
      client: watched.client,
    };
    const first = await attemptFiling({ brief: readyBrief, filing: null, ...shared });
    expect(watched.filings).toHaveLength(1);
    expect(first.filingKey).toBe(filingFingerprint(readyBrief));
    const repeat = await attemptFiling({
      brief: readyBrief,
      filing: first.filing,
      filingKey: first.filingKey,
      ...shared,
    });
    expect(watched.filings).toHaveLength(1);
    expect(repeat.filing).toEqual(first.filing);
    const editedBrief = { ...readyBrief, attendeeCount: 30 };
    const second = await attemptFiling({
      brief: editedBrief,
      filing: first.filing,
      filingKey: first.filingKey,
      ...shared,
    });
    expect(watched.filings).toHaveLength(2);
    expect(second.filingKey).toBe(filingFingerprint(editedBrief));
    const third = await attemptFiling({
      brief: editedBrief,
      filing: second.filing,
      filingKey: second.filingKey,
      ...shared,
    });
    expect(watched.filings).toHaveLength(2);
    expect(third.filing).toEqual(second.filing);
  });

  it("asks for one missing field and does not call the client", async () => {
    const fields = ["contactEmail", "startDate", "endDate", "attendeeCount", "language"] as const;
    for (const field of fields) {
      const watched = countingFileClient("ok");
      const attempt = await attemptFiling({
        brief: omitField(field),
        filing: null,
        filingAvailable: true,
        selectedCompanyId: 1,
        companies: [{ id: 1 }],
        client: watched.client,
      });
      expect(watched.filings).toHaveLength(0);
      expect(attempt.filing).toBeNull();
      expect(attempt.notice).toBe(questionForGap(field));
      expect(attempt.filingAvailable).toBe(true);
    }
    const watched = countingFileClient("ok");
    const rooms = await attemptFiling({
      brief: { ...readyBrief, endDate: "2026-12-05" },
      filing: null,
      filingAvailable: true,
      selectedCompanyId: 1,
      companies: [{ id: 1 }],
      client: watched.client,
    });
    expect(watched.filings).toHaveLength(0);
    expect(rooms.notice).toBe(questionForGap("roomCount"));
    const both = await attemptFiling({
      brief: omitField("language"),
      filing: null,
      filingAvailable: true,
      selectedCompanyId: 1,
      companies: [{ id: 1 }],
      client: watched.client,
    });
    expect(both.notice).toBe(questionForGap("language"));
    const emailFirst = await attemptFiling({
      brief: { city: "Stockholm" },
      filing: null,
      filingAvailable: true,
      selectedCompanyId: 1,
      companies: [{ id: 1 }],
      client: watched.client,
    });
    expect(watched.filings).toHaveLength(0);
    expect(emailFirst.notice).toBe(emailQuestion);
  });

  it("files once for the chosen company and allows a retry after a transport failure", async () => {
    const inbox = countingFileClient("ok");
    const filed = await attemptFiling({
      brief: readyBrief,
      filing: null,
      filingAvailable: true,
      selectedCompanyId: null,
      companies: [{ id: 1 }, { id: 2 }],
      client: inbox.client,
    });
    expect(inbox.filings).toHaveLength(1);
    expect(inbox.filings[0]?.companyId).toBe(1);
    expect(filed.filing).toEqual({ path: "inbox", id: 100 });
    expect(filed.notice).toBe(briefFiledNotice);
    expect(filed.selectedCompanyId).toBe(1);
    expect(filed.filingAvailable).toBe(true);

    const draft = countingFileClient("ok");
    const drafted = await attemptFiling({
      brief: readyBrief,
      filing: null,
      filingAvailable: true,
      selectedCompanyId: 2,
      companies: [{ id: 1 }],
      client: draft.client,
    });
    expect(draft.filings).toHaveLength(1);
    expect(draft.filings[0]?.companyId).toBe(2);
    expect(drafted.filing).toEqual({ path: "draft", uuid: "00000000-0000-4000-8000-000000000001" });
    expect(drafted.notice).toBe(draftCreatedNotice);
    expect(drafted.selectedCompanyId).toBe(2);

    const zero = countingFileClient("throw");
    const rejected = await attemptFiling({
      brief: readyBrief,
      filing: null,
      filingAvailable: true,
      selectedCompanyId: 0,
      companies: [{ id: 1 }],
      client: zero.client,
    });
    expect(zero.filings).toHaveLength(1);
    expect(zero.filings[0]?.companyId).toBe(0);
    expect(rejected.filing).toBeNull();
    expect(rejected.notice).toBe(filingUnavailableNotice);
    expect(rejected.filingAvailable).toBe(false);
    expect(rejected.selectedCompanyId).toBe(0);

    const missing = countingFileClient("ok");
    const open = await attemptFiling({
      brief: readyBrief,
      filing: null,
      filingAvailable: true,
      selectedCompanyId: null,
      companies: [],
      client: missing.client,
    });
    expect(missing.filings).toHaveLength(0);
    expect(open.notice).toBe("Which company should receive the brief?");
    expect(open.filingAvailable).toBe(true);
    const closed = await attemptFiling({
      brief: readyBrief,
      filing: null,
      filingAvailable: false,
      selectedCompanyId: null,
      companies: [],
      client: missing.client,
    });
    expect(missing.filings).toHaveLength(0);
    expect(closed.notice).toBe(filingUnavailableNotice);
    expect(closed.filing).toBeNull();
    expect(closed.filingAvailable).toBe(false);

    const retry = countingFileClient("once");
    const failed = await attemptFiling({
      brief: readyBrief,
      filing: null,
      filingAvailable: true,
      selectedCompanyId: 1,
      companies: [{ id: 1 }],
      client: retry.client,
    });
    expect(failed.filing).toBeNull();
    expect(failed.notice).toBe(filingUnavailableNotice);
    expect(failed.filingAvailable).toBe(false);
    const again = await attemptFiling({
      brief: readyBrief,
      filing: failed.filing,
      filingAvailable: failed.filingAvailable,
      selectedCompanyId: failed.selectedCompanyId,
      companies: [{ id: 1 }],
      client: retry.client,
    });
    expect(retry.filings).toHaveLength(2);
    expect(again.filing).toEqual({ path: "inbox", id: 100 });
    expect(again.notice).toBe(briefFiledNotice);
    expect(again.filingAvailable).toBe(true);
  });
});
