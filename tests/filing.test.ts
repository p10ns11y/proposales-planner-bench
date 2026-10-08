import { describe, expect, it } from "vitest";
import { questionForGap } from "../src/domain/fitness";
import { mergeBrief } from "../src/domain/planner-brief";
import { addEnglishLanguage, briefWrittenInEnglish } from "../src/flow/brief-language";
import { openingSnapshot } from "../src/flow/chat-request";
import { resolveBriefPatch } from "../src/flow/agent-mode";
import { runViewportAction } from "../src/flow/viewport-turn";
import { briefFiledNotice, draftCreatedNotice } from "../src/proposales/filing";
import { createFixtureClient } from "../src/proposales/fixture-client";
import type { BriefDraft, ProposalesClient } from "../src/proposales/types";
import { shellViewModel } from "../src/view-models/selectors";

const today = "2026-10-06";
const presentKey = "present";
const englishBrief =
  "I need a place in Stockholm for 40 people on 12 November 2026, from 09:00 to 17:00.";
const swedishBrief = "Jag behöver en lokal i Stockholm för 40 personer den 12 november 2026.";
const emailQuestion = questionForGap("contactEmail");

function countingClient(): { client: ProposalesClient; filings: BriefDraft[] } {
  const inner = createFixtureClient();
  const filings: BriefDraft[] = [];
  return {
    filings,
    client: {
      readsLiveProposals: inner.readsLiveProposals,
      listCompanies: () => inner.listCompanies(),
      getProposal: (uuid) => inner.getProposal(uuid),
      loadVenueProposals: () => inner.loadVenueProposals(),
      fileBrief: async (brief) => {
        filings.push(brief);
        return inner.fileBrief(brief);
      },
    },
  };
}

describe("English language default", () => {
  it("treats an English brief as English and leaves other languages unset", () => {
    expect(briefWrittenInEnglish(englishBrief)).toBe(true);
    expect(briefWrittenInEnglish("Team offsite in Stockholm for 25 people on 3 Dec 2026, a full day.")).toBe(true);
    expect(briefWrittenInEnglish(swedishBrief)).toBe(false);
    expect(briefWrittenInEnglish("Jag behover en lokal i Stockholm for 40 personer.")).toBe(false);
    expect(briefWrittenInEnglish("Bonjour, une salle a Paris pour 20 personnes.")).toBe(false);
    expect(
      addEnglishLanguage("I need a place in Stockholm for 40 people in Swedish.", {}, { city: "Stockholm" }).language,
    ).toBeUndefined();
  });

  it("stores en on the scripted path when no language is stated", async () => {
    const resolved = await resolveBriefPatch({
      text: englishBrief,
      brief: {},
      env: {},
    });
    expect(resolved.planner).toBe("scripted");
    expect(resolved.brief.language).toBe("en");
    const swedish = await resolveBriefPatch({
      text: swedishBrief,
      brief: {},
      env: {},
    });
    expect(swedish.brief.language).toBeUndefined();
    const kept = await resolveBriefPatch({
      text: englishBrief,
      brief: { language: "sv" },
      env: {},
    });
    expect(mergeBrief({ language: "sv" }, kept.brief).language).toBe("sv");
  });

  it("stores en on the model path and keeps a language the model stated", async () => {
    const resolved = await resolveBriefPatch({
      text: englishBrief,
      brief: {},
      env: { XAI_API_KEY: presentKey },
      extractWithModel: async () => ({ organisationName: "Northwind" }),
    });
    expect(resolved.planner).toBe("model");
    expect(resolved.brief.language).toBe("en");
    expect(resolved.brief.organisationName).toBe("Northwind");
    const stated = await resolveBriefPatch({
      text: englishBrief,
      brief: {},
      env: { XAI_API_KEY: presentKey },
      extractWithModel: async () => ({ language: "sv" }),
    });
    expect(stated.planner).toBe("model");
    expect(stated.brief.language).toBe("sv");
    const other = await resolveBriefPatch({
      text: swedishBrief,
      brief: {},
      env: { XAI_API_KEY: presentKey },
      extractWithModel: async () => ({ city: "Stockholm" }),
    });
    expect(other.brief.language).toBeUndefined();
  });
});

describe("filing turns", () => {
  it("asks for the email and does not call Proposales when it is missing", async () => {
    const watched = countingClient();
    const snapshot = openingSnapshot(await watched.client.listCompanies());
    const captured = await runViewportAction({
      action: { type: "captureSubmitted", text: englishBrief },
      snapshot: { ...snapshot, selectedCompanyId: 2 },
      client: watched.client,
      today,
    });
    expect(captured.snapshot.brief.language).toBe("en");
    expect(captured.snapshot.brief.contactEmail).toBeUndefined();
    const refused = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: captured.snapshot,
      client: watched.client,
      today,
    });
    expect(refused.snapshot.filing).toBeNull();
    expect(refused.snapshot.notice).toBe(emailQuestion);
    expect(watched.filings).toHaveLength(0);
    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: captured.snapshot,
      client: watched.client,
      today,
    });
    expect(confirmed.snapshot.phase).toBe("favorites");
    expect(confirmed.snapshot.filing).toBeNull();
    expect(confirmed.snapshot.notice).toBe(emailQuestion);
    expect(watched.filings).toHaveLength(0);
    const view = shellViewModel({
      snapshot: refused.snapshot,
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(view.inlineAsk).toEqual({ field: "contactEmail", inputType: "email", label: "Email" });
    expect(view.filingMessage).toBeNull();
    expect(view.notice).toBeNull();
    expect(view.fileGap).toBe("contactEmail");
    expect(view.filed).toBe(false);
  });

  it("returns the same draft when the brief is filed again", async () => {
    const watched = countingClient();
    const snapshot = openingSnapshot(await watched.client.listCompanies());
    const captured = await runViewportAction({
      action: {
        type: "captureSubmitted",
        text: `${englishBrief} Email planner@northwind.example.`,
      },
      snapshot: { ...snapshot, selectedCompanyId: 2 },
      client: watched.client,
      today,
    });
    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: captured.snapshot,
      client: watched.client,
      today,
    });
    expect(confirmed.snapshot.filing?.path).toBe("draft");
    const again = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: confirmed.snapshot,
      client: watched.client,
      today,
    });
    expect(watched.filings).toHaveLength(1);
    expect(again.snapshot.filing).toEqual(confirmed.snapshot.filing);
    if (again.snapshot.filing?.path !== "draft") {
      return;
    }
    expect(again.snapshot.notice).toBe(draftCreatedNotice);
    const view = shellViewModel({
      snapshot: again.snapshot,
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(view.filed).toBe(true);
    expect(view.filingMessage).toBe(draftCreatedNotice);
    expect(view.draftConfirmation).toBe(draftCreatedNotice);
  });

  it("shows the filed brief after confirm files it", async () => {
    const watched = countingClient();
    const snapshot = openingSnapshot(await watched.client.listCompanies());
    const captured = await runViewportAction({
      action: {
        type: "captureSubmitted",
        text: `${englishBrief} Email planner@northwind.example.`,
      },
      snapshot,
      client: watched.client,
      today,
    });
    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: captured.snapshot,
      client: watched.client,
      today,
    });
    expect(confirmed.snapshot.filing).toEqual({ path: "inbox", id: 100 });
    const view = shellViewModel({
      snapshot: confirmed.snapshot,
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(view.filed).toBe(true);
    expect(view.filingMessage).toBe(briefFiledNotice);
    expect(view.notice).toBe(briefFiledNotice);
    const again = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: confirmed.snapshot,
      client: watched.client,
      today,
    });
    expect(watched.filings).toHaveLength(1);
    expect(again.snapshot.filing).toEqual(confirmed.snapshot.filing);
  });

  it("asks for a missing language at Yes and does not file", async () => {
    const watched = countingClient();
    const snapshot = openingSnapshot(await watched.client.listCompanies());
    const captured = await runViewportAction({
      action: {
        type: "captureSubmitted",
        text: "City Stockholm. Attendees 25. Start 2026-12-03. End 2026-12-03. Start time 09:00. End time 17:00. Email planner@northwind.example.",
      },
      snapshot,
      client: watched.client,
      today,
    });
    expect(captured.snapshot.brief.language).toBeUndefined();
    expect(captured.snapshot.brief.contactEmail).toBe("planner@northwind.example");
    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: captured.snapshot,
      client: watched.client,
      today,
    });
    expect(confirmed.snapshot.phase).toBe("favorites");
    expect(confirmed.snapshot.filing).toBeNull();
    expect(confirmed.snapshot.gaps).toEqual(["language"]);
    expect(confirmed.snapshot.notice).toBe(questionForGap("language"));
    expect(confirmed.snapshot.nextQuestion).toBe(questionForGap("language"));
    expect(watched.filings).toHaveLength(0);
    const view = shellViewModel({
      snapshot: confirmed.snapshot,
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(view.ask).toBe(questionForGap("language"));
    expect(view.notice).toBe(questionForGap("language"));
  });
});
