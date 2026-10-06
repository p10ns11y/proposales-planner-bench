import { companyFixtures, venueProposalFixtures } from "../contract/fixtures";
import { draftBody, filingPath } from "./filing";
import type { BriefDraft, CompanyRecord, FileBriefResult, ProposalesClient } from "./types";

const fixtureCompanies: CompanyRecord[] = companyFixtures.map((company) => ({
  id: company.id,
  name: company.name,
  inboxToken: company.inbox_token,
}));

export function createFixtureClient(): ProposalesClient {
  const proposals = new Map<string, unknown>();
  let nextRfpId = 100;
  let nextDraft = 1;

  return {
    async listCompanies() {
      return fixtureCompanies.map((company) => ({ ...company }));
    },
    async fileBrief(brief) {
      const company = fixtureCompanies.find((item) => item.id === brief.companyId);
      if (!company) {
        throw new Error(`Unknown company ${brief.companyId}`);
      }
      const path = filingPath(company.inboxToken);
      if (path === "inbox") {
        const id = nextRfpId;
        nextRfpId += 1;
        const result: FileBriefResult = { path: "inbox", id };
        return result;
      }
      const uuid = `00000000-0000-4000-8000-${String(nextDraft).padStart(12, "0")}`;
      nextDraft += 1;
      proposals.set(uuid, draftBody(brief));
      const result: FileBriefResult = { path: "draft", uuid };
      return result;
    },
    async getProposal(uuid) {
      const stored = proposals.get(uuid);
      if (!stored) {
        throw new Error(`Unknown proposal ${uuid}`);
      }
      return stored;
    },
    async loadVenueProposals() {
      return venueProposalFixtures.map((proposal) => ({ ...proposal, blocks: proposal.blocks.map((block) => ({ ...block })) }));
    },
  };
}

export function sampleBrief(companyId: number): BriefDraft {
  return {
    email: "planner@example.com",
    companyId,
    companyName: "Northwind Events",
    message: "40 rooms, 12 to 14 April, one plenary.",
    language: "en",
    startDate: "2026-04-12T00:00:00.000Z",
    endDate: "2026-04-14T00:00:00.000Z",
  };
}
