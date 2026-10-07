/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MoreFieldValues, PlannerViewEvent, ShellRow, ShellViewModel } from "../src/view-models/view-model";
import { PlannerShell } from "../src/views/planner-shell";

afterEach(() => {
  cleanup();
});

const canalLoft: ShellRow = {
  venueName: "Canal Loft",
  proposalUuid: "33333333-3333-4333-8333-333333333333",
  heldByCompanyName: "Quiet Court",
  currency: "EUR",
  roomsMinor: 0,
  foodMinor: 6000,
  spaceMinor: 3000,
  extrasMinor: 12000,
  totalMinor: 21000,
  rooms: "0.00 EUR",
  foodAndBeverage: "60.00 EUR",
  space: "30.00 EUR",
  extras: "120.00 EUR",
  total: "210.00 EUR",
  expires: "2026-09-01",
  gaps: ["expired"],
  neutral: [],
  favorite: false,
  blocks: [{ title: "Canal loft day delegate", quantity: 3 }],
};

const emptyMore: MoreFieldValues = {
  eventTitle: "",
  organisationName: "",
  contactEmail: "",
  language: "",
  attendeeCount: "",
  roomCount: "",
  meetingRoomCount: "",
  foodRequired: "",
  notes: "",
  budget: "",
};

function model(overrides: Partial<ShellViewModel> = {}): ShellViewModel {
  return {
    phase: "results",
    busy: false,
    ready: true,
    errorText: null,
    speechAvailable: false,
    ask: "Stockholm, 12 November 2026, 40 people",
    askMark: null,
    askLabelsComposer: true,
    notice: null,
    draftConfirmation: null,
    filingMessage: null,
    filed: false,
    offerLabel: null,
    factsSentence: "Stockholm, 12 November 2026, 40 people",
    confirmRuns: [],
    showFacts: false,
    showConfirm: false,
    showFavorites: false,
    rows: [canalLoft],
    hiddenCount: 0,
    openRow: null,
    more: emptyMore,
    moreStamp: "base",
    budgetCurrency: "EUR",
    composerPlaceholder: "Describe the event: place, people, date, time",
    offerSummary: "1 offer · Stockholm · Thu 12 Nov · 40 guests",
    contextChips: ["Stockholm", "40 people", "Thu 12 Nov 09:00-17:00"],
    inputMode: "text",
    inputType: "text",
    autoComplete: undefined,
    ...overrides,
  };
}

describe("offer detail", () => {
  it("opens from the card, closes with Escape, and returns focus", async () => {
    installDomShims();
    const user = userEvent.setup();
    const events: PlannerViewEvent[] = [];
    const view = render(
      <PlannerShell viewModel={model()} onEvent={(event) => events.push(event)} historyControl={null} />,
    );
    const thread = document.querySelector(".planner-thread");
    if (!(thread instanceof HTMLDivElement)) {
      throw new Error("Missing thread");
    }
    Object.defineProperty(thread, "scrollHeight", { configurable: true, get: () => 400 });
    Object.defineProperty(thread, "clientHeight", { configurable: true, get: () => 100 });
    thread.scrollTop = 80;
    thread.dispatchEvent(new Event("scroll"));
    const held = thread.scrollTop;
    const card = screen.getByRole("button", { name: /Canal Loft/ });
    await user.click(card);
    expect(events.at(-1)).toEqual({ type: "rowOpened", venueName: "Canal Loft" });
    view.rerender(
      <PlannerShell
        viewModel={model({ openRow: canalLoft })}
        onEvent={(event) => events.push(event)}
        historyControl={null}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Canal Loft" });
    expect(within(dialog).getByText("Canal loft day delegate × 3")).toBeTruthy();
    expect(within(dialog).getByText("EUR 210")).toBeTruthy();
    expect(within(dialog).queryByText("Best match")).toBeNull();
    const expiredChip = within(dialog)
      .getAllByText("Expired")
      .find((node) => node.querySelector("svg") !== null);
    expect(expiredChip).toBeTruthy();
    expect(thread.scrollTop).toBe(held);
    await user.keyboard("{Escape}");
    expect(events.some((event) => event.type === "rowClosed")).toBe(true);
    view.rerender(
      <PlannerShell viewModel={model()} onEvent={(event) => events.push(event)} historyControl={null} />,
    );
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Canal Loft/ }));
    expect(thread.scrollTop).toBe(held);
  });

  it("shows the server filing message in the detail", () => {
    installDomShims();
    const message = "What email should receive the venue replies?";
    render(
      <PlannerShell
        viewModel={model({ openRow: canalLoft, filingMessage: message })}
        onEvent={() => undefined}
        historyControl={null}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Canal Loft" });
    expect(within(dialog).getByRole("status").textContent).toBe(message);
    expect(within(dialog).getByRole("button", { name: "File this brief" })).toBeTruthy();
  });

  it("reads Filed and stays disabled once the brief is filed", () => {
    installDomShims();
    render(
      <PlannerShell
        viewModel={model({
          openRow: canalLoft,
          filed: true,
          filingMessage: "The brief is filed.",
        })}
        onEvent={() => undefined}
        historyControl={null}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Canal Loft" });
    const filed = within(dialog).getByRole("button", { name: "Filed" });
    expect(filed).toHaveProperty("disabled", true);
    expect(filed.getAttribute("data-lcv-event")).toBe("file-brief");
    expect(within(dialog).getByRole("status").textContent).toBe("The brief is filed.");
  });

  it("opens More on the email field when File is pressed without an email", async () => {
    installDomShims();
    const user = userEvent.setup();
    const events: PlannerViewEvent[] = [];
    render(
      <PlannerShell
        viewModel={model({ openRow: canalLoft })}
        onEvent={(event) => events.push(event)}
        historyControl={null}
      />,
    );
    await user.click(screen.getByRole("button", { name: "File this brief" }));
    expect(events.some((event) => event.type === "composerSubmitted")).toBe(false);
    const email = screen.getByLabelText("Email");
    expect(email).toBe(document.activeElement);
    expect(email.getAttribute("id")).toBe("more-contactEmail");
    expect(email.getAttribute("aria-required")).toBe("true");
    expect(screen.getByText("Venues reply to this address")).toBeTruthy();
    const detailStatus = document.querySelector(".planner-detail-sheet [role=status]");
    expect(detailStatus?.textContent).toBe("Add details opened so venues reply to this address.");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByRole("dialog", { name: "Add details" })).toBeTruthy();
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(events.some((event) => event.type === "moreEdited")).toBe(false);
  });

  it("keeps Email optional when More opens from the header", async () => {
    installDomShims();
    const user = userEvent.setup();
    render(
      <PlannerShell
        viewModel={model({ phase: "confirm", rows: [], offerSummary: null, showConfirm: true })}
        onEvent={() => undefined}
        historyControl={null}
      />,
    );
    await user.click(within(headerRegion()).getByRole("button", { name: "Add details" }));
    const email = screen.getByLabelText("Email");
    expect(email.getAttribute("aria-required")).toBeNull();
    expect(screen.queryByText("Venues reply to this address")).toBeNull();
  });

  it("shows one File control on the results and hides it while the detail is open", async () => {
    installDomShims();
    const user = userEvent.setup();
    const events: PlannerViewEvent[] = [];
    const view = render(
      <PlannerShell viewModel={model()} onEvent={(event) => events.push(event)} historyControl={null} />,
    );
    const resultsFile = screen.getByRole("button", { name: "File this brief" });
    expect(resultsFile.getAttribute("data-lcv-event")).toBe("file-brief");
    await user.click(resultsFile);
    expect(events.some((event) => event.type === "composerSubmitted")).toBe(false);
    expect(screen.getByText("Venues reply to this address")).toBeTruthy();
    view.rerender(
      <PlannerShell
        viewModel={model({ openRow: canalLoft })}
        onEvent={(event) => events.push(event)}
        historyControl={null}
      />,
    );
    expect(screen.getAllByRole("button", { name: "File this brief" })).toHaveLength(1);
  });

  it("shows a transport error in the open detail and keeps File pressable", async () => {
    installDomShims();
    const user = userEvent.setup();
    const events: PlannerViewEvent[] = [];
    const error = "Couldn't reach Proposales. Your brief is saved.";
    render(
      <PlannerShell
        viewModel={model({
          openRow: canalLoft,
          errorText: error,
          more: { ...emptyMore, contactEmail: "planner@northwind.example" },
        })}
        onEvent={(event) => events.push(event)}
        historyControl={null}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Canal Loft" });
    expect(within(dialog).getByRole("status").textContent).toBe(error);
    const file = within(dialog).getByRole("button", { name: "File this brief" });
    expect(file).toHaveProperty("disabled", false);
    await user.click(file);
    expect(events.at(-1)).toEqual({ type: "composerSubmitted", text: "file" });
  });

  it("asks the missing email once and still offers Skip", () => {
    installDomShims();
    const ask = "Add an email under Add details so venues reply to this address.";
    render(
      <PlannerShell
        viewModel={model({
          phase: "favorites",
          rows: [],
          offerSummary: null,
          ask,
          notice: ask,
          showFavorites: true,
        })}
        onEvent={() => undefined}
        historyControl={null}
      />,
    );
    expect(screen.getAllByText(ask)).toHaveLength(1);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("button", { name: "Skip" })).toBeTruthy();
  });

  it("confirms a filing in the chat when the sentence differs from the question", () => {
    installDomShims();
    render(
      <PlannerShell
        viewModel={model({
          phase: "favorites",
          rows: [],
          offerSummary: null,
          ask: "Which places do you already have in mind? You can skip.",
          notice: "The brief is filed.",
          showFavorites: true,
        })}
        onEvent={() => undefined}
        historyControl={null}
      />,
    );
    expect(screen.getByRole("status").textContent).toBe("The brief is filed.");
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("Which places do you already have in mind?");
  });
});

describe("header and composer", () => {
  it("uses one details name on the header, the composer, and the drawer", async () => {
    installDomShims();
    const user = userEvent.setup();
    render(<PlannerShell viewModel={model({ phase: "capture", rows: [], offerSummary: null })} onEvent={() => undefined} historyControl={null} />);
    const header = headerRegion();
    const composer = composerRegion();
    const headerDetails = within(header).getByRole("button", { name: "Add details" });
    const composerDetails = within(composer).getByRole("button", { name: "Add details" });
    expect(headerDetails.getAttribute("title")).toBe("Add details");
    expect(composerDetails.getAttribute("title")).toBe("Add details");
    expect(headerDetails.getAttribute("aria-label")).toBe(composerDetails.getAttribute("aria-label"));
    expect(headerDetails.querySelector("svg")?.getAttribute("class")).toBe(
      composerDetails.querySelector("svg")?.getAttribute("class"),
    );
    await user.click(headerDetails);
    expect(screen.getByRole("dialog", { name: "Add details" })).toBeTruthy();
  });

  it("returns to the empty home from the header", async () => {
    installDomShims();
    const user = userEvent.setup();
    const events: PlannerViewEvent[] = [];
    render(
      <PlannerShell
        viewModel={model({ phase: "confirm", showConfirm: true, ask: "Does this brief look right?", rows: [], offerSummary: null })}
        onEvent={(event) => events.push(event)}
        historyControl={null}
      />,
    );
    await user.click(within(headerRegion()).getByRole("button", { name: "New chat" }));
    expect(events).toContainEqual({ type: "sessionReset" });
    expect(screen.getByRole("heading", { level: 1, name: "What are you planning?" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Yes" })).toBeNull();
  });
});

describe("More drawer", () => {
  it("sends only the fields that changed", async () => {
    installDomShims();
    const user = userEvent.setup();
    const events: PlannerViewEvent[] = [];
    render(<PlannerShell viewModel={model({ phase: "capture", rows: [], offerSummary: null })} onEvent={(event) => events.push(event)} historyControl={null} />);
    await openAddDetails(user);
    await user.type(screen.getByLabelText("Email"), "planner@northwind.example");
    await user.click(screen.getByRole("button", { name: "Svenska" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(events.at(-1)).toEqual({
      type: "moreEdited",
      details: {
        contactEmail: "planner@northwind.example",
        language: "sv",
      },
    });
  });

  it("sends an empty value when a filled field is cleared", async () => {
    installDomShims();
    const user = userEvent.setup();
    const events: PlannerViewEvent[] = [];
    render(
      <PlannerShell
        viewModel={model({
          more: { ...emptyMore, meetingRoomCount: "2", foodRequired: "yes" },
          moreStamp: "filled",
        })}
        onEvent={(event) => events.push(event)}
        historyControl={null}
      />,
    );
    await openAddDetails(user);
    await user.click(screen.getByRole("button", { name: "Fewer meeting rooms" }));
    await user.click(screen.getByRole("button", { name: "Fewer meeting rooms" }));
    await user.click(screen.getByRole("switch", { name: "Food" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(events.at(-1)).toEqual({
      type: "moreEdited",
      details: {
        meetingRoomCount: "",
        foodRequired: "no",
      },
    });
  });

  it("shows and edits the budget in euros", async () => {
    installDomShims();
    const user = userEvent.setup();
    const events: PlannerViewEvent[] = [];
    render(
      <PlannerShell
        viewModel={model({
          more: { ...emptyMore, budget: "2500" },
          moreStamp: "budget",
        })}
        onEvent={(event) => events.push(event)}
        historyControl={null}
      />,
    );
    await openAddDetails(user);
    const budget = screen.getByLabelText("Budget (EUR)");
    expect(budget).toBeInstanceOf(HTMLInputElement);
    if (!(budget instanceof HTMLInputElement)) {
      return;
    }
    expect(budget.value).toBe("2500");
    await user.clear(budget);
    await user.type(budget, "2600");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(events.at(-1)).toEqual({
      type: "moreEdited",
      details: { budget: "2600" },
    });
  });

  it("says nothing changed when Apply keeps every field", async () => {
    installDomShims();
    const user = userEvent.setup();
    const events: PlannerViewEvent[] = [];
    render(
      <PlannerShell
        viewModel={model({ phase: "results" })}
        onEvent={(event) => events.push(event)}
        historyControl={null}
      />,
    );
    await user.click(within(headerRegion()).getByRole("button", { name: "Add details" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(events).toEqual([]);
    expect(screen.getByRole("status").textContent).toBe("Nothing changed");
  });

  it("sends the new guest count and shows it after the turn", async () => {
    installDomShims();
    const user = userEvent.setup();
    const events: { event: PlannerViewEvent; pending?: string }[] = [];
    render(
      <PlannerShell
        viewModel={model({
          phase: "results",
          more: { ...emptyMore, attendeeCount: "25" },
          moreStamp: "guests",
        })}
        onEvent={(event, pending) => events.push({ event, pending })}
        historyControl={null}
      />,
    );
    await user.click(within(headerRegion()).getByRole("button", { name: "Add details" }));
    await user.click(screen.getByRole("button", { name: "More guests" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(events.at(-1)).toEqual({
      event: { type: "moreEdited", details: { attendeeCount: "26" } },
      pending: "more",
    });
    expect(screen.getByRole("status").textContent).toBe("Updated: 26 guests");
  });
});

function headerRegion(): HTMLElement {
  const header = document.querySelector(".planner-header");
  if (!(header instanceof HTMLElement)) {
    throw new Error("Missing header");
  }
  return header;
}

function composerRegion(): HTMLElement {
  const composer = document.querySelector(".planner-composer");
  if (!(composer instanceof HTMLElement)) {
    throw new Error("Missing composer");
  }
  return composer;
}

async function openAddDetails(user: UserEvent) {
  await user.click(within(headerRegion()).getByRole("button", { name: "Add details" }));
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
