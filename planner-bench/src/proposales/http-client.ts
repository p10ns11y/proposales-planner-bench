import { z } from "zod";
import { draftBody, filingPath, inboxBody } from "./filing";
import type { CompanyRecord, FileBriefResult, ProposalesClient } from "./types";

const companySchema = z.object({
  id: z.number(),
  name: z.string(),
  inbox_token: z.string().nullable(),
});

const companiesSchema = z.object({
  data: z.array(companySchema),
});

const rfpSchema = z.object({
  id: z.number(),
});

const draftSchema = z.object({
  proposal: z.object({
    uuid: z.string(),
    url: z.string(),
  }),
});

const proposalSchema = z.object({
  data: z.unknown(),
});

export type HttpClientOptions = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
};

export function createHttpClient(options: HttpClientOptions): ProposalesClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? "https://api.proposales.com";

  async function request(path: string, init: RequestInit, authorize: boolean): Promise<unknown> {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (init.body !== undefined) {
      headers.set("content-type", "application/json");
    }
    if (authorize) {
      headers.set("authorization", `Bearer ${options.apiKey}`);
    }
    const response = await fetchImpl(`${baseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      throw new Error(`Proposales request failed: ${response.status}`);
    }
    return response.json() as Promise<unknown>;
  }

  return {
    async listCompanies() {
      const body = companiesSchema.parse(await request("/v3/companies", { method: "GET" }, true));
      return body.data.map(
        (company): CompanyRecord => ({
          id: company.id,
          name: company.name,
          inboxToken: company.inbox_token,
        }),
      );
    },
    async fileBrief(brief) {
      const companies = await this.listCompanies();
      const company = companies.find((item) => item.id === brief.companyId);
      if (!company) {
        throw new Error(`Unknown company ${brief.companyId}`);
      }
      const path = filingPath(company.inboxToken);
      if (path === "inbox") {
        const token = company.inboxToken;
        if (token === null || token === "") {
          throw new Error("Inbox token missing");
        }
        const body = rfpSchema.parse(
          await request(
            `/v1/inbox/${encodeURIComponent(token)}`,
            { method: "POST", body: JSON.stringify(inboxBody(brief)) },
            false,
          ),
        );
        const result: FileBriefResult = { path: "inbox", id: body.id };
        return result;
      }
      const body = draftSchema.parse(
        await request(
          "/v3/proposals",
          { method: "POST", body: JSON.stringify(draftBody(brief)) },
          true,
        ),
      );
      const result: FileBriefResult = { path: "draft", uuid: body.proposal.uuid };
      return result;
    },
    async getProposal(uuid) {
      const body = proposalSchema.parse(
        await request(`/v3/proposals/${encodeURIComponent(uuid)}`, { method: "GET" }, true),
      );
      return body.data;
    },
  };
}
