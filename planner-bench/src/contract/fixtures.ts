export type PackageSplitFixture = {
  type: "accommodation" | "meetingRoom" | "food" | "other";
  value_without_tax: number;
  value_with_tax: number;
  vat: number;
};

export type VenueProposalFixture = {
  uuid: string;
  company_id: number;
  language: string;
  status: "active" | "expired" | "draft";
  data: Record<string, never>;
  blocks: {
    type: "product-block";
    uuid: string;
    title: string;
    quantity: number;
    package_split: PackageSplitFixture[];
  }[];
  attachments: [];
  currency: string;
  expires_at: number;
  title: string;
  company_name: string;
  value_without_tax: number;
  value_with_tax: number;
};

export const companyWithInbox = {
  id: 1,
  name: "Harbour House",
  currency: "EUR",
  tax_mode: "standard",
  timezone: "Europe/Stockholm",
  created_at: 1_700_000_000,
  registration_number: null,
  website_url: "https://harbour.example",
  logo_url: null,
  inbox_token: "inbox-harbour",
} as const;

export const companyWithoutInbox = {
  id: 2,
  name: "Quiet Court",
  currency: "SEK",
  tax_mode: "simplified",
  timezone: "Europe/Stockholm",
  created_at: 1_700_000_100,
  registration_number: null,
  website_url: null,
  logo_url: null,
  inbox_token: null,
} as const;

export const companyFixtures = [companyWithInbox, companyWithoutInbox] as const;

const harbourExpiresAt = Math.trunc(Date.parse("2026-12-01T00:00:00.000Z") / 1000);
const ridgeExpiresAt = Math.trunc(Date.parse("2027-03-01T00:00:00.000Z") / 1000);
const canalExpiresAt = Math.trunc(Date.parse("2026-09-01T00:00:00.000Z") / 1000);

export const harbourHouseProposal: VenueProposalFixture = {
  uuid: "11111111-1111-4111-8111-111111111111",
  company_id: 1,
  language: "en",
  status: "active",
  data: {},
  blocks: [
    {
      type: "product-block",
      uuid: "11111111-1111-4111-8111-111111111112",
      title: "Harbour conference package",
      quantity: 2,
      package_split: [
        { type: "accommodation", value_without_tax: 10_000, value_with_tax: 12_500, vat: 0.25 },
        { type: "food", value_without_tax: 3_000, value_with_tax: 3_750, vat: 0.25 },
        { type: "meetingRoom", value_without_tax: 5_000, value_with_tax: 6_250, vat: 0.25 },
        { type: "other", value_without_tax: 250, value_with_tax: 313, vat: 0.25 },
      ],
    },
  ],
  attachments: [],
  currency: "EUR",
  expires_at: harbourExpiresAt,
  title: "Harbour House",
  company_name: "Harbour House",
  value_without_tax: 36_500,
  value_with_tax: 45_625,
};

export const ridgeHallProposal: VenueProposalFixture = {
  uuid: "22222222-2222-4222-8222-222222222222",
  company_id: 1,
  language: "en",
  status: "active",
  data: {},
  blocks: [
    {
      type: "product-block",
      uuid: "22222222-2222-4222-8222-222222222223",
      title: "Ridge hall hire",
      quantity: 1,
      package_split: [
        { type: "accommodation", value_without_tax: 80_000, value_with_tax: 100_000, vat: 0.25 },
        { type: "meetingRoom", value_without_tax: 15_000, value_with_tax: 18_750, vat: 0.25 },
      ],
    },
  ],
  attachments: [],
  currency: "SEK",
  expires_at: ridgeExpiresAt,
  title: "Ridge Hall",
  company_name: "Ridge Hall",
  value_without_tax: 95_000,
  value_with_tax: 118_750,
};

export const canalLoftProposal: VenueProposalFixture = {
  uuid: "33333333-3333-4333-8333-333333333333",
  company_id: 2,
  language: "en",
  status: "expired",
  data: {},
  blocks: [
    {
      type: "product-block",
      uuid: "33333333-3333-4333-8333-333333333334",
      title: "Canal loft day delegate",
      quantity: 3,
      package_split: [
        { type: "food", value_without_tax: 2_000, value_with_tax: 2_500, vat: 0.25 },
        { type: "meetingRoom", value_without_tax: 1_000, value_with_tax: 1_250, vat: 0.25 },
        { type: "other", value_without_tax: 4_000, value_with_tax: 5_000, vat: 0.25 },
      ],
    },
  ],
  attachments: [],
  currency: "EUR",
  expires_at: canalExpiresAt,
  title: "Canal Loft",
  company_name: "Canal Loft",
  value_without_tax: 21_000,
  value_with_tax: 26_250,
};

export const venueProposalFixtures = [
  harbourHouseProposal,
  ridgeHallProposal,
  canalLoftProposal,
] as const;

export const northwindRfpRequest = {
  email: "ada@northwind.example",
  company_name: "Northwind",
  first_name: "Ada",
  last_name: "North",
  message: "One plenary and dinner.",
  language: "en",
  start_date: "2026-11-12T00:00:00.000Z",
  end_date: "2026-11-12T00:00:00.000Z",
  is_test: "1",
} as const;

export const northwindDayBrief = {
  eventTitle: "Northwind offsite",
  contactEmail: "ada@northwind.example",
  organisationName: "Northwind",
  startDate: "2026-11-12",
  endDate: "2026-11-12",
  attendeeCount: 40,
  meetingRoomCount: 2,
  foodRequired: true,
  city: "Stockholm",
  language: "en",
  notes: "One plenary and dinner.",
} as const;

export const lumenOvernightBrief = {
  eventTitle: "Lumen retreat",
  contactEmail: "sam@lumen.example",
  organisationName: "Lumen",
  startDate: "2026-06-01",
  endDate: "2026-06-03",
  attendeeCount: 18,
  roomCount: 10,
  meetingRoomCount: 1,
  foodRequired: true,
  city: "Gothenburg",
  language: "en",
  budgetMinor: { unit: "minor", amount: 250_000 },
  notes: "Overnight retreat.",
} as const;

export const sampleBriefFixtures = [northwindDayBrief, lumenOvernightBrief] as const;

export const northwindDayTranscript =
  "Title Northwind offsite. Organisation Northwind. Email ada@northwind.example. Start 2026-11-12. End 2026-11-12. Attendees 40. Language en. City Stockholm. Meeting rooms 2. Food yes. Notes One plenary and dinner.";

export const lumenOvernightTranscript =
  "Title Lumen retreat. Organisation Lumen. Email sam@lumen.example. Start 2026-06-01. End 2026-06-03. Attendees 18. Rooms 10. Language en. City Gothenburg. Meeting rooms 1. Food yes. Budget 250000. Notes Overnight retreat.";
