import { describe, expect, it } from "vitest";
import {
  lumenOvernightTranscript,
  northwindDayTranscript,
} from "../src/contract/fixtures";
import { handlePlannerChat } from "../src/flow/planner-chat";
import { openingSnapshot } from "../src/flow/chat-request";
import { extractBriefPatch } from "../src/flow/fixture-extractor";
import { runFixtureTurn } from "../src/flow/scripted-turn";
import { createFixtureClient } from "../src/proposales/fixture-client";

const today = "2026-10-06";

describe("scripted agent without a model key", () => {
  it("extracts a fileable day brief and an overnight brief", () => {
    expect(extractBriefPatch(northwindDayTranscript)).toMatchObject({
      eventTitle: "Northwind offsite",
      contactEmail: "ada@northwind.example",
      meetingRoomCount: 2,
      city: "Stockholm",
    });
    expect(extractBriefPatch(northwindDayTranscript).roomCount).toBeUndefined();
    expect(extractBriefPatch(lumenOvernightTranscript).roomCount).toBe(10);
  });

  it("files through the inbox for the company with a token", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    const collected = await runFixtureTurn({
      text: northwindDayTranscript,
      snapshot,
      client,
      today,
    });
    expect(collected.snapshot.stage).toBe("fileable");
    const filed = await runFixtureTurn({
      text: "file the brief",
      snapshot: collected.snapshot,
      client,
      today,
    });
    expect(filed.snapshot.filing).toEqual({ path: "inbox", id: 100 });
    expect(filed.reply).toContain("inbox");
  });

  it("files a draft when the selected company has no inbox token", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    const collected = await runFixtureTurn({
      text: northwindDayTranscript,
      snapshot: { ...snapshot, selectedCompanyId: 2 },
      client,
      today,
    });
    const filed = await runFixtureTurn({
      text: "file the brief",
      snapshot: collected.snapshot,
      client,
      today,
    });
    expect(filed.snapshot.filing?.path).toBe("draft");
    if (filed.snapshot.filing?.path !== "draft") {
      return;
    }
    const stored = await client.getProposal(filed.snapshot.filing.uuid);
    expect(stored).toMatchObject({
      company_id: 2,
      data: { message: "One plenary and dinner." },
    });
  });

  it("refuses to file when the overnight brief has no room count", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    const collected = await runFixtureTurn({
      text: lumenOvernightTranscript.replace("Rooms 10. ", ""),
      snapshot,
      client,
      today,
    });
    const filed = await runFixtureTurn({
      text: "file the brief",
      snapshot: collected.snapshot,
      client,
      today,
    });
    expect(filed.snapshot.filing).toBeNull();
    expect(filed.reply).toContain("rooms");
  });

  it("adds fixture proposals and builds a comparison grid", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    const collected = await runFixtureTurn({
      text: northwindDayTranscript,
      snapshot,
      client,
      today,
    });
    const filed = await runFixtureTurn({
      text: "file the brief",
      snapshot: collected.snapshot,
      client,
      today,
    });
    const compared = await runFixtureTurn({
      text: "add the venue proposals",
      snapshot: filed.snapshot,
      client,
      today,
    });
    expect(compared.snapshot.stage).toBe("comparing");
    expect(compared.snapshot.offers.map((offer) => offer.venueName)).toEqual([
      "Harbour House",
      "Ridge Hall",
      "Canal Loft",
    ]);
    expect(compared.snapshot.offers[0]?.roomsMinor).toEqual({ unit: "minor", amount: 20_000 });
    expect(compared.snapshot.grid).toHaveLength(3);
    expect(compared.snapshot.grid[2]?.gaps).toContain("expired");
    expect(compared.reply).toContain("comparison grid");
  });

  it("answers a chat request with no model key", async () => {
    const response = await handlePlannerChat(
      new Request("http://planner-bench.test/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", parts: [{ type: "text", text: northwindDayTranscript }] }],
        }),
      }),
      {},
    );
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain("file the brief");
    expect(body).toContain("data-snapshot");
  });
});
