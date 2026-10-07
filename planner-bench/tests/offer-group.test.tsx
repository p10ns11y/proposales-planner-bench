/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OfferGroupPart, OfferPart } from "../src/contract/offer-group";
import { OfferGroupCard } from "../src/views/offer-group";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("compare toggle in the group", () => {
  it("is in the document only when the measured group is wide enough", () => {
    installMatchMedia();
    renderGroup(3, 390);
    expect(screen.queryByRole("button", { name: "Compare" })).toBeNull();
    cleanup();
    renderGroup(3, 639);
    expect(screen.queryByRole("button", { name: "Compare" })).toBeNull();
    cleanup();
    renderGroup(3, 640);
    expect(screen.getByRole("button", { name: "Compare" }).getAttribute("aria-pressed")).toBe("false");
    cleanup();
    renderGroup(3, 1280);
    expect(screen.getByRole("button", { name: "Compare" })).toBeTruthy();
    cleanup();
    renderGroup(1, 1280);
    expect(screen.queryByRole("button", { name: "Compare" })).toBeNull();
    cleanup();
    renderGroup(2, 1280);
    expect(screen.getByRole("button", { name: "Compare" })).toBeTruthy();
    cleanup();
    renderGroup(5, 1280);
    expect(screen.queryByRole("button", { name: "Compare" })).toBeNull();
  });

  it("shows a neutral Expired chip and keeps Best match off that offer", async () => {
    installMatchMedia();
    installWidth(1280);
    const user = userEvent.setup();
    render(
      <OfferGroupCard
        group={group([
          offer({
            proposalUuid: "canal",
            venueName: "Canal Loft",
            heldByCompanyName: "Quiet Court",
            total: 21000,
            gaps: ["expired"],
            bestMatch: false,
          }),
          offer({
            proposalUuid: "harbour",
            venueName: "Harbour House",
            total: 36500,
            gaps: [],
            bestMatch: true,
          }),
        ])}
        hiddenCount={0}
        openName={null}
        onOpen={() => undefined}
        onShowMore={() => undefined}
      />,
    );
    const canal = screen.getByRole("button", { name: /Canal Loft/ });
    const harbour = screen.getByRole("button", { name: /Harbour House/ });
    expect(canal.getAttribute("data-best")).toBe("no");
    expect(harbour.getAttribute("data-best")).toBe("yes");
    expect(canal.textContent).toContain("Expired");
    expect(canal.textContent).not.toContain("Best match");
    expect(harbour.textContent).toContain("Best match");
    expect(canal.querySelector(".planner-chip-best")).toBeNull();
    expect(harbour.querySelector(".planner-chip-status")?.textContent).toBeUndefined();
    await user.click(screen.getByRole("button", { name: "Compare" }));
    expect(screen.getByRole("button", { name: "Compare" }).getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector(".planner-compare-price.planner-price-expired")?.textContent).toBe("EUR 210");
    const best = document.querySelector(".planner-compare-best");
    expect(best?.textContent).toContain("Harbour House");
    const canalCard = document.querySelector(".planner-compare-card");
    expect(canalCard?.textContent).toContain("Extras: EUR 120");
    expect(canalCard?.textContent).toContain("Rooms: \u2014");
    expect(canalCard?.textContent).not.toContain("Other");
  });
});

function renderGroup(count: number, width: number) {
  installWidth(width);
  const offers = Array.from({ length: count }, (_, index) =>
    offer({
      proposalUuid: `offer-${index}`,
      venueName: `Venue ${index + 1}`,
      bestMatch: index === 0,
    }),
  );
  render(
    <OfferGroupCard
      group={group(offers)}
      hiddenCount={0}
      openName={null}
      onOpen={() => undefined}
      onShowMore={() => undefined}
    />,
  );
}

function group(offers: OfferPart[]): OfferGroupPart {
  return {
    summary: {
      count: offers.length,
      city: "Stockholm",
      dateLabel: "Thu 12 Nov",
      people: 40,
      line: `${offers.length} offers · Stockholm · Thu 12 Nov · 40 guests`,
    },
    offers,
    footer: "Prices are totals for the day, excl. VAT",
    sampleData: false,
    sourceLabel: null,
  };
}

function offer(overrides: Partial<OfferPart> & Pick<OfferPart, "proposalUuid" | "venueName">): OfferPart {
  return {
    heldByCompanyName: null,
    total: 21000,
    currency: "EUR",
    rooms: 0,
    foodAndBeverage: 6000,
    space: 3000,
    extras: 12000,
    expires: "2026-09-01",
    expiresLabel: "Expired 1 Sep 2026",
    gaps: [],
    bestMatch: false,
    favorite: false,
    blocks: [],
    ...overrides,
  };
}

function installMatchMedia() {
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

function installWidth(width: number) {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      private readonly callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe() {
        this.callback(
          [{ contentRect: { width, height: 0, top: 0, left: 0, bottom: 0, right: width, x: 0, y: 0, toJSON() { return {}; } } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
}
