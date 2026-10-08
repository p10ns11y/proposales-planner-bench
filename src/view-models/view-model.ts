export type PlannerViewEvent =
  | { type: "composerSubmitted"; text: string }
  | { type: "briefConfirmed" }
  | { type: "favoritesSubmitted"; text: string }
  | { type: "moreEdited"; details: Partial<MoreFieldValues> }
  | { type: "showMore" }
  | { type: "rowOpened"; venueName: string }
  | { type: "rowClosed" }
  | { type: "sessionReset" }
  | { type: "historyToggled"; open: boolean }
  | { type: "historyEntryChosen"; entryId: string };

export type MoreFieldValues = {
  eventTitle: string;
  organisationName: string;
  contactEmail: string;
  city: string;
  language: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  attendeeCount: string;
  roomCount: string;
  meetingRoomCount: string;
  foodRequired: "" | "yes" | "no";
  notes: string;
  budget: string;
  budgetBasis: "" | "total" | "per-person";
  currency: string;
};

export type ShellBlock = {
  title: string;
  quantity: number;
};

export type ShellRow = {
  venueName: string;
  proposalUuid: string;
  heldByCompanyName: string | null;
  currency: string;
  roomsMinor: number;
  foodMinor: number;
  spaceMinor: number;
  extrasMinor: number;
  totalMinor: number;
  rooms: string;
  foodAndBeverage: string;
  space: string;
  extras: string;
  total: string;
  expires: string;
  gaps: string[];
  neutral: string[];
  favorite: boolean;
  blocks: ShellBlock[];
};

export type ConfirmFactName = "city" | "date" | "time" | "attendees" | "budget" | "budget-basis";

export type ConfirmRun =
  | { kind: "text"; text: string; inSentence: boolean }
  | { kind: "fact"; name: ConfirmFactName; text: string; inSentence: boolean };

export type ShellViewModel = {
  phase: "capture" | "confirm" | "favorites" | "results";
  busy: boolean;
  ready: boolean;
  errorText: string | null;
  speechAvailable: boolean;
  ask: string;
  askMark: "budget-basis" | null;
  askLabelsComposer: boolean;
  notice: string | null;
  draftConfirmation: string | null;
  filingMessage: string | null;
  filed: boolean;
  offerLabel: string | null;
  factsSentence: string;
  confirmRuns: ConfirmRun[];
  showFacts: boolean;
  showConfirm: boolean;
  showFavorites: boolean;
  rows: ShellRow[];
  hiddenCount: number;
  openRow: ShellRow | null;
  more: MoreFieldValues;
  moreStamp: string;
  budgetCurrency: string;
  composerPlaceholder: string;
  offerSummary: string | null;
  contextChips: string[];
  inputMode: "email" | "numeric" | "text";
  inputType: "email" | "text";
  autoComplete: string | undefined;
};

export type ResultsViewModel = {
  phase: "capture" | "confirm" | "favorites" | "results";
  rows: ShellRow[];
  hiddenCount: number;
  openRow: ShellRow | null;
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
