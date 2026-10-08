import { describe, expect, it } from "vitest";
import { openingSnapshot } from "../src/flow/chat-request";
import {
  asksForTwo,
  cannotNarrowLine,
  cardSummary,
  holdReply,
  narrowToTwo,
  nextResultCard,
  rememberRank,
  rewriteLatestCard,
  steerBackLine,
  twoRowSlice,
  withResultCard,
  type ResultCard,
} from "../src/flow/result-cards";
import { holdLine } from "../src/flow/utterance";
import { runViewportAction } from "../src/flow/viewport-turn";
import { createFixtureClient } from "../src/proposales/fixture-client";
import type { ProposalesClient } from "../src/proposales/types";
import type { PlannerSnapshot } from "../src/flow/planner-snapshot";

const today = "2026-10-08";
const stockholm =
  "I need a place in Stockholm for 40 people on 12 November 2026, from 09:00 to 17:00, with dinner and a meeting room.";
const followUp = "I need a place in Gothenburg for 12 people.";
const offTopic = "What's the weather in Paris tomorrow?";

function watchClient(inner: ProposalesClient): { client: ProposalesClient; proposals: () => number } {
  let proposals = 0;
  return {
    proposals: () => proposals,
    client: {
      readsLiveProposals: inner.readsLiveProposals,
      listCompanies: () => inner.listCompanies(),
      getProposal: (uuid) => inner.getProposal(uuid),
      loadVenueProposals: async () => {
        proposals += 1;
        return inner.loadVenueProposals();
      },
      fileBrief: (brief) => inner.fileBrief(brief),
    },
  };
}

async function rankedChat(): Promise<{
  client: ProposalesClient;
  proposals: () => number;
  snapshot: PlannerSnapshot;
}> {
  const watched = watchClient(createFixtureClient());
  const opening = openingSnapshot(await watched.client.listCompanies());
  const captured = await runViewportAction({
    action: { type: "captureSubmitted", text: stockholm },
    snapshot: opening,
    client: watched.client,
    today,
  });
  const confirmed = await runViewportAction({
    action: { type: "briefConfirmed" },
    snapshot: captured.snapshot,
    client: watched.client,
    today,
  });
  const ranked = await runViewportAction({
    action: { type: "favoritesSubmitted", text: "skip" },
    snapshot: confirmed.snapshot,
    client: watched.client,
    today,
  });
  return { client: watched.client, proposals: watched.proposals, snapshot: ranked.snapshot };
}

function venueNames(card: ResultCard | undefined): string[] {
  return card?.rows.map((row) => row.venueName) ?? [];
}

describe("result cards", () => {
  it("answers an off-topic turn without an offers request or a brief change", async () => {
    const ranked = await rankedChat();
    const before = ranked.snapshot.resultCards[0];
    const offers = ranked.proposals();
    expect(before?.query).toBe(stockholm);
    const held = await runViewportAction({
      action: { type: "composerSubmitted", text: offTopic },
      snapshot: ranked.snapshot,
      client: ranked.client,
      today,
    });
    expect(held.snapshot.notice).toBe(steerBackLine);
    expect(held.snapshot.notice?.length).toBeGreaterThan(0);
    expect(held.snapshot.brief).toEqual(ranked.snapshot.brief);
    expect(held.snapshot.resultCards).toHaveLength(1);
    expect(held.snapshot.resultCards[0]).toBe(before);
    expect(venueNames(held.snapshot.resultCards[0])).toEqual(venueNames(before));
    expect(ranked.proposals()).toBe(offers);
  });

  it("appends a second card for a relevant follow-up and leaves the first card", async () => {
    const ranked = await rankedChat();
    const before = ranked.snapshot.resultCards[0];
    const offers = ranked.proposals();
    const next = await runViewportAction({
      action: { type: "composerSubmitted", text: followUp },
      snapshot: ranked.snapshot,
      client: ranked.client,
      today,
    });
    expect(next.snapshot.resultCards).toHaveLength(2);
    expect(next.snapshot.resultCards[0]).toBe(before);
    expect(next.snapshot.resultCards[0]?.query).toBe(before?.query);
    expect(venueNames(next.snapshot.resultCards[0])).toEqual(venueNames(before));
    expect(next.snapshot.resultCards[1]?.query).toBe(followUp);
    expect(next.snapshot.resultCards[1]?.rows.length).toBeGreaterThan(0);
    expect(next.snapshot.phase).toBe("results");
    expect(ranked.proposals()).toBe(offers + 1);
  });

  it.each(["hi", "hello", "thanks"])(
    "answers %s with a reply and leaves the card",
    async (text) => {
      const ranked = await rankedChat();
      const before = ranked.snapshot.resultCards[0];
      const offers = ranked.proposals();
      const held = await runViewportAction({
        action: { type: "composerSubmitted", text },
        snapshot: ranked.snapshot,
        client: ranked.client,
        today,
      });
      expect(held.snapshot.notice).toBe(steerBackLine);
      expect(held.snapshot.brief).toEqual(ranked.snapshot.brief);
      expect(held.snapshot.resultCards).toHaveLength(1);
      expect(held.snapshot.resultCards[0]).toBe(before);
      expect(ranked.proposals()).toBe(offers);
    },
  );

  it("treats a known city and a guest count as answers", async () => {
    const ranked = await rankedChat();
    const before = ranked.snapshot.resultCards[0];
    const offers = ranked.proposals();
    const cityTurn = await runViewportAction({
      action: { type: "composerSubmitted", text: "Gothenburg" },
      snapshot: ranked.snapshot,
      client: ranked.client,
      today,
    });
    expect(cityTurn.snapshot.notice).toBeNull();
    expect(cityTurn.snapshot.brief.city).toBe("Gothenburg");
    expect(cityTurn.snapshot.resultCards).toHaveLength(2);
    expect(cityTurn.snapshot.resultCards[0]).toBe(before);
    expect(cityTurn.snapshot.resultCards[0]?.summary).toContain("Stockholm");
    expect(cityTurn.snapshot.resultCards[1]?.summary).toContain("Gothenburg");
    expect(cityTurn.snapshot.resultCards[1]?.rows.length).toBeGreaterThan(0);
    expect(ranked.proposals()).toBe(offers + 1);
    const countTurn = await runViewportAction({
      action: { type: "composerSubmitted", text: "60" },
      snapshot: cityTurn.snapshot,
      client: ranked.client,
      today,
    });
    expect(countTurn.snapshot.notice).toBeNull();
    expect(countTurn.snapshot.brief.attendeeCount).toBe(60);
    expect(countTurn.snapshot.brief.city).toBe("Gothenburg");
    expect(countTurn.snapshot.resultCards).toHaveLength(3);
    expect(countTurn.snapshot.resultCards[0]).toBe(before);
    expect(countTurn.snapshot.resultCards[1]).toBe(cityTurn.snapshot.resultCards[1]);
    expect(countTurn.snapshot.resultCards[2]?.summary).toContain("60");
    expect(ranked.proposals()).toBe(offers + 2);
  });

  it("appends a card when Apply changes the guest count", async () => {
    const ranked = await rankedChat();
    const before = ranked.snapshot.resultCards[0];
    const edited = await runViewportAction({
      action: { type: "moreEdited", details: { attendeeCount: "45" } },
      snapshot: ranked.snapshot,
      client: ranked.client,
      today,
    });
    expect(edited.snapshot.brief.attendeeCount).toBe(45);
    expect(edited.snapshot.resultCards).toHaveLength(2);
    expect(edited.snapshot.resultCards[0]).toBe(before);
    expect(edited.snapshot.resultCards[0]?.summary).toContain("40");
    expect(edited.snapshot.resultCards[1]?.summary).toContain("45");
    expect(edited.snapshot.resultCards[1]?.id).not.toBe(before?.id);
  });

  it("appends a card when Save in results changes the brief", async () => {
    const ranked = await rankedChat();
    const before = ranked.snapshot.resultCards[0];
    const saved = await runViewportAction({
      action: { type: "inlineAnswered", field: "contactEmail", value: "planner@northwind.example" },
      snapshot: ranked.snapshot,
      client: ranked.client,
      today,
    });
    expect(saved.snapshot.brief.contactEmail).toBe("planner@northwind.example");
    expect(saved.snapshot.filing).toBeNull();
    expect(saved.snapshot.resultCards).toHaveLength(2);
    expect(saved.snapshot.resultCards[0]).toBe(before);
    expect(saved.snapshot.resultCards[1]?.id).not.toBe(before?.id);
  });

  it("appends a card when a favourite changes the ranking", async () => {
    const ranked = await rankedChat();
    const before = ranked.snapshot.resultCards[0];
    expect(before?.rows.find((row) => row.venueName === "Harbour House")?.favorite).not.toBe(true);
    const marked = await runViewportAction({
      action: { type: "favoritesSubmitted", text: "Harbour House" },
      snapshot: ranked.snapshot,
      client: ranked.client,
      today,
    });
    expect(marked.snapshot.resultCards).toHaveLength(2);
    expect(marked.snapshot.resultCards[0]).toBe(before);
    expect(marked.snapshot.resultCards[1]?.rows.find((row) => row.venueName === "Harbour House")?.favorite).toBe(true);
    const same = await runViewportAction({
      action: { type: "favoritesSubmitted", text: "skip" },
      snapshot: ranked.snapshot,
      client: ranked.client,
      today,
    });
    expect(same.snapshot.resultCards).toHaveLength(1);
    expect(same.snapshot.resultCards[0]).toBe(before);
  });

  it("expands the latest card in place for show more", async () => {
    const ranked = await rankedChat();
    const before = ranked.snapshot.resultCards[0];
    const tight = {
      ...ranked.snapshot,
      visibleRowCount: 1,
      resultCards: before === undefined ? [] : [{ ...before, rows: before.rows.slice(0, 1) }],
    };
    const opened = await runViewportAction({
      action: { type: "showMore" },
      snapshot: tight,
      client: ranked.client,
      today,
    });
    expect(opened.snapshot.resultCards).toHaveLength(1);
    expect(opened.snapshot.resultCards[0]?.id).toBe(before?.id);
    expect(opened.snapshot.resultCards[0]?.rows.length).toBeGreaterThan(1);
    const second = nextResultCard(opened.snapshot.resultCards, "later", opened.snapshot.grid, "later");
    const withSecond = {
      ...opened.snapshot,
      resultCards: withResultCard(opened.snapshot.resultCards, second),
      visibleRowCount: 1,
    };
    const again = await runViewportAction({
      action: { type: "showMore" },
      snapshot: withSecond,
      client: ranked.client,
      today,
    });
    expect(again.snapshot.resultCards[0]).toBe(withSecond.resultCards[0]);
    expect(again.snapshot.resultCards[1]?.id).toBe(second.id);
    expect(again.snapshot.resultCards[1]?.rows.length).toBeGreaterThan(1);
  });

  it("appends a two-row card for pick only two and replies when it cannot narrow", async () => {
    const ranked = await rankedChat();
    const before = ranked.snapshot.resultCards[0];
    const offers = ranked.proposals();
    expect(venueNames(before).length).toBeGreaterThan(2);
    const narrowed = await runViewportAction({
      action: { type: "composerSubmitted", text: "pick only two" },
      snapshot: ranked.snapshot,
      client: ranked.client,
      today,
    });
    expect(narrowed.snapshot.resultCards).toHaveLength(2);
    expect(narrowed.snapshot.resultCards[0]).toBe(before);
    expect(narrowed.snapshot.resultCards[1]?.rows).toHaveLength(2);
    expect(venueNames(narrowed.snapshot.resultCards[1])).toEqual(venueNames(before).slice(0, 2));
    expect(ranked.proposals()).toBe(offers);
    const stuck = await runViewportAction({
      action: { type: "composerSubmitted", text: "pick only two" },
      snapshot: narrowed.snapshot,
      client: ranked.client,
      today,
    });
    expect(stuck.snapshot.notice).toBe(cannotNarrowLine);
    expect(stuck.snapshot.notice?.length).toBeGreaterThan(0);
    expect(stuck.snapshot.resultCards).toHaveLength(2);
    expect(stuck.snapshot.resultCards[0]).toBe(before);
    expect(stuck.snapshot.resultCards[1]).toBe(narrowed.snapshot.resultCards[1]);
    expect(ranked.proposals()).toBe(offers);
  });

  it.each(["pick two", "only two", "just the top two"])(
    "narrows for %s and replies when it cannot",
    async (text) => {
      const ranked = await rankedChat();
      const before = ranked.snapshot.resultCards[0];
      const offers = ranked.proposals();
      const narrowed = await runViewportAction({
        action: { type: "composerSubmitted", text },
        snapshot: ranked.snapshot,
        client: ranked.client,
        today,
      });
      expect(narrowed.snapshot.resultCards).toHaveLength(2);
      expect(narrowed.snapshot.resultCards[0]).toBe(before);
      expect(narrowed.snapshot.resultCards[1]?.rows).toHaveLength(2);
      expect(ranked.proposals()).toBe(offers);
      const stuck = await runViewportAction({
        action: { type: "composerSubmitted", text },
        snapshot: narrowed.snapshot,
        client: ranked.client,
        today,
      });
      expect(stuck.snapshot.notice).toBe(cannotNarrowLine);
      expect(stuck.snapshot.resultCards).toHaveLength(2);
      expect(stuck.snapshot.resultCards[1]).toBe(narrowed.snapshot.resultCards[1]);
      expect(ranked.proposals()).toBe(offers);
    },
  );
});

describe("result card helpers", () => {
  it("builds, appends, and rewrites only the latest card", () => {
    expect(asksForTwo("pick only two")).toBe(true);
    expect(asksForTwo("  Please pick only two. ")).toBe(true);
    expect(asksForTwo("pick two")).toBe(true);
    expect(asksForTwo("only two")).toBe(true);
    expect(asksForTwo("just the top two")).toBe(true);
    expect(asksForTwo("show the venues")).toBe(false);
    expect(twoRowSlice([{ venueName: "A" } as ResultCard["rows"][number]])).toBeNull();
    const rows = [
      { venueName: "A" },
      { venueName: "B" },
      { venueName: "C" },
    ] as ResultCard["rows"];
    expect(twoRowSlice(rows)?.map((row) => row.venueName)).toEqual(["A", "B"]);
    expect(narrowToTwo(rows.slice(0, 2))).toEqual({ kind: "reply", text: cannotNarrowLine });
    expect(narrowToTwo(rows)).toEqual({ kind: "card", rows: rows.slice(0, 2) });
    expect(holdReply(false)).toBe(holdLine);
    expect(holdReply(true)).toBe(steerBackLine);
    expect(cardSummary({ count: 1, city: "Stockholm", attendees: 1 })).toBe("1 offer · Stockholm · 1 guest");
    expect(cardSummary({ count: 3, city: "", attendees: 40 })).toBe("3 offers · 40 guests");
    expect(cardSummary({ count: 2, city: undefined, attendees: undefined })).toBe("2 offers");
    const first = nextResultCard([], "Stockholm", rows, "3 offers");
    const cards = withResultCard([], first);
    const second = nextResultCard(cards, "pick only two", rows.slice(0, 2), "2 offers");
    const appended = withResultCard(cards, second);
    expect(appended[0]).toBe(first);
    const rewritten = rewriteLatestCard(appended, rows.slice(0, 1), "1 offer");
    expect(rewritten[0]).toBe(first);
    expect(rewritten[1]).not.toBe(second);
    expect(rewritten[1]?.rows).toHaveLength(1);
    expect(rewriteLatestCard([], rows, "none")).toEqual([]);
    const seeded = rememberRank({
      cards: [],
      rows,
      visibleRowCount: 5,
      record: "seed",
      query: "",
      activeQuery: "Stockholm day",
      city: "Stockholm",
      attendees: 40,
    });
    expect(seeded[0]?.query).toBe("Stockholm day");
    expect(seeded[0]?.rows).toHaveLength(3);
    const kept = rememberRank({
      cards: seeded,
      rows,
      visibleRowCount: 1,
      record: "seed",
      query: "ignored",
      activeQuery: "Stockholm day",
      city: "Stockholm",
      attendees: 40,
    });
    expect(kept[0]).toBe(seeded[0]);
    expect(kept).toHaveLength(1);
    const rankedAppend = rememberRank({
      cards: seeded,
      rows,
      visibleRowCount: 2,
      record: "append",
      query: "Gothenburg",
      activeQuery: "Stockholm day",
      city: "Gothenburg",
      attendees: 12,
    });
    expect(rankedAppend[0]).toBe(seeded[0]);
    expect(rankedAppend[1]?.query).toBe("Gothenburg");
    expect(rankedAppend[1]?.rows).toHaveLength(2);
    expect(rankedAppend[1]?.summary).toBe("2 offers · Gothenburg · 12 guests");
    const refreshed = rememberRank({
      cards: rankedAppend,
      rows,
      visibleRowCount: 1,
      record: "refresh",
      query: "",
      activeQuery: "",
      city: undefined,
      attendees: 1,
    });
    expect(refreshed[0]).toBe(seeded[0]);
    expect(refreshed[1]?.rows).toHaveLength(1);
    expect(refreshed[1]?.summary).toBe("1 offer · 1 guest");
    const followed = rememberRank({
      cards: seeded,
      rows,
      visibleRowCount: 3,
      record: "follow",
      query: "",
      activeQuery: "Stockholm day",
      city: "Stockholm",
      attendees: 40,
    });
    expect(followed).toHaveLength(1);
    expect(followed[0]).toBe(seeded[0]);
    const marked = rows.map((row, index) => ({ ...row, favorite: index === 0 }));
    const followedNext = rememberRank({
      cards: seeded,
      rows: marked,
      visibleRowCount: 3,
      record: "follow",
      query: "Harbour House",
      activeQuery: "Stockholm day",
      city: "Stockholm",
      attendees: 40,
    });
    expect(followedNext).toHaveLength(2);
    expect(followedNext[0]).toBe(seeded[0]);
    expect(followedNext[1]?.rows[0]?.favorite).toBe(true);
    const shorter = rememberRank({
      cards: [],
      rows: rows.slice(0, 1),
      visibleRowCount: 1,
      record: "follow",
      query: "one",
      activeQuery: "",
      city: undefined,
      attendees: undefined,
    });
    expect(shorter).toHaveLength(1);
  });
});
