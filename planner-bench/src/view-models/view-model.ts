export type PlannerViewEvent =
  | { type: "messageSubmitted"; text: string }
  | { type: "companySelected"; companyId: number }
  | { type: "historyToggled"; open: boolean }
  | { type: "historyEntryChosen"; entryId: string };

export type ChatViewModel = {
  stage: string;
  nextQuestion: string;
  busy: boolean;
  ready: boolean;
  errorText: string | null;
  speechAvailable: boolean;
  companies: { id: number; name: string; filingPath: "inbox" | "draft" }[];
  selectedCompanyId: number | null;
  briefLines: { label: string; value: string }[];
  messages: { id: string; role: string; text: string }[];
};

export type ResultsViewModel = {
  rows: {
    venueName: string;
    rooms: string;
    foodAndBeverage: string;
    space: string;
    extras: string;
    total: string;
    expires: string;
    gaps: string[];
  }[];
};

export type HistoryViewModel = {
  open: boolean;
  entries: {
    id: string;
    title: string;
    stage: string;
    savedAt: string;
    venueCount: number;
  }[];
};
