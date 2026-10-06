import { describe, expect, it } from "vitest";
import { createClient, resolveMode } from "../src/proposales/client";
import { draftBody, filingPath, inboxBody } from "../src/proposales/filing";
import { createFixtureClient, sampleBrief } from "../src/proposales/fixture-client";
import { createHttpClient } from "../src/proposales/http-client";

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
    expect(draftBody(brief).company_id).toBe(1);
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
    const calls: { url: string; authorization: string | null; body: unknown }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      calls.push({
        url,
        authorization: headers.get("authorization"),
        body: init?.body === undefined ? null : JSON.parse(String(init.body)),
      });
      if (url.endsWith("/v3/companies")) {
        return Response.json({
          data: [
            { id: 1, name: "Harbour House", inbox_token: "inbox-harbour" },
            { id: 2, name: "Quiet Court", inbox_token: null },
          ],
        });
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
      return Response.json({
        data: { uuid: "11111111-1111-4111-8111-111111111111", blocks: [] },
      });
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
    expect(inboxCall?.body).toMatchObject({ is_test: "1", email: "planner@example.com" });

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
      data: { message: "40 rooms, 12 to 14 April, one plenary." },
    });

    const proposal = await client.getProposal("11111111-1111-4111-8111-111111111111");
    expect(proposal).toMatchObject({ blocks: [] });
    const readCall = calls.find((call) => call.url.includes("/v3/proposals/11111111"));
    expect(readCall?.authorization).toBe("Bearer test-key");
  });
});
