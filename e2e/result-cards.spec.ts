import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const;

const stockholm =
  "I need a place in Stockholm for 40 people on 12 November 2026, from 09:00 to 17:00, with dinner and a meeting room.";
const followUp = "I need a place in Gothenburg for 12 people.";

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
