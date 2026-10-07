import { describe, expect, it } from "vitest";
import { harbourHouseProposal } from "../src/contract/fixtures";
import { openingSnapshot } from "../src/flow/chat-request";
import { runViewportAction } from "../src/flow/viewport-turn";
import { loadComparableProposals } from "../src/proposales/comparable-proposals";
import { draftBody, draftCreatedNotice, draftTitle } from "../src/proposales/filing";
import { sampleBrief } from "../src/proposales/fixture-client";
import type { BriefDraft, FileBriefResult, ProposalesClient } from "../src/proposales/types";
import { shellViewModel } from "../src/view-models/selectors";

const liveCompany = { id: 9, name: "Live Desk", inboxToken: null };

function stubClient(loadVenueProposals: ProposalesClient["loadVenueProposals"]): {
  client: ProposalesClient;
  filings: BriefDraft[];
  companyReads: number;
} {
  const filings: BriefDraft[] = [];
  const counts = { companyReads: 0 };
  return {
    filings,
    get companyReads() {
      return counts.companyReads;
    },
    client: {
      async listCompanies() {
        counts.companyReads += 1;
        return [liveCompany];
      },
      async fileBrief(brief) {
        filings.push(brief);
        const result: FileBriefResult = {
          path: "draft",
          uuid: "22222222-2222-4222-8222-222222222222",
        };
        return result;
      },
      async getProposal() {
        return {};
      },
      loadVenueProposals,
    },
  };
}

describe("live proposals with a stubbed client", () => {
  it("keeps live proposals when the account has some", async () => {
    const stub = stubClient(async () => [harbourHouseProposal]);
    const loaded = await loadComparableProposals(stub.client);
    expect(loaded.sample).toBe(false);
    expect(loaded.proposals).toEqual([harbourHouseProposal]);
    await stub.client.listCompanies();
    await stub.client.fileBrief(sampleBrief(9));
    expect(stub.companyReads).toBe(1);
    expect(stub.filings).toHaveLength(1);
  });

  it("shows fixture offers when the live account has none", async () => {
    const stub = stubClient(async () => []);
    const loaded = await loadComparableProposals(stub.client);
    expect(loaded.sample).toBe(true);
    expect(loaded.proposals.map((proposal) => titleOf(proposal))).toEqual([
      "Harbour House",
      "Ridge Hall",
      "Canal Loft",
    ]);
  });

  it("shows fixture offers when loading live proposals throws", async () => {
    const stub = stubClient(async () => {
      throw new Error("proposal search failed");
    });
    const loaded = await loadComparableProposals(stub.client);
    expect(loaded.sample).toBe(true);
    expect(loaded.proposals).toHaveLength(3);
    const companies = await stub.client.listCompanies();
    expect(companies).toEqual([liveCompany]);
  });

  it("ranks labelled sample rows and still files through the stub", async () => {
    const stub = stubClient(async () => []);
    const snapshot = openingSnapshot(await stub.client.listCompanies());
    const captured = await runViewportAction({
      action: {
        type: "captureSubmitted",
        text: "I need a place in Stockholm for 40 people on 12 November 2026, from 09:00 to 17:00, with dinner and a meeting room.",
      },
      snapshot,
      client: stub.client,
      today: "2026-10-06",
    });
    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: captured.snapshot,
      client: stub.client,
      today: "2026-10-06",
    });
    const ranked = await runViewportAction({
      action: { type: "favoritesSubmitted", text: "skip" },
      snapshot: confirmed.snapshot,
      client: stub.client,
      today: "2026-10-06",
    });
    expect(ranked.snapshot.sampleOffers).toBe(true);
    expect(ranked.snapshot.grid.map((row) => row.venueName)).toEqual([
      "Harbour House",
      "Canal Loft",
      "Ridge Hall",
    ]);
    expect(stub.filings).toHaveLength(0);
    const filed = await runViewportAction({
      action: {
        type: "moreEdited",
        details: {
          eventTitle: "Northwind offsite",
          organisationName: "Northwind",
          contactEmail: "planner@northwind.example",
          language: "en",
          roomCount: "",
          meetingRoomCount: "",
          foodRequired: "",
          notes: "",
          budget: "",
        },
      },
      snapshot: ranked.snapshot,
      client: stub.client,
      today: "2026-10-06",
    });
    const afterFile = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: filed.snapshot,
      client: stub.client,
      today: "2026-10-06",
    });
    expect(afterFile.snapshot.filing).toEqual({
      path: "draft",
      uuid: "22222222-2222-4222-8222-222222222222",
    });
    expect(stub.filings[0]?.eventTitle).toBe("Northwind offsite");
    expect(afterFile.snapshot.sampleOffers).toBe(true);
    expect(afterFile.snapshot.grid).toHaveLength(3);
    const view = shellViewModel({
      snapshot: afterFile.snapshot,
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(view.sampleOfferLabel).toBe("Sample offers");
    expect(view.draftConfirmation).toBe(draftCreatedNotice);
  });
});

describe("draft title", () => {
  it("uses the event name when the brief has one", () => {
    const title = draftTitle({ ...sampleBrief(9), eventTitle: "Northwind offsite" });
    expect(title).toBe("Northwind offsite");
    expect(draftBody({ ...sampleBrief(9), eventTitle: "Northwind offsite" }).title_md).toBe(
      "Northwind offsite",
    );
  });

  it("uses the city and date when the event name is missing", () => {
    const brief: BriefDraft = {
      ...sampleBrief(9),
      eventTitle: undefined,
      city: "Stockholm",
      startDate: "2026-11-12T09:00:00.000Z",
      message: "",
    };
    expect(draftTitle(brief)).toBe("Stockholm, 2026-11-12");
  });
});

function titleOf(proposal: unknown): string {
  if (typeof proposal !== "object" || proposal === null) {
    return "";
  }
  const title = Reflect.get(proposal, "title");
  return typeof title === "string" ? title : "";
}
