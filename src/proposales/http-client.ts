import { z } from "zod";
import packageJson from "../../package.json";
import { draftBody, filingPath, inboxBody, isPlannerBenchBrief } from "./filing";
import { postDraftFile, postInboxFile } from "./file-with-intent";
import type { CompanyRecord, FileBriefResult, ProposalesClient } from "./types";

export const plannerUserAgent = `planner-bench/${packageJson.version}`;

export const proposalFetchLimit = 5;

export const companyReader = z.object({
  id: z.number(),
  name: z.string(),
  inbox_token: z.string().nullable().optional(),
});

export const rfpReader = z.object({
  id: z.number(),
});

export const draftReader = z.object({
  proposal: z.object({
    uuid: z.string(),
    url: z.string(),
  }),
});

export const proposalEnvelopeReader = z.object({
  data: z.unknown(),
});

export const searchEnvelopeReader = z.object({
  data: z.array(z.unknown()),
});

export const searchIdentityReader = z.object({
  uuid: z.string(),
  data: z.unknown().optional(),
});

export type HttpClientOptions = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
};

export function readCompany(item: unknown): CompanyRecord[] {
  const company = companyReader.safeParse(item);
  if (!company.success) {
    return [];
  }
  const record: CompanyRecord = {
    id: company.data.id,
    name: company.data.name,
    inboxToken: company.data.inbox_token ?? null,
  };
  return [record];
}

export function readSearchUuid(item: unknown): string[] {
  const identity = searchIdentityReader.safeParse(item);
  if (!identity.success || isPlannerBenchBrief(identity.data.data)) {
    return [];
  }
  return [identity.data.uuid];
}

export function readProposalData(payload: unknown): unknown[] {
  const envelope = proposalEnvelopeReader.safeParse(payload);
  if (!envelope.success) {
    return [];
  }
  return [envelope.data.data];
}

export function requireInboxToken(token: string | null): string {
  if (token === null || token === "") {
    throw new Error("Inbox token missing");
  }
  return token;
}

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

  async function mapWithLimit<T, R>(
    items: readonly T[],
    limit: number,
    run: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = Array.from({ length: items.length });
    let next = 0;
    async function readNext(): Promise<void> {
      const index = next;
      next += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await run(items[index]);
      await readNext();
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => readNext()));
    return results;
  }

  return {
    readsLiveProposals: true,
    async listCompanies() {
      const body = searchEnvelopeReader.parse(await request("/v3/companies", { method: "GET" }, true));
      return body.data.flatMap(readCompany);
    },
    async fileBrief(brief) {
      const companies = await this.listCompanies();
      const company = companies.find((item) => item.id === brief.companyId);
      if (!company) {
        throw new Error(`Unknown company ${brief.companyId}`);
      }
      const path = filingPath(company.inboxToken);
      if (path === "inbox") {
        const token = requireInboxToken(company.inboxToken);
        const body = inboxBody(brief);
        const payload = rfpReader.parse(await postInboxFile({ request, token, body }));
        const result: FileBriefResult = { path: "inbox", id: payload.id };
        return result;
      }
      const body = draftBody(brief);
      const payload = draftReader.parse(await postDraftFile({ request, body }));
      const result: FileBriefResult = { path: "draft", uuid: payload.proposal.uuid };
      return result;
    },
    async getProposal(uuid) {
      const envelope = proposalEnvelopeReader.parse(
        await request(`/v3/proposals/${encodeURIComponent(uuid)}`, { method: "GET" }, true),
      );
      return envelope.data;
    },
    async loadVenueProposals() {
      const search = searchEnvelopeReader.parse(
        await request("/v3/proposal-search?limit=25", { method: "GET" }, true),
      );
      const uuids = search.data.flatMap(readSearchUuid);
      const fetched = await mapWithLimit(uuids, proposalFetchLimit, async (uuid) => {
        const payload = await request(`/v3/proposals/${encodeURIComponent(uuid)}`, { method: "GET" }, true);
        return readProposalData(payload)[0];
      });
      return fetched.flatMap(keepProposal);
    },
  };
}

function keepProposal(proposal: unknown): unknown[] {
  if (proposal === undefined) {
    return [];
  }
  return [proposal];
}
