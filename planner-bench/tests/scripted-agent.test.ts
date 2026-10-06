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

const today = "2026-10-06";

const plainEnglishBrief =
  "I need a place in Stockholm for 40 people on 12 November 2026, with dinner and a meeting room.";

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
      action: { type: "captureSubmitted", text: northwindDayTranscript },
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
  });

  it("files a draft when the selected company has no inbox token", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    const captured = await runViewportAction({
      action: { type: "captureSubmitted", text: northwindDayTranscript },
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

  it("refuses to leave confirm when an overnight brief has no room count", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    const captured = await runViewportAction({
      action: {
        type: "captureSubmitted",
        text: lumenOvernightTranscript.replace("Rooms 10. ", ""),
      },
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
    expect(confirmed.snapshot.filing).toBeNull();
    expect(confirmed.snapshot.phase).toBe("confirm");
    expect(confirmed.snapshot.nextQuestion.toLowerCase()).toContain("rooms");
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
    expect(captured.snapshot.gaps.length).toBeGreaterThan(0);
    expect(captured.snapshot.nextQuestion.length).toBeGreaterThan(0);
  });

  it("answers a turn request with no model key", async () => {
    const response = await handlePlannerTurn(
      new Request("http://planner-bench.test/api/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: { type: "captureSubmitted", text: northwindDayTranscript },
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
