/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    askLabelsComposer: true,
    notice: null,
    draftConfirmation: null,
    offerLabel: null,
    factsSentence: "Stockholm, 12 November 2026, 40 people",
    showFacts: false,
    showConfirm: false,
    showFavorites: false,
    rows: [canalLoft],
    hiddenCount: 0,
    openRow: null,
    more: emptyMore,
    moreStamp: "base",
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
});

describe("More drawer", () => {
  it("sends only the fields that changed", async () => {
    installDomShims();
    const user = userEvent.setup();
    const events: PlannerViewEvent[] = [];
    render(<PlannerShell viewModel={model({ phase: "capture", rows: [], offerSummary: null })} onEvent={(event) => events.push(event)} historyControl={null} />);
    await user.click(screen.getByRole("button", { name: "More" }));
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
    await user.click(screen.getByRole("button", { name: "More" }));
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
    await user.click(screen.getByRole("button", { name: "More" }));
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
});

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
