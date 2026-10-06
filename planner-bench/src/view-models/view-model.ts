import type { PlannerBrief } from "../domain/planner-brief";

export type PlannerViewEvent =
  | { type: "captureSubmitted"; text: string }
  | { type: "gapAnswered"; text: string }
  | { type: "briefEdited"; brief: PlannerBrief }
  | { type: "briefConfirmed"; brief?: PlannerBrief }
  | { type: "favoritesSubmitted"; text: string }
  | { type: "showMore" }
  | { type: "rowOpened"; venueName: string }
  | { type: "rowClosed" }
  | { type: "historyToggled"; open: boolean }
  | { type: "historyEntryChosen"; entryId: string };

export type CaptureViewModel = {
  phase: "capture" | "confirm" | "favorites" | "results";
  busy: boolean;
  ready: boolean;
  errorText: string | null;
  speechAvailable: boolean;
  nextQuestion: string;
  briefFields: {
    eventTitle: string;
    contactEmail: string;
    organisationName: string;
    startDate: string;
    endDate: string;
    attendeeCount: string;
    roomCount: string;
    meetingRoomCount: string;
    city: string;
    language: string;
    foodRequired: "" | "yes" | "no";
    notes: string;
  };
  briefLines: { label: string; value: string }[];
};

export type ResultsViewModel = {
  phase: "capture" | "confirm" | "favorites" | "results";
  rows: {
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
  }[];
  hiddenCount: number;
  openRow: {
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
  } | null;
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
