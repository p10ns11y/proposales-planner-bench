import { describe, expect, it } from "vitest";
import { readSessionSnapshot } from "../src/flow/chat-request";
import { handlePlannerTurn } from "../src/flow/planner-turn";
import { plannerSnapshotSchema, type PlannerSnapshot } from "../src/flow/planner-snapshot";
import { filingUnavailableNotice } from "../src/proposales/filing";
import type { FileBriefResult, ProposalesClient } from "../src/proposales/types";
import { shellViewModel } from "../src/view-models/selectors";
import { liveAccountCompanyName, liveDraftProposals, liveSearchItem } from "./live-draft-proposals";

const stockholm =
  "I need a place in Stockholm for 40 people on 12 November 2026, from 09:00 to 17:00, with dinner and a meeting room.";

describe("live responses and a failed company list", () => {
  it("opens a session when company lookup throws", async () => {
    const client: ProposalesClient = {
      readsLiveProposals: true,
      async listCompanies() {
        throw new Error("companies down");
      },
      async fileBrief() {
        const result: FileBriefResult = { path: "draft", uuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9" };
        return result;
      },
      async getProposal() {
        return {};
      },
      async loadVenueProposals() {
        return [];
      },
    };
    const snapshot = await readSessionSnapshot(client);
    expect(snapshot.companies).toEqual([]);
    expect(snapshot.filingAvailable).toBe(false);
    expect(snapshot.notice).toBe(filingUnavailableNotice);
    expect(snapshot.filing).toBeNull();
  });

  it("ranks live drafts when company lookup fails and does not 500 the turn", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/v3/companies")) {
        return Response.json({ message: "blocked" }, { status: 500 });
      }
      if (url.includes("/v3/proposal-search")) {
        return Response.json({ data: liveDraftProposals.map(liveSearchItem) });
      }
      const proposal = liveDraftProposals.find((item) => url.includes(item.uuid));
      if (proposal !== undefined) {
        return Response.json({
          data: {
            ...proposal,
            company_email: "not-an-email",
            company_website: "not a url",
            is_agreement: null,
            pending: null,
          },
        });
      }
      return Response.json({ data: [] }, { status: 404 });
    };
    const original = globalThis.fetch;
    globalThis.fetch = fetchImpl;
    try {
      const opened = await postTurn({ type: "captureSubmitted", text: stockholm });
      expect(opened.status).toBe(200);
      expect(opened.snapshot.filingAvailable).toBe(false);
      expect(opened.snapshot.companies).toEqual([]);
      expect(viewOf(opened.snapshot).notice).toBe(filingUnavailableNotice);
      const confirmed = await postTurn({ type: "briefConfirmed" }, opened.snapshot);
      expect(confirmed.status).toBe(200);
      const ranked = await postTurn({ type: "favoritesSubmitted", text: "skip" }, confirmed.snapshot);
      expect(ranked.status).toBe(200);
      expect(ranked.snapshot.offerSource).toBe("live");
      expect(ranked.snapshot.sampleOffers).toBe(false);
      expect(ranked.snapshot.filing).toBeNull();
      expect(ranked.snapshot.grid.map((row) => row.venueName)).toEqual([
        "Canal Loft",
        "Harbour House",
        "Ridge Hall",
      ]);
      expect(ranked.snapshot.grid.map((row) => row.venueName)).not.toContain(liveAccountCompanyName);
      const view = viewOf(ranked.snapshot);
      expect(view.notice).toBe(filingUnavailableNotice);
      expect(view.offerLabel).toBe("Live offers");
      expect(view.draftConfirmation).toBeNull();
    } finally {
      globalThis.fetch = original;
    }
  });
});

function viewOf(snapshot: PlannerSnapshot) {
  return shellViewModel({
    snapshot,
    busy: false,
    errorText: null,
    speechAvailable: false,
  });
}

async function postTurn(
  action: { type: string; text?: string },
  snapshot?: PlannerSnapshot,
): Promise<{ status: number; snapshot: PlannerSnapshot }> {
  const response = await handlePlannerTurn(
    new Request("http://planner-bench.test/api/turn", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, snapshot }),
    }),
    { env: { PROPOSALES_MODE: "live", PROPOSALES_API_KEY: "present" } },
  );
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null) {
    throw new Error(`Turn response ${response.status} was empty`);
  }
  const parsed = plannerSnapshotSchema.safeParse(Reflect.get(payload, "snapshot"));
  if (!parsed.success) {
    throw new Error(`Turn response ${response.status} had no snapshot`);
  }
  return { status: response.status, snapshot: parsed.data };
}
