/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MoreFieldValues, PlannerViewEvent, ShellRow, ShellViewModel } from "../src/view-models/view-model";
import { PlannerShell } from "../src/views/planner-shell";

afterEach(() => {
  cleanup();
});

const harbour: ShellRow = {
  venueName: "Harbour House",
  proposalUuid: "harbour-house",
  heldByCompanyName: "Quiet Court",
  currency: "EUR",
  roomsMinor: 12000,
  foodMinor: 4000,
  spaceMinor: 1000,
  extrasMinor: 0,
  totalMinor: 17000,
  rooms: "120.00 EUR",
  foodAndBeverage: "40.00 EUR",
  space: "10.00 EUR",
  extras: "0.00 EUR",
  total: "170.00 EUR",
  expires: "2026-12-01",
  gaps: ["expired"],
  favorite: false,
  blocks: [],
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
    rows: [harbour],
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
    const card = screen.getByRole("button", { name: /Harbour House/ });
    await user.click(card);
    expect(events.at(-1)).toEqual({ type: "rowOpened", venueName: "Harbour House" });
    view.rerender(
      <PlannerShell
        viewModel={model({ openRow: harbour })}
        onEvent={(event) => events.push(event)}
        historyControl={null}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Harbour House" })).toBeTruthy();
    expect(thread.scrollTop).toBe(held);
    await user.keyboard("{Escape}");
    expect(events.some((event) => event.type === "rowClosed")).toBe(true);
    view.rerender(
      <PlannerShell viewModel={model()} onEvent={(event) => events.push(event)} historyControl={null} />,
    );
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Harbour House/ }));
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
