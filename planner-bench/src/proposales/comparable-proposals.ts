import { venueProposalFixtures } from "../contract/fixtures";
import type { ProposalesClient } from "./types";

export async function loadComparableProposals(client: ProposalesClient): Promise<{
  proposals: unknown[];
  sample: boolean;
}> {
  try {
    const proposals = await client.loadVenueProposals();
    if (proposals.length > 0) {
      return { proposals, sample: false };
    }
  } catch {
    return { proposals: sampleProposalRecords(), sample: true };
  }
  return { proposals: sampleProposalRecords(), sample: true };
}

export function sampleProposalRecords(): unknown[] {
  return venueProposalFixtures.map((proposal) => ({
    ...proposal,
    blocks: proposal.blocks.map((block) => ({ ...block })),
  }));
}
