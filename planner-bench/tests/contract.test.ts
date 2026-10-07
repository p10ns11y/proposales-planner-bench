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

  it("ships two distinct sample briefs", () => {
    expect(sampleBriefFixtures).toHaveLength(2);
    expect(sampleBriefFixtures[0].eventTitle).not.toBe(sampleBriefFixtures[1].eventTitle);
    expect(sampleBriefFixtures[0].contactEmail).toContain("@");
    expect(sampleBriefFixtures[1].roomCount).toBe(10);
  });
});
