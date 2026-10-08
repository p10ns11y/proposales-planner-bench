const accountCompanyName = "Example Desk";

export const liveAccountCompanyName = accountCompanyName;

type PackageSplit = {
  type: "accommodation" | "meetingRoom" | "food" | "other";
  value_without_tax: number;
  value_with_tax: number;
};

export type LiveDraftProposal = {
  uuid: string;
  series_uuid: string;
  company_id: number;
  language: "en";
  status: "draft";
  data: Record<string, never>;
  blocks: {
    type: "product-block";
    uuid: string;
    quantity: number;
    package_split: PackageSplit[];
  }[];
  attachments: [];
  title: string;
  company_name: string;
  value_without_tax: 0;
  value_with_tax: 0;
  currency: "EUR";
};

function draft(input: {
  uuid: string;
  seriesUuid: string;
  blockUuid: string;
  title: string;
  quantity: number;
  packageSplit: PackageSplit[];
}): LiveDraftProposal {
  return {
    uuid: input.uuid,
    series_uuid: input.seriesUuid,
    company_id: 9,
    language: "en",
    status: "draft",
    data: {},
    blocks: [
      {
        type: "product-block",
        uuid: input.blockUuid,
        quantity: input.quantity,
        package_split: input.packageSplit,
      },
    ],
    attachments: [],
    title: `${input.title} (demo venue)`,
    company_name: accountCompanyName,
    value_without_tax: 0,
    value_with_tax: 0,
    currency: "EUR",
  };
}

export const liveDraftProposals: LiveDraftProposal[] = [
  draft({
    uuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    seriesUuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    blockUuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
    title: "Harbour House",
    quantity: 2,
    packageSplit: [
      { type: "accommodation", value_without_tax: 10_000, value_with_tax: 12_500 },
      { type: "food", value_without_tax: 3_000, value_with_tax: 3_750 },
      { type: "meetingRoom", value_without_tax: 5_000, value_with_tax: 6_250 },
      { type: "other", value_without_tax: 250, value_with_tax: 313 },
    ],
  }),
  draft({
    uuid: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
    seriesUuid: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    blockUuid: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
    title: "Ridge Hall",
    quantity: 1,
    packageSplit: [
      { type: "accommodation", value_without_tax: 80_000, value_with_tax: 100_000 },
      { type: "meetingRoom", value_without_tax: 15_000, value_with_tax: 18_750 },
    ],
  }),
  draft({
    uuid: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
    seriesUuid: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2",
    blockUuid: "cccccccc-cccc-4ccc-8ccc-ccccccccccc3",
    title: "Canal Loft",
    quantity: 3,
    packageSplit: [
      { type: "food", value_without_tax: 2_000, value_with_tax: 2_500 },
      { type: "meetingRoom", value_without_tax: 1_000, value_with_tax: 1_250 },
      { type: "other", value_without_tax: 4_000, value_with_tax: 5_000 },
    ],
  }),
];

export function liveSearchItem(proposal: LiveDraftProposal): {
  company_id: number;
  created_at: number;
  data: Record<string, never>;
  series_uuid: string;
  status: "draft";
  title: string;
  updated_at: number;
  url: string;
  uuid: string;
  version: number;
} {
  return {
    company_id: proposal.company_id,
    created_at: 1_700_000_000,
    data: proposal.data,
    series_uuid: proposal.series_uuid,
    status: proposal.status,
    title: proposal.title,
    updated_at: 1_700_000_100,
    url: `https://example.test/proposals/${proposal.uuid}`,
    uuid: proposal.uuid,
    version: 1,
  };
}
