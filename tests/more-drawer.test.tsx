/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openingSnapshot } from "../src/flow/chat-request";
import { runViewportAction } from "../src/flow/viewport-turn";
import { createFixtureClient } from "../src/proposales/fixture-client";
import { shellViewModel } from "../src/view-models/selectors";
import type { MoreFieldValues } from "../src/view-models/view-model";
import { MoreDrawer, changedDetails, openDetailSection } from "../src/views/more-drawer";

const knownBrief =
  "Title Harbour day. Organisation Northwind. Email planner@northwind.example. Start 2026-12-03. End 2026-12-04. Attendees 25. Language en. City Stockholm. Rooms 8. Meeting rooms 2. Food yes. Budget around EUR 300 total. Notes Dinner in the hall. Start time 09:00. End time 17:00.";

afterEach(() => {
  cleanup();
});

function blankMore(overrides: Partial<MoreFieldValues> = {}): MoreFieldValues {
  return {
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
    ...overrides,
  };
}

describe("open detail section", () => {
  it("opens the first section that is missing a required fact", () => {
    expect(openDetailSection(blankMore())).toBe("contact");
    expect(openDetailSection(blankMore({ contactEmail: "ada@northwind.example" }))).toBe("event");
    expect(
      openDetailSection(
        blankMore({
          contactEmail: "ada@northwind.example",
          startDate: "2026-12-03",
          endDate: "2026-12-03",
        }),
      ),
    ).toBe("people");
    expect(
      openDetailSection(
        blankMore({
          contactEmail: "ada@northwind.example",
          startDate: "2026-12-03",
          endDate: "2026-12-04",
          attendeeCount: "25",
        }),
      ),
    ).toBe("people");
    expect(
      openDetailSection(
        blankMore({
          contactEmail: "ada@northwind.example",
          startDate: "2026-12-03",
          endDate: "2026-12-03",
          attendeeCount: "25",
          budget: "300",
        }),
      ),
    ).toBe("budget");
    expect(
      openDetailSection(
        blankMore({
          contactEmail: "ada@northwind.example",
          startDate: "2026-12-03",
          endDate: "2026-12-03",
          attendeeCount: "25",
        }),
      ),
    ).toBe("preferences");
    expect(
      openDetailSection(
        blankMore({
          contactEmail: "ada@northwind.example",
          startDate: "2026-12-03",
          endDate: "2026-12-04",
          attendeeCount: "25",
          roomCount: "8",
          budget: "300",
          budgetBasis: "total",
          language: "en",
        }),
      ),
    ).toBe("contact");
  });
});

describe("changed details", () => {
  it("returns nothing when every field still matches the brief", () => {
    const more = blankMore({
      organisationName: "Northwind",
      contactEmail: "planner@northwind.example",
      eventTitle: "Harbour day",
      city: "Stockholm",
      startDate: "2026-12-03",
      endDate: "2026-12-04",
      startTime: "09:00",
      endTime: "17:00",
      attendeeCount: "25",
      roomCount: "8",
      meetingRoomCount: "2",
      foodRequired: "yes",
      notes: "Dinner in the hall.",
      budget: "300",
      budgetBasis: "total",
      currency: "EUR",
      language: "en",
    });
    expect(changedDetails(more, { ...more, city: " Stockholm " })).toEqual({});
    expect(changedDetails(more, { ...more, city: "Gothenburg" })).toEqual({ city: "Gothenburg" });
    expect(changedDetails(more, { ...more, budgetBasis: "per-person" })).toEqual({ budgetBasis: "per-person" });
  });
});

describe("Add details drawer", () => {
  it("shows one open section, swaps it, and says nothing changed", async () => {
    installDomShims();
    const user = userEvent.setup();
    const events: string[] = [];
    const more = blankMore({
      organisationName: "Northwind",
      contactEmail: "planner@northwind.example",
      eventTitle: "Harbour day",
      startDate: "2026-12-03",
      endDate: "2026-12-04",
      attendeeCount: "25",
      roomCount: "8",
      budget: "300",
      budgetBasis: "total",
      currency: "EUR",
      language: "en",
    });
    render(
      <MoreDrawer
        more={more}
        moreStamp="known"
        currency="EUR"
        open
        focusEmail={false}
        disabled={false}
        onOpenChange={() => undefined}
        onEvent={() => events.push("edited")}
        onApplied={(line) => events.push(line)}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Add details" });
    for (const [name, event] of [
      ["Contact", "fold-contact"],
      ["Event and dates", "fold-event"],
      ["People and rooms", "fold-people"],
      ["Budget", "fold-budget"],
      ["Preferences", "fold-preferences"],
    ] as const) {
      const toggle = screen.getByRole("button", { name });
      expect(toggle.getAttribute("data-lcv-event")).toBe(event);
      expect(toggle.getAttribute("data-lcv-from")).toBe("more:open");
      expect(toggle.getAttribute("data-lcv-to-success")).toBe("more:open");
      expect(toggle.getAttribute("data-lcv-to-fail")).toBe("more:open");
      expect(toggle.getAttribute("data-lcv-to-interrupted")).toBe("more:open");
    }
    expect(dialog.querySelectorAll('[aria-expanded="true"]')).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Contact" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Event and dates" })).toBeNull();
    expect(screen.getByLabelText("Organisation")).toHaveProperty("value", "Northwind");
    expect(screen.getByLabelText("Email")).toHaveProperty("value", "planner@northwind.example");

    await user.click(screen.getByRole("button", { name: "Event and dates" }));
    expect(screen.getByRole("button", { name: "Contact" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("button", { name: "Event and dates" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("region", { name: "Event and dates" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Contact" })).toBeNull();
    expect(screen.getByLabelText("Event name")).toHaveProperty("value", "Harbour day");
    expect(screen.getByLabelText("Start date")).toHaveProperty("value", "2026-12-03");
    expect(dialog.querySelectorAll('[aria-expanded="true"]')).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(events).toEqual(["Nothing changed"]);
  });

  it("returns to the first missing section when the drawer opens again", async () => {
    installDomShims();
    const user = userEvent.setup();
    const more = blankMore({ contactEmail: "ada@northwind.example" });
    const view = render(
      <MoreDrawer
        more={more}
        moreStamp="dates"
        currency="EUR"
        open
        focusEmail={false}
        disabled={false}
        onOpenChange={() => undefined}
        onEvent={() => undefined}
        onApplied={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: "Event and dates" }).getAttribute("aria-expanded")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Contact" }));
    expect(screen.getByLabelText("Email")).toHaveProperty("value", "ada@northwind.example");
    view.rerender(
      <MoreDrawer
        more={more}
        moreStamp="dates"
        currency="EUR"
        open={false}
        focusEmail={false}
        disabled={false}
        onOpenChange={() => undefined}
        onEvent={() => undefined}
        onApplied={() => undefined}
      />,
    );
    view.rerender(
      <MoreDrawer
        more={more}
        moreStamp="dates"
        currency="EUR"
        open
        focusEmail={false}
        disabled={false}
        onOpenChange={() => undefined}
        onEvent={() => undefined}
        onApplied={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: "Event and dates" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Contact" }).getAttribute("aria-expanded")).toBe("false");
  });
});

describe("known brief prefill", () => {
  it("fills every drawer field the brief already knows", async () => {
    const client = createFixtureClient();
    const opened = await runViewportAction({
      action: { type: "composerSubmitted", text: knownBrief },
      snapshot: openingSnapshot(await client.listCompanies()),
      client,
      today: "2026-10-08",
    });
    const view = shellViewModel({
      snapshot: opened.snapshot,
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(view.more).toMatchObject({
      eventTitle: "Harbour day",
      organisationName: "Northwind",
      contactEmail: "planner@northwind.example",
      city: "Stockholm",
      startDate: "2026-12-03",
      endDate: "2026-12-04",
      startTime: "09:00",
      endTime: "17:00",
      attendeeCount: "25",
      roomCount: "8",
      meetingRoomCount: "2",
      foodRequired: "yes",
      language: "en",
      budget: "300",
      budgetBasis: "total",
      currency: "EUR",
    });
    expect(view.more.notes).toBe("Dinner in the hall.");
    expect(openDetailSection(view.more)).toBe("contact");
    expect(changedDetails(view.more, view.more)).toEqual({});
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
