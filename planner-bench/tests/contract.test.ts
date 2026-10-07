import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  companyFixtures,
  companyWithInbox,
  companyWithoutInbox,
  harbourHouseProposal,
  northwindRfpRequest,
  sampleBriefFixtures,
  venueProposalFixtures,
} from "../src/contract/fixtures";
import { proposalesSchemas } from "../src/contract/proposales-schemas";
import {
  companyReader,
  draftReader,
  proposalEnvelopeReader,
  rfpReader,
  searchEnvelopeReader,
  searchIdentityReader,
} from "../src/proposales/http-client";

const parsedProposalReader = z.object({
  blocks: z.array(
    z.object({
      package_split: z.array(z.object({ type: z.string() })),
    }),
  ),
  expires_at: z.number(),
  value_without_tax: z.number(),
});

describe("proposales contract", () => {
  it("accepts company fixtures, including a null inbox token", async () => {
    const schemas = await proposalesSchemas();
    for (const company of companyFixtures) {
      expect(schemas.company.safeParse(company).success).toBe(true);
    }
    expect(companyWithInbox.inbox_token).toBe("inbox-harbour");
    expect(companyWithoutInbox.inbox_token).toBeNull();
  });

  it("rejects a tax mode outside the dereferenced company schema", async () => {
    const schemas = await proposalesSchemas();
    const parsed = schemas.company.safeParse({
      ...companyWithInbox,
      tax_mode: "nope",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts three venue proposals with different prices, extras, and expiry", async () => {
    const schemas = await proposalesSchemas();
    const parsed = venueProposalFixtures.map((proposal) =>
      parsedProposalReader.parse(schemas.proposal.parse(proposal)),
    );
    const packageTypes = parsed.flatMap((proposal) =>
      proposal.blocks.flatMap((block) => block.package_split.map((split) => split.type)),
    );
    expect(packageTypes).toEqual([
      "accommodation",
      "food",
      "meetingRoom",
      "other",
      "accommodation",
      "meetingRoom",
      "food",
      "meetingRoom",
      "other",
    ]);
    const expiryDates = parsed.map((proposal) => proposal.expires_at);
    expect(new Set(expiryDates).size).toBe(3);
    expect(parsed.map((proposal) => proposal.value_without_tax)).toEqual([36_500, 95_000, 21_000]);
  });

  it("accepts a create-rfp request", async () => {
    const schemas = await proposalesSchemas();
    expect(schemas.createRfpRequest.parse(northwindRfpRequest)).toMatchObject({
      email: "ada@northwind.example",
      is_test: "1",
    });
  });

  it("rejects live quirks that the vendored schemas still describe as invalid", async () => {
    const schemas = await proposalesSchemas();
    expect(
      schemas.company.safeParse({
        ...companyWithInbox,
        timezone: null,
        website_url: "not a url",
      }).success,
    ).toBe(false);
    expect(
      schemas.proposal.safeParse({
        ...harbourHouseProposal,
        company_email: "not-an-email",
        company_website: "not a url",
        is_agreement: null,
        pending: null,
      }).success,
    ).toBe(false);
  });

  it("accepts spec-valid fixtures through the http readers with the same key fields", async () => {
    const schemas = await proposalesSchemas();

    const companies = companyFixtures.filter(
      (company) => schemas.company.safeParse(company).success,
    );
    expect(companies).toHaveLength(companyFixtures.length);
    const companyList = searchEnvelopeReader.parse({ data: [...companies] });
    expect(companyList.data).toHaveLength(companies.length);
    for (const company of companies) {
      const spec = schemas.company.parse(company);
      const reader = companyReader.parse(company);
      expect(reader).toEqual({
        id: company.id,
        name: company.name,
        inbox_token: company.inbox_token,
      });
      expect(spec).toMatchObject({
        id: reader.id,
        name: reader.name,
        inbox_token: reader.inbox_token,
      });
    }

    const proposals = venueProposalFixtures.filter(
      (proposal) => schemas.proposal.safeParse(proposal).success,
    );
    expect(proposals).toHaveLength(venueProposalFixtures.length);
    for (const proposal of proposals) {
      const spec = schemas.proposal.parse(proposal);
      const reader = proposalEnvelopeReader.parse({ data: proposal });
      const keyFields = {
        uuid: proposal.uuid,
        expires_at: proposal.expires_at,
        value_without_tax: proposal.value_without_tax,
        blocks: proposal.blocks,
      };
      expect(reader.data).toMatchObject(keyFields);
      expect(spec).toMatchObject(keyFields);
    }

    const rfpResponses = [{ id: 55 }].filter(
      (body) => schemas.createRfpResponse.safeParse(body).success,
    );
    expect(rfpResponses).toHaveLength(1);
    for (const body of rfpResponses) {
      const spec = schemas.createRfpResponse.parse(body);
      const reader = rfpReader.parse(body);
      expect(reader).toEqual({ id: body.id });
      expect(spec).toMatchObject({ id: reader.id });
    }

    const mutations = proposals.map((proposal) => ({
      proposal: {
        uuid: proposal.uuid,
        url: `https://example.test/proposals/${proposal.uuid}`,
      },
    }));
    const acceptedMutations = mutations.filter((body) =>
      schemas.proposalMutationResponse.safeParse(body).success,
    );
    expect(acceptedMutations).toHaveLength(mutations.length);
    for (const body of acceptedMutations) {
      const spec = schemas.proposalMutationResponse.parse(body);
      const reader = draftReader.parse(body);
      expect(reader.proposal).toEqual({
        uuid: body.proposal.uuid,
        url: body.proposal.url,
      });
      expect(spec).toMatchObject({
        proposal: {
          uuid: reader.proposal.uuid,
          url: reader.proposal.url,
        },
      });
    }

    const searchResults = proposals.map((proposal) => ({
      created_at: 1_700_000_000,
      updated_at: 1_700_000_100,
      title: proposal.title,
      uuid: proposal.uuid,
      series_uuid: proposal.uuid,
      company_id: proposal.company_id,
      version: 1,
      status: proposal.status,
      data: proposal.data,
      url: `https://example.test/proposals/${proposal.uuid}`,
    }));
    const acceptedSearch = searchResults.filter((item) =>
      schemas.proposalSearchResult.safeParse(item).success,
    );
    expect(acceptedSearch).toHaveLength(searchResults.length);
    const searchList = searchEnvelopeReader.parse({ data: acceptedSearch });
    expect(searchList.data).toHaveLength(acceptedSearch.length);
    for (const item of acceptedSearch) {
      const spec = schemas.proposalSearchResult.parse(item);
      const reader = searchIdentityReader.parse(item);
      expect(reader.uuid).toBe(item.uuid);
      expect(reader.data).toEqual(item.data);
      expect(spec).toMatchObject({
        uuid: reader.uuid,
        data: reader.data,
      });
    }
  });

  it("ships two distinct sample briefs", () => {
    expect(sampleBriefFixtures).toHaveLength(2);
    expect(sampleBriefFixtures[0].eventTitle).not.toBe(sampleBriefFixtures[1].eventTitle);
    expect(sampleBriefFixtures[0].contactEmail).toContain("@");
    expect(sampleBriefFixtures[1].roomCount).toBe(10);
  });
});
