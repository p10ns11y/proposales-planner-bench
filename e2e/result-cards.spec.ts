import { expect, test, type Page, type Route } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const;

const stockholm =
  "I need a place in Stockholm for 40 people on 12 November 2026, from 09:00 to 17:00, with dinner and a meeting room.";
const followUp = "I need a place in Gothenburg for 12 people.";

test("greetings stay in the chat and leave the card", async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await reachResults(page);
    const cards = page.locator("[data-result-card]");
    await expect(cards).toHaveCount(1);
    const firstVenues = await venueNames(cards.nth(0));
    for (const text of ["hi", "hello", "thanks", "ok", "okay", "yes"]) {
      await send(page, text);
      await expect(page.getByText("Let's get back to planning the event.")).toBeVisible();
      await expect(cards).toHaveCount(1);
      expect(await venueNames(cards.nth(0))).toEqual(firstVenues);
    }
  }
});

test("apply after an off-topic reply adds a card for the new guest count", async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await reachResults(page);
    const cards = page.locator("[data-result-card]");
    await expect(cards).toHaveCount(1);
    await expect(cards.nth(0)).toContainText("40 guests");
    await send(page, "hi");
    await expect(page.getByText("Let's get back to planning the event.")).toBeVisible();
    await page.locator(".planner-header").getByRole("button", { name: "Add details", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Add details" });
    await drawer.getByRole("button", { name: "People and rooms", exact: true }).click();
    const moreGuests = drawer.getByRole("button", { name: "More guests" });
    for (let step = 0; step < 5; step += 1) {
      await moreGuests.click();
    }
    await drawer.getByRole("button", { name: "Apply" }).click();
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText("40 guests");
    await expect(cards.nth(1)).toContainText("45 guests");
    expect(await threadOverflow(page)).toBe(false);
  }
});

test("show more still reveals rows after an off-topic reply", async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await installOfferCount(page, 8);
    await reachResults(page);
    const offers = page.locator("[data-offer-card]");
    await expect(offers).toHaveCount(5);
    await expect(page.getByRole("button", { name: "Further matches" })).toBeVisible();
    await send(page, "hi");
    await expect(page.getByText("Let's get back to planning the event.")).toBeVisible();
    await expect(offers).toHaveCount(5);
    await page.getByRole("button", { name: "Further matches" }).click();
    await expect(offers).toHaveCount(8);
    await expect(page.getByRole("button", { name: "Further matches" })).toHaveCount(0);
    expect(await threadOverflow(page)).toBe(false);
  }
});

test("keeps header buttons off a scrolled result card", async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await reachResults(page);
    await send(page, followUp);
    await expect(page.locator("[data-result-card]")).toHaveCount(2);
    const placed = await page.evaluate(() => {
      const thread = document.querySelector(".planner-thread");
      const price = document.querySelector("[data-result-card] .planner-price");
      const button = document.querySelector(".planner-header button");
      if (!(thread instanceof HTMLElement) || !(price instanceof HTMLElement) || !(button instanceof HTMLElement)) {
        return false;
      }
      const priceBox = price.getBoundingClientRect();
      const buttonBox = button.getBoundingClientRect();
      thread.scrollTop += priceBox.top - (buttonBox.top + 8);
      return true;
    });
    expect(placed).toBe(true);
    if (process.env.EVIDENCE === "before" || process.env.EVIDENCE === "after") {
      const label = viewport.width >= 800 ? "desktop" : "phone";
      await page.screenshot({
        path: `docs/evidence/cursor-header-price-23d0/${process.env.EVIDENCE}-${label}.png`,
        fullPage: false,
      });
    }
    const overlap = await page.evaluate(() => {
      const thread = document.querySelector(".planner-thread");
      const header = document.querySelector(".planner-header");
      const prices = [...document.querySelectorAll("[data-result-card] .planner-price")];
      const buttons = [...document.querySelectorAll(".planner-header button")];
      const cards = [...document.querySelectorAll("[data-result-card]")];
      if (
        !(thread instanceof HTMLElement) ||
        !(header instanceof HTMLElement) ||
        prices.length === 0 ||
        buttons.length === 0
      ) {
        return null;
      }
      const threadBox = thread.getBoundingClientRect();
      const headerBox = header.getBoundingClientRect();
      const buttonBoxes = buttons.map((button) => button.getBoundingClientRect());
      function hits(
        a: { left: number; right: number; top: number; bottom: number },
        b: { left: number; right: number; top: number; bottom: number },
      ) {
        return a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
      }
      function clip(box: DOMRect) {
        return {
          left: Math.max(box.left, threadBox.left),
          right: Math.min(box.right, threadBox.right),
          top: Math.max(box.top, threadBox.top),
          bottom: Math.min(box.bottom, threadBox.bottom),
        };
      }
      const coveredPrices = prices.flatMap((node) => {
        const full = node.getBoundingClientRect();
        const visible = clip(full);
        if (visible.right - visible.left <= 1 || visible.bottom - visible.top <= 1) {
          return [];
        }
        const covered = buttonBoxes.some((button) => hits(visible, button));
        const y = Math.min(Math.max(full.top + full.height / 2, threadBox.top + 1), threadBox.bottom - 1);
        const blocked = [full.left + 4, full.right - 4].some((x) => {
          if (x < threadBox.left || x > threadBox.right || y < full.top || y > full.bottom) {
            return false;
          }
          return document.elementFromPoint(x, y)?.closest(".planner-header") != null;
        });
        if (!covered && !blocked) {
          return [];
        }
        return [node.textContent ?? ""];
      });
      const cardCovered = cards.some((card) => {
        const visible = clip(card.getBoundingClientRect());
        if (visible.right - visible.left <= 1 || visible.bottom - visible.top <= 1) {
          return false;
        }
        return buttonBoxes.some((button) => hits(visible, button));
      });
      const buttonTop = Math.min(...buttonBoxes.map((box) => box.top));
      const buttonBottom = Math.max(...buttonBoxes.map((box) => box.bottom));
      const priceInButtonBand = prices.some((node) => {
        const box = node.getBoundingClientRect();
        return box.bottom > buttonTop + 1 && box.top < buttonBottom - 1 && box.bottom > threadBox.top && box.top < threadBox.bottom;
      });
      return {
        headerOverlaysThread: headerBox.bottom > threadBox.top + 8 && headerBox.top < threadBox.bottom - 8,
        priceInButtonBand,
        cardCovered,
        coveredPrices,
      };
    });
    expect(overlap).not.toBeNull();
    if (overlap === null) {
      return;
    }
    if (overlap.headerOverlaysThread) {
      expect(overlap.priceInButtonBand).toBe(true);
    }
    expect(overlap.cardCovered).toBe(false);
    expect(overlap.coveredPrices).toEqual([]);
  }
});

test("keeps earlier result cards when the chat continues", async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await reachResults(page);
    const cards = page.locator("[data-result-card]");
    await expect(cards).toHaveCount(1);
    const firstQuery = await cards.nth(0).getAttribute("data-result-query");
    const firstVenues = await venueNames(cards.nth(0));
    expect(firstVenues.length).toBeGreaterThan(2);
    expect(firstQuery).toContain("Stockholm");

    await send(page, "What's the weather in Paris tomorrow?");
    await expect(page.getByText("Let's get back to planning the event.")).toBeVisible();
    await expect(cards).toHaveCount(1);
    await expect(cards.nth(0)).toHaveAttribute("data-result-query", firstQuery ?? "");
    expect(await venueNames(cards.nth(0))).toEqual(firstVenues);
    expect(await threadOverflow(page)).toBe(false);

    await send(page, followUp);
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toHaveAttribute("data-result-query", firstQuery ?? "");
    expect(await venueNames(cards.nth(0))).toEqual(firstVenues);
    await expect(cards.nth(1)).toHaveAttribute("data-result-query", followUp);
    expect((await venueNames(cards.nth(1))).length).toBeGreaterThan(0);
    expect(await threadOverflow(page)).toBe(false);

    const latestVenues = await venueNames(cards.nth(1));
    await send(page, "pick only two");
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toHaveAttribute("data-result-query", firstQuery ?? "");
    expect(await venueNames(cards.nth(0))).toEqual(firstVenues);
    expect(await venueNames(cards.nth(2))).toEqual(latestVenues.slice(0, 2));
    expect(await threadOverflow(page)).toBe(false);

    await send(page, "pick only two");
    await expect(page.getByText("I can't narrow that list. Tell me what to change.")).toBeVisible();
    await expect(cards).toHaveCount(3);
    expect(await venueNames(cards.nth(2))).toEqual(latestVenues.slice(0, 2));
    expect(await threadOverflow(page)).toBe(false);
  }
});

async function reachResults(page: Page) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "What are you planning?" }).fill(stockholm);
  await page.locator("[data-lcv-event=send]").click();
  await page.getByRole("button", { name: "Yes" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.locator("[data-result-card]")).toHaveCount(1);
}

async function send(page: Page, text: string) {
  await page.locator("#composer").fill(text);
  await page.locator("[data-lcv-event=send]").click();
}

async function venueNames(card: ReturnType<Page["locator"]>): Promise<string[]> {
  return card.locator("[data-offer-card]").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-venue") ?? ""),
  );
}

async function threadOverflow(page: Page): Promise<boolean> {
  return page.locator(".planner-thread").evaluate((node) => node.scrollWidth > node.clientWidth + 1);
}

async function installOfferCount(page: Page, count: number) {
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.route("**/api/turn", async (route) => {
    await resizeTurn(route, count);
  });
}

async function resizeTurn(route: Route, count: number) {
  const body = route.request().postDataJSON() as { action?: { type?: string } };
  const response = await route.fetch();
  const payload = (await response.json()) as { snapshot?: { grid?: { venueName: string; proposalUuid?: string }[] } };
  const grid = payload.snapshot?.grid;
  if (
    (body.action?.type === "favoritesSubmitted" || body.action?.type === "inlineSkipped") &&
    grid !== undefined &&
    payload.snapshot !== undefined
  ) {
    payload.snapshot.grid = sizedGrid(grid, count);
  }
  await route.fulfill({ response, json: payload });
}

function sizedGrid(
  grid: { venueName: string; proposalUuid?: string }[],
  count: number,
): { venueName: string; proposalUuid?: string }[] {
  if (grid.length === 0 || count === grid.length) {
    return grid;
  }
  const next = grid.slice();
  let index = 0;
  while (next.length < count) {
    const source = grid[index % grid.length];
    if (source === undefined) {
      break;
    }
    const n = next.length + 1;
    next.push({
      ...source,
      venueName: `${source.venueName} ${n}`,
      proposalUuid: `${source.proposalUuid ?? "row"}-${n}`,
    });
    index += 1;
  }
  return next;
}
