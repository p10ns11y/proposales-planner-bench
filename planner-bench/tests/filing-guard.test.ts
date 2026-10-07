import { describe, expect, it } from "vitest";
import { questionForGap } from "../src/domain/fitness";
import { addEnglishLanguage, briefWrittenInEnglish, statesOtherLanguage } from "../src/flow/brief-language";
import {
  noticeForFiling,
  noticeForMissingEmail,
  preserveOpenVenue,
  storedFilingSnapshot,
} from "../src/flow/filing-guard";
import { briefFiledNotice, draftCreatedNotice } from "../src/proposales/filing";
import { fileBriefChoice, fileBriefDisabled, fileBriefLabel } from "../src/views/file-brief-state";

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

  it("asks for the email only while filing is empty and that gap is open", () => {
    expect(noticeForMissingEmail(null, ["contactEmail"])).toBe(emailQuestion);
    expect(noticeForMissingEmail(null, ["contactEmail", "startDate"])).toBe(emailQuestion);
    expect(noticeForMissingEmail(null, ["startDate"])).toBeNull();
    expect(noticeForMissingEmail(null, [])).toBeNull();
    expect(noticeForMissingEmail({ path: "inbox", id: 1 }, ["contactEmail"])).toBeNull();
    expect(noticeForMissingEmail({ path: "draft", uuid: "d" }, ["contactEmail"])).toBeNull();
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
});
