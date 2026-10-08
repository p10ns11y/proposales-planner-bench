export type FilingPath = "inbox" | "draft";

export type CompanyRecord = {
  id: number;
  name: string;
  inboxToken: string | null;
};

export type BriefDraft = {
  email: string;
  companyId: number;
  companyName: string;
  message: string;
  language: string;
  startDate: string | null;
  endDate: string | null;
  eventTitle?: string;
  attendeeCount?: number;
  roomCount?: number;
  meetingRoomCount?: number;
  city?: string;
  foodRequired?: boolean;
};

export type FileBriefResult =
  | { path: "inbox"; id: number }
  | { path: "draft"; uuid: string };

export type ProposalesClient = {
  readsLiveProposals: boolean;
  listCompanies(): Promise<CompanyRecord[]>;
  fileBrief(brief: BriefDraft): Promise<FileBriefResult>;
  getProposal(uuid: string): Promise<unknown>;
  loadVenueProposals(): Promise<unknown[]>;
};
