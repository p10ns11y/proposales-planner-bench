import { venueProposalFixtures } from "../contract/fixtures";
import type { ProposalesClient } from "./types";

export type OfferLoadSource = "fixture" | "live" | "sample";

export async function loadComparableProposals(client: ProposalesClient): Promise<{
  proposals: unknown[];
  sample: boolean;
  source: OfferLoadSource;
}> {
  try {
    const proposals = await client.loadVenueProposals();
    if (proposals.length > 0) {
      const source = client.readsLiveProposals ? "live" : "fixture";
      return { proposals, sample: false, source };
    }
  } catch {
    return { proposals: sampleProposalRecords(), sample: true, source: "sample" };
  }
  return { proposals: sampleProposalRecords(), sample: true, source: "sample" };
}

export function sampleProposalRecords(): unknown[] {
  return venueProposalFixtures.map((proposal) => ({
    ...proposal,
    blocks: proposal.blocks.map((block) => ({ ...block })),
  }));
}
