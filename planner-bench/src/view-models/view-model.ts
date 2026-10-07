export type PlannerViewEvent =
  | { type: "composerSubmitted"; text: string }
  | { type: "briefConfirmed" }
  | { type: "favoritesSubmitted"; text: string }
  | { type: "moreEdited"; details: MoreFieldValues }
  | { type: "showMore" }
  | { type: "rowOpened"; venueName: string }
  | { type: "rowClosed" }
  | { type: "historyToggled"; open: boolean }
  | { type: "historyEntryChosen"; entryId: string };

export type MoreFieldValues = {
  eventTitle: string;
  organisationName: string;
  contactEmail: string;
  language: string;
  roomCount: string;
  meetingRoomCount: string;
  foodRequired: "" | "yes" | "no";
  notes: string;
  budget: string;
};

export type ShellRow = {
  venueName: string;
  heldByCompanyName: string | null;
  rooms: string;
  foodAndBeverage: string;
  space: string;
  extras: string;
  total: string;
  expires: string;
  gaps: string[];
  favorite: boolean;
};

export type ShellViewModel = {
  phase: "capture" | "confirm" | "favorites" | "results";
  busy: boolean;
  ready: boolean;
  errorText: string | null;
  speechAvailable: boolean;
  ask: string;
  askLabelsComposer: boolean;
  notice: string | null;
  factsSentence: string;
  showFacts: boolean;
  showConfirm: boolean;
  showFavorites: boolean;
  rows: ShellRow[];
  hiddenCount: number;
  openRow: ShellRow | null;
  more: MoreFieldValues;
  moreStamp: string;
  composerPlaceholder: string;
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
