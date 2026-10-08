/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MoreFieldValues, PlannerViewEvent, ShellRow, ShellViewModel } from "../src/view-models/view-model";
import { NewEventCard } from "../src/views/inline-ask-card";
import { PlannerShell } from "../src/views/planner-shell";

afterEach(() => {
  cleanup();
});

const emptyMore: MoreFieldValues = {
  eventTitle: "",
  organisationName: "",
  contactEmail: "",
  city: "",
  language: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  attendeeCount: "",
  roomCount: "",
  meetingRoomCount: "",
  foodRequired: "",
  notes: "",
  budget: "",
  budgetBasis: "",
  currency: "",
};

const row: ShellRow = {
  venueName: "Ridge Hall",
  proposalUuid: "ridge",
  heldByCompanyName: null,
  currency: "EUR",
  roomsMinor: 0,
  foodMinor: 0,
  spaceMinor: 0,
  extrasMinor: 0,
  totalMinor: 1,
  rooms: "0",
  foodAndBeverage: "0",
  space: "0",
  extras: "0",
  total: "1",
  expires: "No expiry",
  gaps: [],
  neutral: [],
  favorite: true,
  blocks: [],
};

describe("File press", () => {
  it("sends one file utterance when File is pressed", async () => {
    installDomShims();
    const user = userEvent.setup();
    const withEmail: PlannerViewEvent[] = [];
    render(
      <PlannerShell
        viewModel={resultsModel("planner@northwind.example", null)}
        onEvent={(event) => withEmail.push(event)}
        historyControl={null}
      />,
    );
    await user.click(screen.getByRole("button", { name: "File this brief" }));
    expect(withEmail).toEqual([{ type: "composerSubmitted", text: "file" }]);
    cleanup();
    const missingEmail: PlannerViewEvent[] = [];
    render(
      <PlannerShell
        viewModel={resultsModel("", "contactEmail")}
        onEvent={(event) => missingEmail.push(event)}
        historyControl={null}
      />,
    );
    await user.click(screen.getByRole("button", { name: "File this brief" }));
    expect(missingEmail).toEqual([{ type: "composerSubmitted", text: "file" }]);
    expect(screen.queryByRole("dialog", { name: "Add details" })).toBeNull();
  });

  it("the new-event card sends no filing request", async () => {
    installDomShims();
    const user = userEvent.setup();
    const events: PlannerViewEvent[] = [];
    render(<NewEventCard label="Gothenburg" phase="chat:results" onStart={() => events.push({ type: "sessionReset" })} />);
    await user.click(screen.getByRole("button", { name: "Start a new chat" }));
    expect(events).toEqual([{ type: "sessionReset" }]);
  });
});

function resultsModel(email: string, fileGap: string | null): ShellViewModel {
  return {
    phase: "results",
    busy: false,
    ready: true,
    errorText: null,
    speechAvailable: false,
    ask: "Five places fit.",
    askMark: null,
    askLabelsComposer: true,
    notice: null,
    draftConfirmation: null,
    filingMessage: null,
    inlineAsk: null,
    newEventLabel: null,
    fileGap,
    filed: false,
    offerLabel: null,
    factsSentence: "",
    confirmRuns: [],
    showFacts: false,
    showConfirm: false,
    showFavorites: false,
    rows: [row],
    cards: [],
    hiddenCount: 0,
    openRow: null,
    more: { ...emptyMore, contactEmail: email },
    moreStamp: "base",
    budgetCurrency: "EUR",
    composerPlaceholder: "Describe the event: place, people, date, time",
    offerSummary: null,
    contextChips: [],
    inputMode: "text",
    inputType: "text",
    autoComplete: undefined,
  };
}

function installDomShims() {
  const prototype = Element.prototype as Element & {
    hasPointerCapture?: (pointerId: number) => boolean;
    setPointerCapture?: (pointerId: number) => void;
    releasePointerCapture?: (pointerId: number) => void;
    scrollIntoView?: (arg?: boolean | ScrollIntoViewOptions) => void;
  };
  prototype.hasPointerCapture ??= () => false;
  prototype.setPointerCapture ??= () => undefined;
  prototype.releasePointerCapture ??= () => undefined;
  prototype.scrollIntoView ??= () => undefined;
  if (typeof window.matchMedia !== "function") {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));
  }
  if (typeof globalThis.ResizeObserver !== "function") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
}
