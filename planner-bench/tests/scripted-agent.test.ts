import { describe, expect, it } from "vitest";
import {
  lumenOvernightTranscript,
  northwindDayBrief,
  northwindDayTranscript,
} from "../src/contract/fixtures";
import { openingSnapshot } from "../src/flow/chat-request";
import { extractBriefPatch, matchFavoriteVenues } from "../src/flow/fixture-extractor";
import { handlePlannerTurn } from "../src/flow/planner-turn";
import { runViewportAction } from "../src/flow/viewport-turn";
import { createFixtureClient } from "../src/proposales/fixture-client";
import type { ProposalesClient } from "../src/proposales/types";

const today = "2026-10-06";

function watchClient(inner: ProposalesClient): {
  client: ProposalesClient;
  proposals: number;
  filings: number;
} {
  const counts = { proposals: 0, filings: 0 };
  return {
    get proposals() {
      return counts.proposals;
    },
    get filings() {
      return counts.filings;
    },
    client: {
      readsLiveProposals: inner.readsLiveProposals,
      listCompanies: () => inner.listCompanies(),
      getProposal: (uuid) => inner.getProposal(uuid),
      loadVenueProposals: async () => {
        counts.proposals += 1;
        return inner.loadVenueProposals();
      },
      fileBrief: async (brief) => {
        counts.filings += 1;
        return inner.fileBrief(brief);
      },
    },
  };
}

const plainEnglishBrief =
  "I need a place in Stockholm for 40 people on 12 November 2026, with dinner and a meeting room.";

const timedNorthwindTranscript = `${northwindDayTranscript} Start time 09:00. End time 17:00.`;

const stockholmDay =
  "I need a place in Stockholm for 40 people on 12 November 2026, from 09:00 to 17:00, with dinner and a meeting room.";

describe("viewport flow without a model key", () => {
  it("extracts structured transcripts and plain English into brief fields", () => {
    expect(extractBriefPatch(northwindDayTranscript)).toMatchObject({
      eventTitle: "Northwind offsite",
      contactEmail: "ada@northwind.example",
      meetingRoomCount: 2,
      city: "Stockholm",
    });
    expect(extractBriefPatch(northwindDayTranscript).roomCount).toBeUndefined();
    expect(extractBriefPatch(lumenOvernightTranscript).roomCount).toBe(10);
    expect(extractBriefPatch(plainEnglishBrief)).toMatchObject({
      city: "Stockholm",
      attendeeCount: 40,
      startDate: "2026-11-12",
      endDate: "2026-11-12",
      foodRequired: true,
      meetingRoomCount: 1,
    });
  });

  it("matches favorite venue names from free text", () => {
    expect(matchFavoriteVenues("Harbour House and Canal Loft")).toEqual([
      "Harbour House",
      "Canal Loft",
    ]);
    expect(matchFavoriteVenues("skip")).toEqual([]);
  });

  it("files through the first company after confirm and ranks fixture venues", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    const captured = await runViewportAction({
      action: { type: "captureSubmitted", text: timedNorthwindTranscript },
      snapshot,
      client,
      today,
    });
    expect(captured.snapshot.phase).toBe("confirm");
    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: captured.snapshot,
      client,
      today,
    });
    expect(confirmed.snapshot.filing).toEqual({ path: "inbox", id: 100 });
    expect(confirmed.snapshot.phase).toBe("favorites");
    const ranked = await runViewportAction({
      action: { type: "favoritesSubmitted", text: "Ridge Hall" },
      snapshot: confirmed.snapshot,
      client,
      today,
    });
    expect(ranked.snapshot.phase).toBe("results");
    expect(ranked.snapshot.grid.map((row) => row.venueName)).toEqual([
      "Harbour House",
      "Canal Loft",
      "Ridge Hall",
    ]);
    expect(ranked.snapshot.grid[0]?.favorite).toBe(false);
    expect(ranked.snapshot.grid[2]?.favorite).toBe(true);
    expect(ranked.snapshot.grid[1]?.heldByCompanyName).toBe("Quiet Court");
    expect(ranked.snapshot.grid[2]?.heldByCompanyName).toBe("Harbour House");
    expect(ranked.snapshot.grid[0]?.heldByCompanyName).toBeUndefined();
    expect(ranked.snapshot.offerSource).toBe("fixture");
    expect(ranked.snapshot.sampleOffers).toBe(false);
  });

  it("files a draft when the selected company has no inbox token", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    const captured = await runViewportAction({
      action: { type: "captureSubmitted", text: timedNorthwindTranscript },
      snapshot: { ...snapshot, selectedCompanyId: 2 },
      client,
      today,
    });
    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: captured.snapshot,
      client,
      today,
    });
    expect(confirmed.snapshot.filing?.path).toBe("draft");
    if (confirmed.snapshot.filing?.path !== "draft") {
      return;
    }
    const stored = await client.getProposal(confirmed.snapshot.filing.uuid);
    expect(stored).toMatchObject({
      company_id: 2,
      data: { message: "One plenary and dinner." },
    });
  });

  it("matches an overnight brief that has no rooms and still refuses to file it", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    const captured = await runViewportAction({
      action: {
        type: "captureSubmitted",
        text: `${lumenOvernightTranscript.replace("Rooms 10. ", "")} Start time 15:00.`,
      },
      snapshot,
      client,
      today,
    });
    expect(captured.snapshot.nextQuestion.toLowerCase()).not.toContain("rooms");
    expect(captured.snapshot.gaps).not.toContain("roomCount");
    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: captured.snapshot,
      client,
      today,
    });
    expect(confirmed.snapshot.filing).toBeNull();
    expect(confirmed.snapshot.phase).toBe("favorites");
    const refused = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: confirmed.snapshot,
      client,
      today,
    });
    expect(refused.snapshot.filing).toBeNull();
    expect(refused.snapshot.notice?.toLowerCase()).toContain("rooms");
    const ranked = await runViewportAction({
      action: { type: "favoritesSubmitted", text: "" },
      snapshot: confirmed.snapshot,
      client,
      today,
    });
    expect(ranked.snapshot.phase).toBe("results");
    expect(ranked.snapshot.grid).toHaveLength(3);
  });

  it("asks one missing fact after plain English capture", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    const captured = await runViewportAction({
      action: { type: "captureSubmitted", text: plainEnglishBrief },
      snapshot,
      client,
      today,
    });
    expect(captured.snapshot.phase).toBe("confirm");
    expect(captured.snapshot.brief.city).toBe("Stockholm");
    expect(captured.snapshot.brief.attendeeCount).toBe(40);
    expect(captured.snapshot.brief.foodRequired).toBe(true);
    expect(captured.snapshot.brief.meetingRoomCount).toBe(1);
    expect(captured.snapshot.gaps).not.toContain("contactEmail");
    expect(captured.snapshot.nextQuestion.toLowerCase()).not.toContain("email");
    expect(captured.snapshot.gaps[0]).toBe("startTime");
  });

  it("asks one required fact at a time until the brief can be confirmed", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    const captured = await runViewportAction({
      action: { type: "captureSubmitted", text: plainEnglishBrief },
      snapshot,
      client,
      today,
    });
    const withStart = await runViewportAction({
      action: { type: "gapAnswered", text: "09:00" },
      snapshot: captured.snapshot,
      client,
      today,
    });
    expect(withStart.snapshot.brief.startTime).toBe("09:00");
    expect(withStart.snapshot.gaps).toEqual(["endTime"]);
    expect(withStart.snapshot.nextQuestion.toLowerCase()).not.toContain("email");
    const ready = await runViewportAction({
      action: { type: "gapAnswered", text: "17:00" },
      snapshot: withStart.snapshot,
      client,
      today,
    });
    expect(ready.snapshot.brief.endTime).toBe("17:00");
    expect(ready.snapshot.gaps).toEqual([]);
    expect(ready.snapshot.phase).toBe("confirm");
    expect(ready.snapshot.nextQuestion.toLowerCase()).not.toContain("email");
  });

  it("reaches ranked rows from a timed city sentence without asking for email", async () => {
    const client = createFixtureClient();
    const watched = watchClient(client);
    const snapshot = openingSnapshot(await client.listCompanies());
    const captured = await runViewportAction({
      action: { type: "captureSubmitted", text: stockholmDay },
      snapshot,
      client: watched.client,
      today,
    });
    expect(captured.snapshot.phase).toBe("confirm");
    expect(captured.snapshot.gaps).toEqual([]);
    expect(captured.snapshot.nextQuestion.toLowerCase()).not.toContain("email");
    expect(watched.proposals).toBe(0);
    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: captured.snapshot,
      client: watched.client,
      today,
    });
    expect(confirmed.snapshot.filing).toBeNull();
    expect(confirmed.snapshot.phase).toBe("favorites");
    const ranked = await runViewportAction({
      action: { type: "favoritesSubmitted", text: "" },
      snapshot: confirmed.snapshot,
      client: watched.client,
      today,
    });
    expect(ranked.snapshot.phase).toBe("results");
    expect(ranked.snapshot.filing).toBeNull();
    expect(ranked.snapshot.grid.map((row) => row.venueName)).toEqual([
      "Harbour House",
      "Canal Loft",
      "Ridge Hall",
    ]);
    expect(watched.filings).toBe(0);
    expect(watched.proposals).toBe(1);
  });

  it("holds off-topic text before clean, fetch, or rank", async () => {
    const client = createFixtureClient();
    const watched = watchClient(client);
    const snapshot = openingSnapshot(await client.listCompanies());
    const held = await runViewportAction({
      action: { type: "captureSubmitted", text: "Teach me to write a sorting function in Python." },
      snapshot,
      client: watched.client,
      today,
    });
    expect(held.snapshot.phase).toBe("capture");
    expect(held.snapshot.brief).toEqual({});
    expect(held.snapshot.notice?.toLowerCase()).toContain("place for an event");
    expect(held.snapshot.grid).toEqual([]);
    expect(watched.proposals).toBe(0);
    expect(watched.filings).toBe(0);
  });

  it("explains the service and waits", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    const explained = await runViewportAction({
      action: { type: "captureSubmitted", text: "What is this for?" },
      snapshot,
      client,
      today,
    });
    expect(explained.snapshot.phase).toBe("capture");
    expect(explained.snapshot.brief).toEqual({});
    expect(explained.snapshot.notice?.toLowerCase()).toContain("place for an event");
    expect(explained.snapshot.grid).toEqual([]);
  });

  it("asks for a city when the place is not a city", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    const captured = await runViewportAction({
      action: {
        type: "captureSubmitted",
        text: "I need a place near the station for 40 people on 12 November 2026 from 09:00 to 17:00.",
      },
      snapshot,
      client,
      today,
    });
    expect(captured.snapshot.brief.city).toBeUndefined();
    expect(captured.snapshot.gaps[0]).toBe("city");
    expect(captured.snapshot.nextQuestion.toLowerCase()).toContain("city");
  });

  it("writes More fields onto the brief without leaving the match", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    const captured = await runViewportAction({
      action: { type: "captureSubmitted", text: stockholmDay },
      snapshot,
      client,
      today,
    });
    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: captured.snapshot,
      client,
      today,
    });
    const ranked = await runViewportAction({
      action: { type: "favoritesSubmitted", text: "" },
      snapshot: confirmed.snapshot,
      client,
      today,
    });
    const edited = await runViewportAction({
      action: {
        type: "moreEdited",
        details: {
          eventTitle: "Northwind offsite",
          organisationName: "Northwind",
          contactEmail: "planner@northwind.example",
          language: "en",
          roomCount: "",
          meetingRoomCount: "2",
          foodRequired: "yes",
          notes: "One plenary and dinner.",
          budget: "",
        },
      },
      snapshot: ranked.snapshot,
      client,
      today,
    });
    expect(edited.snapshot.phase).toBe("results");
    expect(edited.snapshot.brief.eventTitle).toBe("Northwind offsite");
    expect(edited.snapshot.brief.contactEmail).toBe("planner@northwind.example");
    expect(edited.snapshot.brief.meetingRoomCount).toBe(2);
    expect(edited.snapshot.grid).toHaveLength(3);
    const filed = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: edited.snapshot,
      client,
      today,
    });
    expect(filed.snapshot.filing).toEqual({ path: "inbox", id: 100 });
  });

  it("answers a turn request with no model key", async () => {
    const response = await handlePlannerTurn(
      new Request("http://planner-bench.test/api/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: { type: "captureSubmitted", text: timedNorthwindTranscript },
        }),
      }),
    );
    const body: unknown = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      snapshot: {
        phase: "confirm",
        brief: { eventTitle: northwindDayBrief.eventTitle },
      },
    });
  });
});
