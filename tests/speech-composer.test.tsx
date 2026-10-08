/** @vitest-environment jsdom */

import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MoreFieldValues, ShellViewModel } from "../src/view-models/view-model";
import { PlannerShell } from "../src/views/planner-shell";
import { speechStartFailedCopy, speechUnavailableCopy } from "../src/views/speech-input";

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "webkitSpeechRecognition");
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

const recognitionErrors = [
  ["no-speech", "No speech was heard. Press Speak to try again."],
  ["network", "Speech lost the network. Press Speak to try again."],
  ["aborted", "Speech was cancelled. Press Speak to try again."],
  ["not-allowed", "Microphone permission was denied in this browser. Press Speak to try again."],
  ["audio-capture", "The microphone could not be opened. Press Speak to try again."],
  ["service-not-allowed", "Speech stopped. Press Speak to try again."],
] as const;

describe("composer microphone", () => {
  it("hides Speak when the browser has no speech constructor", () => {
    installDomShims();
    render(<PlannerShell viewModel={model({ speechAvailable: false })} onEvent={() => undefined} historyControl={null} />);
    expect(screen.queryByRole("button", { name: "Speak" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Listening" })).toBeNull();
    expect(screen.queryByText(speechUnavailableCopy)).toBeNull();
    expect(screen.queryByRole("button", { name: "Speak", pressed: false })).toBeNull();
  });

  it("puts a list-like transcript in the composer and shows Listening", async () => {
    installDomShims();
    const user = userEvent.setup();
    const active = installRecognition(false);
    render(<PlannerShell viewModel={model()} onEvent={() => undefined} historyControl={null} />);
    await user.click(screen.getByRole("button", { name: "Speak" }));
    const listening = screen.getByRole("button", { name: "Listening" });
    expect(listening.getAttribute("aria-pressed")).toBe("true");
    expect(listening.getAttribute("data-speech-state")).toBe("listening");
    const results = {
      length: 2,
      0: { length: 1, 0: { transcript: "Stockholm" } },
      1: { length: 1, 0: { transcript: "in June" } },
    };
    expect(Array.isArray(results)).toBe(false);
    act(() => {
      active.current?.onresult?.({ results });
    });
    expect(composerValue()).toBe("Stockholm in June");
    act(() => {
      active.current?.onend?.();
    });
    const speak = screen.getByRole("button", { name: "Speak" });
    expect(speak.getAttribute("aria-pressed")).toBe("false");
    expect(composerValue()).toBe("Stockholm in June");
  });

  it("explains a start failure and removes Speak", async () => {
    installDomShims();
    const user = userEvent.setup();
    installRecognition(true);
    render(<PlannerShell viewModel={model()} onEvent={() => undefined} historyControl={null} />);
    await user.click(screen.getByRole("button", { name: "Speak" }));
    expect(screen.queryByRole("button", { name: "Speak" })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe(speechStartFailedCopy);
  });

  it.each(recognitionErrors)("returns Speak after %s", async (code, status) => {
    installDomShims();
    const user = userEvent.setup();
    const active = installRecognition(false);
    render(<PlannerShell viewModel={model()} onEvent={() => undefined} historyControl={null} />);
    await user.click(screen.getByRole("button", { name: "Speak" }));
    act(() => {
      active.current?.onerror?.({ error: code });
      active.current?.onend?.();
    });
    const speak = screen.getByRole("button", { name: "Speak" });
    expect(speak.getAttribute("disabled")).toBeNull();
    expect(speak.getAttribute("aria-pressed")).toBe("false");
    expect(speak.getAttribute("data-speech-state")).toBe("ready");
    expect(screen.queryByRole("button", { name: "Listening" })).toBeNull();
    const note = screen.getByRole("status");
    expect(note.textContent).toBe(status);
    expect(note.getAttribute("data-speech-state")).toBe("idle");
  });

  it("keeps Speak after permission is denied and tries again on press", async () => {
    installDomShims();
    const user = userEvent.setup();
    const active = installRecognition(false);
    render(<PlannerShell viewModel={model()} onEvent={() => undefined} historyControl={null} />);
    await user.click(screen.getByRole("button", { name: "Speak" }));
    act(() => {
      active.current?.onerror?.({ error: "not-allowed" });
      active.current?.onend?.();
    });
    const speak = screen.getByRole("button", { name: "Speak" });
    expect(speak.getAttribute("disabled")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe(
      "Microphone permission was denied in this browser. Press Speak to try again.",
    );
    await user.click(speak);
    const listening = screen.getByRole("button", { name: "Listening" });
    expect(listening.getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("status")).toBeNull();
    expect(active.starts).toBe(2);
  });
});

function model(overrides: Partial<ShellViewModel> = {}): ShellViewModel {
  return {
    phase: "capture",
    busy: false,
    ready: true,
    errorText: null,
    speechAvailable: true,
    ask: "What are you planning?",
    askMark: null,
    askLabelsComposer: true,
    notice: null,
    draftConfirmation: null,
    filingMessage: null,
    filed: false,
    offerLabel: null,
    factsSentence: "",
    confirmRuns: [],
    showFacts: false,
    showConfirm: false,
    showFavorites: false,
    rows: [],
    hiddenCount: 0,
    openRow: null,
    more: emptyMore,
    moreStamp: "base",
    budgetCurrency: "EUR",
    composerPlaceholder: "Describe the event: place, people, date, time",
    offerSummary: null,
    contextChips: [],
    inputMode: "text",
    inputType: "text",
    autoComplete: undefined,
    ...overrides,
  };
}

type ActiveRecognition = {
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

function installRecognition(failStart: boolean): { current: ActiveRecognition | null; starts: number } {
  const handle: { current: ActiveRecognition | null; starts: number } = { current: null, starts: 0 };
  class Recognition {
    lang = "";
    onresult: ((event: unknown) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    onend: (() => void) | null = null;

    start(): void {
      handle.current = this;
      handle.starts += 1;
      if (failStart) {
        throw new Error("blocked");
      }
    }

    stop(): void {
      this.onend?.();
    }
  }
  Object.defineProperty(window, "SpeechRecognition", { configurable: true, writable: true, value: Recognition });
  Object.defineProperty(window, "webkitSpeechRecognition", { configurable: true, writable: true, value: undefined });
  return handle;
}

function composerValue(): string {
  const composer = document.querySelector("#composer");
  if (!(composer instanceof HTMLTextAreaElement)) {
    return "";
  }
  return composer.value;
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
