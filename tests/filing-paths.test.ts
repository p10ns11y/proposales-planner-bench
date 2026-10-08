import { describe, expect, it } from "vitest";
import { questionForGap } from "../src/domain/fitness";
import { openingSnapshot } from "../src/flow/chat-request";
import { fileChatBrief } from "../src/flow/planner-chat";
import { runFixtureTurn } from "../src/flow/scripted-turn";
import { runViewportAction } from "../src/flow/viewport-turn";
import { createFixtureClient } from "../src/proposales/fixture-client";
import type { BriefDraft, ProposalesClient } from "../src/proposales/types";

const today = "2026-10-06";
const fileableText =
  "City Stockholm. Attendees 25. Start 2026-12-03. End 2026-12-03. Start time 09:00. End time 17:00. Email planner@northwind.example. Language en.";
const emailGapText =
  "City Stockholm. Attendees 25. Start 2026-12-03. End 2026-12-03. Start time 09:00. End time 17:00.";
const languageGapText =
  "City Stockholm. Attendees 25. Start 2026-12-03. End 2026-12-03. Start time 09:00. End time 17:00. Email planner@northwind.example.";

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

describe("filing paths", () => {
  it("makes no filing from the chat tool or model text without a user file message", async () => {
    const watched = countingClient();
    const snapshot = openingSnapshot(await watched.client.listCompanies());
    const captured = await runViewportAction({
      action: { type: "captureSubmitted", text: fileableText },
      snapshot,
      client: watched.client,
      today,
    });
    const tool = await fileChatBrief({
      snapshot: captured.snapshot,
      client: watched.client,
      today,
    });
    const modelPhrase = await runFixtureTurn({
      text: "file the brief",
      snapshot: captured.snapshot,
      client: watched.client,
      today,
    });
    const modelWord = await runFixtureTurn({
      text: "file",
      snapshot: captured.snapshot,
      client: watched.client,
      today,
    });
    expect(tool.snapshot.filing).toBeNull();
    expect(modelPhrase.snapshot.filing).toBeNull();
    expect(modelWord.snapshot.filing).toBeNull();
    expect(watched.filings).toHaveLength(0);
  });

  it("calls the client once across chat, the fixture turn, and the page", async () => {
    const watched = countingClient();
    const snapshot = openingSnapshot(await watched.client.listCompanies());
    const captured = await runViewportAction({
      action: { type: "captureSubmitted", text: fileableText },
      snapshot,
      client: watched.client,
      today,
    });
    expect(watched.filings).toHaveLength(0);
    const chat = await fileChatBrief({
      snapshot: captured.snapshot,
      client: watched.client,
      today,
      userText: "file",
    });
    expect(watched.filings).toHaveLength(1);
    const fixture = await runFixtureTurn({
      text: "file the brief",
      userText: "file",
      snapshot: chat.snapshot,
      client: watched.client,
      today,
    });
    const page = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: fixture.snapshot,
      client: watched.client,
      today,
    });
    expect(watched.filings).toHaveLength(1);
    expect(page.snapshot.filing).toEqual(chat.snapshot.filing);
    expect(fixture.snapshot.filing).toEqual(chat.snapshot.filing);
    expect(chat.snapshot.filing).toEqual({ path: "inbox", id: 100 });
  });

  it("asks for the missing field from every path and does not call the client", async () => {
    const watched = countingClient();
    const snapshot = openingSnapshot(await watched.client.listCompanies());
    const missingEmail = await runViewportAction({
      action: { type: "captureSubmitted", text: emailGapText },
      snapshot,
      client: watched.client,
      today,
    });
    const chatEmail = await fileChatBrief({
      snapshot: missingEmail.snapshot,
      client: watched.client,
      today,
      userText: "file",
    });
    const fixtureEmail = await runFixtureTurn({
      text: "file the brief",
      userText: "file",
      snapshot: missingEmail.snapshot,
      client: watched.client,
      today,
    });
    const pageEmail = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: missingEmail.snapshot,
      client: watched.client,
      today,
    });
    expect(watched.filings).toHaveLength(0);
    expect(chatEmail.reply.toLowerCase()).toContain("email");
    expect(fixtureEmail.reply.toLowerCase()).toContain("email");
    expect(pageEmail.snapshot.notice).toBe(questionForGap("contactEmail"));

    const missingLanguage = await runViewportAction({
      action: { type: "captureSubmitted", text: languageGapText },
      snapshot,
      client: watched.client,
      today,
    });
    const chatLanguage = await fileChatBrief({
      snapshot: missingLanguage.snapshot,
      client: watched.client,
      today,
      userText: "file",
    });
    const fixtureLanguage = await runFixtureTurn({
      text: "file the brief",
      userText: "file",
      snapshot: missingLanguage.snapshot,
      client: watched.client,
      today,
    });
    const pageLanguage = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: missingLanguage.snapshot,
      client: watched.client,
      today,
    });
    expect(watched.filings).toHaveLength(0);
    expect(chatLanguage.reply.toLowerCase()).toContain("language");
    expect(fixtureLanguage.reply.toLowerCase()).toContain("language");
    expect(pageLanguage.snapshot.notice).toBe(questionForGap("language"));
  });
});
