import { describe, expect, it } from "vitest";
import { companyFixtures, harbourHouseProposal } from "../src/contract/fixtures";
import { normaliseProposal } from "../src/domain/normalise-proposal";
import { createClient, resolveMode } from "../src/proposales/client";
import { draftBody, filingPath, inboxBody } from "../src/proposales/filing";
import { createFixtureClient, sampleBrief } from "../src/proposales/fixture-client";
import { createHttpClient, plannerUserAgent, proposalFetchLimit } from "../src/proposales/http-client";
import { liveDraftProposals, liveSearchItem } from "./live-draft-proposals";

describe("proposales mode", () => {
  it("uses fixtures unless the mode is live", () => {
    expect(resolveMode({})).toBe("fixture");
    expect(resolveMode({ PROPOSALES_MODE: "fixture" })).toBe("fixture");
    expect(resolveMode({ PROPOSALES_MODE: "live" })).toBe("live");
  });

  it("refuses a live client without an API key", () => {
    expect(() => createClient({ PROPOSALES_MODE: "live" })).toThrow(/PROPOSALES_API_KEY/);
  });

  it("returns the fixture client by default", async () => {
    const client = createClient({});
    const companies = await client.listCompanies();
    expect(companies.map((company) => company.inboxToken)).toEqual(["inbox-harbour", null]);
  });

  it("does not call the network when the mode is unset", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error("fixture mode called the network");
    };
    const client = createClient({}, fetchImpl);
    await client.listCompanies();
    await client.fileBrief(sampleBrief(1));
    await client.loadVenueProposals();
  });
});

describe("filing path", () => {
  it("files through the inbox when a token is set", () => {
    expect(filingPath("inbox-harbour")).toBe("inbox");
  });

  it("files a draft when the token is missing", () => {
    expect(filingPath(null)).toBe("draft");
    expect(filingPath("")).toBe("draft");
  });

  it("marks inbox requests as tests and keeps the draft brief in data", () => {
    const brief = sampleBrief(1);
    expect(inboxBody(brief).is_test).toBe("1");
    expect(draftBody(brief).data.message).toBe(brief.message);
    expect(draftBody(brief).data.planner_bench_brief).toBe(true);
    expect(draftBody(brief).company_id).toBe(1);
    expect(inboxBody(brief)).not.toHaveProperty("planner_bench_brief");
  });
});

describe("fixture client", () => {
  it("returns an RFP id when the company has an inbox", async () => {
    const client = createFixtureClient();
    const filed = await client.fileBrief(sampleBrief(1));
    expect(filed).toEqual({ path: "inbox", id: 100 });
  });

  it("stores a draft when the company has no inbox", async () => {
    const client = createFixtureClient();
    const filed = await client.fileBrief(sampleBrief(2));
    expect(filed.path).toBe("draft");
    if (filed.path !== "draft") {
      return;
    }
    const stored = await client.getProposal(filed.uuid);
    expect(stored).toMatchObject({
      company_id: 2,
      data: { email: "planner@example.com" },
    });
  });
});

describe("http client", () => {
  it("posts the inbox without the API key and the draft with it", async () => {
    const calls: { url: string; authorization: string | null; userAgent: string | null; body: unknown }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      calls.push({
        url,
        authorization: headers.get("authorization"),
        userAgent: headers.get("user-agent"),
        body: init?.body === undefined ? null : JSON.parse(String(init.body)),
      });
      if (url.endsWith("/v3/companies")) {
        return Response.json({ data: companyFixtures });
      }
      if (url.includes("/v1/inbox/")) {
        return Response.json({ id: 55 });
      }
      if (url.endsWith("/v3/proposals") && init?.method === "POST") {
        return Response.json({
          proposal: {
            uuid: "11111111-1111-4111-8111-111111111111",
            url: "https://example.test/proposal",
          },
        });
      }
      return Response.json({ data: harbourHouseProposal });
    };

    const client = createHttpClient({
      apiKey: "test-key",
      fetchImpl,
      baseUrl: "https://api.proposales.com",
    });

    const inbox = await client.fileBrief(sampleBrief(1));
    expect(inbox).toEqual({ path: "inbox", id: 55 });
    const inboxCall = calls.find((call) => call.url.includes("/v1/inbox/inbox-harbour"));
    expect(inboxCall?.authorization).toBeNull();
    expect(inboxCall?.userAgent).toBe(plannerUserAgent);
    expect(inboxCall?.body).toMatchObject({ is_test: "1", email: "planner@example.com" });
    expect(calls.every((call) => call.userAgent === plannerUserAgent)).toBe(true);

    const draft = await client.fileBrief(sampleBrief(2));
    expect(draft).toEqual({
      path: "draft",
      uuid: "11111111-1111-4111-8111-111111111111",
    });
    const draftCall = calls.find(
      (call) => call.url.endsWith("/v3/proposals") && call.body !== null,
    );
    expect(draftCall?.authorization).toBe("Bearer test-key");
    expect(draftCall?.body).toMatchObject({
      company_id: 2,
      data: {
        message: "40 rooms, 12 to 14 April, one plenary.",
        planner_bench_brief: true,
      },
    });

    const proposal = await client.getProposal("11111111-1111-4111-8111-111111111111");
    expect(proposal).toMatchObject({ title: "Harbour House", blocks: harbourHouseProposal.blocks });
    const readCall = calls.find((call) => call.url.includes("/v3/proposals/11111111"));
    expect(readCall?.authorization).toBe("Bearer test-key");
  });

  it("loads every draft from proposal search and sends the planner user agent", async () => {
    const calls: { url: string; userAgent: string | null }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, userAgent: new Headers(init?.headers).get("user-agent") });
      if (url.includes("/v3/proposal-search")) {
        return Response.json({ data: liveDraftProposals.map(liveSearchItem) });
      }
      const proposal = liveDraftProposals.find((item) => url.includes(item.uuid));
      if (proposal !== undefined) {
        return Response.json({ data: proposal });
      }
      return Response.json({ data: [] }, { status: 404 });
    };
    const client = createHttpClient({
      apiKey: "test-key",
      fetchImpl,
      baseUrl: "https://api.proposales.com",
    });
    const proposals = await client.loadVenueProposals();
    expect(proposals).toHaveLength(liveDraftProposals.length);
    expect(proposals.map((proposal) => statusOf(proposal))).toEqual(["draft", "draft", "draft"]);
    expect(calls.map((call) => call.userAgent)).toEqual(calls.map(() => plannerUserAgent));
    expect(calls.some((call) => call.url.includes("/v3/proposal-search"))).toBe(true);
    expect(plannerUserAgent).toBe("planner-bench/0.1.0");
  });

  it("fetches draft proposals a few at a time and keeps the planner user agent", async () => {
    expect(proposalFetchLimit).toBeGreaterThanOrEqual(4);
    expect(proposalFetchLimit).toBeLessThanOrEqual(6);
    const drafts = Array.from({ length: 12 }, (_, index) => ({
      uuid: `20000000-0000-4000-8000-${(index + 1).toString().padStart(12, "0")}`,
      title: `Draft ${index + 1}`,
      status: "draft",
      blocks: [],
    }));
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      expect(new Headers(init?.headers).get("user-agent")).toBe(plannerUserAgent);
      if (url.includes("/v3/proposal-search")) {
        return Response.json({
          data: drafts.map((draft) => ({ uuid: draft.uuid, data: {} })),
        });
      }
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight -= 1;
      const draft = drafts.find((item) => url.includes(item.uuid));
      if (draft === undefined) {
        return Response.json({ data: [] }, { status: 404 });
      }
      return Response.json({ data: draft });
    };
    const client = createHttpClient({
      apiKey: "test-key",
      fetchImpl,
      baseUrl: "https://api.proposales.com",
    });
    const proposals = await client.loadVenueProposals();
    expect(proposals.map((proposal) => titleOf(proposal))).toEqual(drafts.map((draft) => draft.title));
    expect(maxInFlight).toBe(proposalFetchLimit);
  });

  it("skips a filed brief and still fetches seeded venue drafts", async () => {
    const briefUuid = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/v3/proposal-search")) {
        return Response.json({
          data: [
            ...liveDraftProposals.map((proposal) => ({
              ...liveSearchItem(proposal),
              data: { planner_bench_seed: true },
            })),
            {
              company_id: 9,
              created_at: 1_700_000_200,
              data: {
                email: "planner@example.com",
                message: "A place in Stockholm.",
                planner_bench_brief: true,
              },
              series_uuid: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
              status: "draft",
              title: "Stockholm, 2026-11-12",
              updated_at: 1_700_000_300,
              url: `https://example.test/proposals/${briefUuid}`,
              uuid: briefUuid,
              version: 1,
            },
          ],
        });
      }
      if (url.includes(briefUuid)) {
        return Response.json({ data: { title: "Stockholm, 2026-11-12", uuid: briefUuid } });
      }
      const proposal = liveDraftProposals.find((item) => url.includes(item.uuid));
      if (proposal !== undefined) {
        return Response.json({ data: proposal });
      }
      return Response.json({ data: [] }, { status: 404 });
    };
    const client = createHttpClient({
      apiKey: "present",
      fetchImpl,
      baseUrl: "https://api.proposales.com",
    });
    const proposals = await client.loadVenueProposals();
    expect(proposals.map((proposal) => normaliseProposal(proposal).venueName)).toEqual([
      "Harbour House",
      "Ridge Hall",
      "Canal Loft",
    ]);
    expect(calls.some((url) => url.includes(briefUuid))).toBe(false);
    expect(calls.some((url) => url.includes("/v3/proposal-search"))).toBe(true);
  });

  it("reads a company and draft proposals when formats and nulls do not match the strict schema", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/v3/companies")) {
        return Response.json({
          data: [
            {
              id: 9,
              name: "Example Desk",
              inbox_token: null,
              currency: "EUR",
              tax_mode: "standard",
              timezone: null,
              website_url: "not a url",
              created_at: 1_700_000_000,
            },
          ],
        });
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
    const client = createHttpClient({
      apiKey: "present",
      fetchImpl,
      baseUrl: "https://api.proposales.com",
    });
    const companies = await client.listCompanies();
    expect(companies).toEqual([{ id: 9, name: "Example Desk", inboxToken: null }]);
    const proposals = await client.loadVenueProposals();
    expect(proposals).toHaveLength(3);
    expect(proposals.map((proposal) => normaliseProposal(proposal).venueName)).toEqual([
      "Harbour House",
      "Ridge Hall",
      "Canal Loft",
    ]);
    expect(JSON.stringify(proposals.map((proposal) => normaliseProposal(proposal)))).not.toContain(
      "Example Desk",
    );
  });
});

function titleOf(proposal: unknown): string {
  if (typeof proposal !== "object" || proposal === null) {
    return "";
  }
  const title = Reflect.get(proposal, "title");
  return typeof title === "string" ? title : "";
}

function statusOf(proposal: unknown): string {
  if (typeof proposal !== "object" || proposal === null) {
    return "";
  }
  const status = Reflect.get(proposal, "status");
  return typeof status === "string" ? status : "";
}
