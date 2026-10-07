import { z } from "zod";
import packageJson from "../../package.json";
import { proposalesSchemas } from "../contract/proposales-schemas";
import { draftBody, filingPath, inboxBody } from "./filing";
import type { CompanyRecord, FileBriefResult, ProposalesClient } from "./types";

export const plannerUserAgent = `planner-bench/${packageJson.version}`;

const companyReader = z.object({
  id: z.number(),
  name: z.string(),
  inbox_token: z.string().nullable().optional(),
});

const rfpReader = z.object({
  id: z.number(),
});

const draftReader = z.object({
  proposal: z.object({
    uuid: z.string(),
    url: z.string(),
  }),
});

const proposalEnvelopeReader = z.object({
  data: z.unknown(),
});

const searchEnvelopeReader = z.object({
  data: z.array(z.unknown()),
});

const searchIdentityReader = z.object({
  uuid: z.string(),
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
    headers.set("user-agent", plannerUserAgent);
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
    const payload: unknown = await response.json();
    return payload;
  }

  return {
    readsLiveProposals: true,
    async listCompanies() {
      const schemas = await proposalesSchemas();
      const body = searchEnvelopeReader.parse(
        await request("/v3/companies", { method: "GET" }, true),
      );
      return body.data.map((item) => {
        schemas.company.parse(item);
        const company = companyReader.parse(item);
        const record: CompanyRecord = {
          id: company.id,
          name: company.name,
          inboxToken: company.inbox_token ?? null,
        };
        return record;
      });
    },
    async fileBrief(brief) {
      const schemas = await proposalesSchemas();
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
        const body = inboxBody(brief);
        schemas.createRfpRequest.parse(body);
        const payload = rfpReader.parse(
          schemas.createRfpResponse.parse(
            await request(
              `/v1/inbox/${encodeURIComponent(token)}`,
              { method: "POST", body: JSON.stringify(body) },
              false,
            ),
          ),
        );
        const result: FileBriefResult = { path: "inbox", id: payload.id };
        return result;
      }
      const body = draftBody(brief);
      schemas.createProposalRequest.parse({
        company_id: body.company_id,
        language: body.language,
        title_md: body.title_md,
      });
      const payload = draftReader.parse(
        schemas.proposalMutationResponse.parse(
          await request("/v3/proposals", { method: "POST", body: JSON.stringify(body) }, true),
        ),
      );
      const result: FileBriefResult = { path: "draft", uuid: payload.proposal.uuid };
      return result;
    },
    async getProposal(uuid) {
      const schemas = await proposalesSchemas();
      const envelope = proposalEnvelopeReader.parse(
        await request(`/v3/proposals/${encodeURIComponent(uuid)}`, { method: "GET" }, true),
      );
      schemas.proposal.parse(envelope.data);
      return envelope.data;
    },
    async loadVenueProposals() {
      const schemas = await proposalesSchemas();
      const search = searchEnvelopeReader.parse(
        await request("/v3/proposal-search?limit=25", { method: "GET" }, true),
      );
      const proposals: unknown[] = [];
      for (const item of search.data) {
        schemas.proposalSearchResult.parse(item);
        const identity = searchIdentityReader.parse(item);
        const envelope = proposalEnvelopeReader.parse(
          await request(
            `/v3/proposals/${encodeURIComponent(identity.uuid)}`,
            { method: "GET" },
            true,
          ),
        );
        schemas.proposal.parse(envelope.data);
        proposals.push(envelope.data);
      }
      return proposals;
    },
  };
}
