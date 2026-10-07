import { describe, expect, it } from "vitest";
import packageJson from "../package.json";
import { companyFixtures } from "../src/contract/fixtures";
import { sampleBrief } from "../src/proposales/fixture-client";
import {
  createHttpClient,
  plannerUserAgent,
  proposalFetchLimit,
  readCompany,
  readProposalData,
  readSearchUuid,
  requireInboxToken,
} from "../src/proposales/http-client";

const origin = "https://api.proposales.com";

describe("http readers", () => {
  it("reads a company, a search row, and a proposal envelope", () => {
    expect(readCompany({ id: 3, name: "Desk", inbox_token: null })).toEqual([
      { id: 3, name: "Desk", inboxToken: null },
    ]);
    expect(readCompany({ id: 4, name: "Desk" })).toEqual([{ id: 4, name: "Desk", inboxToken: null }]);
    expect(readCompany({ id: "nope" })).toEqual([]);
    expect(readSearchUuid({ uuid: "abc", data: { planner_bench_brief: false } })).toEqual(["abc"]);
    expect(readSearchUuid({ uuid: "abc", data: { planner_bench_brief: true } })).toEqual([]);
    expect(readSearchUuid({ title: "missing" })).toEqual([]);
    expect(readProposalData({ data: { title: "Hall" } })).toEqual([{ title: "Hall" }]);
    expect(readProposalData({ nope: true })).toEqual([]);
    expect(requireInboxToken("inbox-harbour")).toBe("inbox-harbour");
    expect(() => requireInboxToken(null)).toThrow("Inbox token missing");
    expect(() => requireInboxToken("")).toThrow("Inbox token missing");
  });

  it("sends auth and content type only when the request needs them", async () => {
    const calls: { url: string; method: string; authorization: string | null; contentType: string | null; accept: string | null; userAgent: string | null }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const headers = new Headers(init?.headers);
      calls.push({
        url: String(input),
        method: init?.method ?? "",
        authorization: headers.get("authorization"),
        contentType: headers.get("content-type"),
        accept: headers.get("accept"),
        userAgent: headers.get("user-agent"),
      });
      const url = String(input);
      if (url.endsWith("/v3/companies")) {
        return Response.json({ data: [...companyFixtures, { id: "skip" }] });
      }
      if (url.includes("/v1/inbox/")) {
        return Response.json({ id: 9 });
      }
      if (init?.method === "POST") {
        return Response.json({ proposal: { uuid: "22222222-2222-4222-8222-222222222222", url: `${origin}/p` } });
      }
      return Response.json({ data: { title: "Harbour House" } });
    };
    const client = createHttpClient({ apiKey: "test-key", fetchImpl });
    expect(client.readsLiveProposals).toBe(true);
    expect(plannerUserAgent).toBe(`planner-bench/${packageJson.version}`);
    expect(await client.listCompanies()).toEqual([
      { id: companyFixtures[0].id, name: companyFixtures[0].name, inboxToken: companyFixtures[0].inbox_token },
      { id: companyFixtures[1].id, name: companyFixtures[1].name, inboxToken: null },
    ]);
    expect(calls[0]?.contentType).toBeNull();
    expect(calls[0]?.authorization).toBe("Bearer test-key");
    expect(calls[0]?.accept).toBe("application/json");
    expect(calls[0]?.userAgent).toBe(`planner-bench/${packageJson.version}`);
    expect(calls[0]).toMatchObject({ url: `${origin}/v3/companies`, method: "GET" });

    expect(await client.fileBrief(sampleBrief(1))).toEqual({ path: "inbox", id: 9 });
    const inbox = calls.find((call) => call.url.includes("/v1/inbox/"));
    expect(inbox?.authorization).toBeNull();
    expect(inbox?.contentType).toBe("application/json");

    expect(await client.fileBrief(sampleBrief(2))).toEqual({
      path: "draft",
      uuid: "22222222-2222-4222-8222-222222222222",
    });
    const proposalUuid = "22222222-2222-4222-8222-222222222222";
    expect(await client.getProposal(proposalUuid)).toMatchObject({ title: "Harbour House" });
    await expect(client.fileBrief(sampleBrief(99))).rejects.toThrow("Unknown company 99");
    expect(calls.map((call) => ({ url: call.url, method: call.method, authorization: call.authorization }))).toEqual([
      { url: `${origin}/v3/companies`, method: "GET", authorization: "Bearer test-key" },
      { url: `${origin}/v3/companies`, method: "GET", authorization: "Bearer test-key" },
      { url: `${origin}/v1/inbox/inbox-harbour`, method: "POST", authorization: null },
      { url: `${origin}/v3/companies`, method: "GET", authorization: "Bearer test-key" },
      { url: `${origin}/v3/proposals`, method: "POST", authorization: "Bearer test-key" },
      { url: `${origin}/v3/proposals/${proposalUuid}`, method: "GET", authorization: "Bearer test-key" },
      { url: `${origin}/v3/companies`, method: "GET", authorization: "Bearer test-key" },
    ]);
  });

  it("drops bench briefs and unreadable proposals, and limits the fetch", async () => {
    expect(proposalFetchLimit).toBe(5);
    const drafts = Array.from({ length: 6 }, (_, index) => ({
      uuid: `30000000-0000-4000-8000-${(index + 1).toString().padStart(12, "0")}`,
      title: `Draft ${index + 1}`,
    }));
    let inFlight = 0;
    let maxInFlight = 0;
    const calls: { url: string; method: string; authorization: string | null }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({
        url,
        method: init?.method ?? "",
        authorization: new Headers(init?.headers).get("authorization"),
      });
      if (url.includes("/v3/proposal-search")) {
        return Response.json({
          data: [
            { title: "no uuid" },
            { uuid: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", data: { planner_bench_brief: true } },
            ...drafts.map((draft) => ({ uuid: draft.uuid, data: {} })),
          ],
        });
      }
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      if (url.includes(drafts[0]?.uuid ?? "missing")) {
        return Response.json({ nope: true });
      }
      const draft = drafts.find((item) => url.includes(item.uuid));
      if (draft === undefined) {
        return Response.json({ data: null }, { status: 503 });
      }
      return Response.json({ data: draft });
    };
    const client = createHttpClient({ apiKey: "test-key", fetchImpl, baseUrl: origin });
    const proposals = await client.loadVenueProposals();
    expect(proposals).toEqual(drafts.slice(1));
    expect(maxInFlight).toBe(5);
    expect(calls[0]).toEqual({
      url: `${origin}/v3/proposal-search?limit=25`,
      method: "GET",
      authorization: "Bearer test-key",
    });
    expect(calls.slice(1)).toEqual(
      drafts.map((draft) => ({
        url: `${origin}/v3/proposals/${draft.uuid}`,
        method: "GET",
        authorization: "Bearer test-key",
      })),
    );
    const empty = createHttpClient({
      apiKey: "test-key",
      baseUrl: origin,
      fetchImpl: async () => Response.json({ data: [] }),
    });
    expect(await empty.loadVenueProposals()).toEqual([]);
    const failing = createHttpClient({
      apiKey: "test-key",
      baseUrl: origin,
      fetchImpl: async () => new Response("no", { status: 503 }),
    });
    await expect(failing.listCompanies()).rejects.toThrow("Proposales request failed: 503");
  });
});
