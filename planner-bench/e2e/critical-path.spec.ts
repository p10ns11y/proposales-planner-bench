import { expect, test, type Page, type Route } from "@playwright/test";

const fullDay =
  "Team offsite in Stockholm for 25 people on 3 Dec 2026, a full day with breakout space and vegetarian lunch. Budget around EUR 300.";

const countWords = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

type GridRow = {
  venueName: string;
  proposalUuid?: string;
};

test("brief confirms the assumed day, asks the budget basis, and ranks only after confirm", async ({ page }) => {
  await reachBasisQuestion(page);
  await expect(page.locator("[data-lcv-fact=city]")).toHaveText("Stockholm");
  await expect(page.locator("[data-lcv-fact=date]")).toContainText("2026");
  await expect(page.locator("[data-lcv-fact=time]")).toHaveText("09:00\u201317:00");
  await expect(page.locator("[data-lcv-fact=attendees]")).toHaveText("25 people");
  await expect(page.locator("[data-lcv-fact=budget]")).toHaveText("EUR 300");
  await expect(page.getByRole("heading", { level: 2 })).toHaveAttribute("data-lcv-fact", "budget-basis");
  await expect(page.locator("span[data-lcv-fact=budget-basis]")).toHaveCount(0);
  await expect(page.locator("p[data-must-show=facts]")).toContainText("09:00");
  await expect(page.locator("p[data-must-show=facts]")).toContainText("17:00");
  await expect(page.locator("[data-lcv-machine=chat]")).toHaveAttribute("data-lcv-ui-state", "chat:confirm");
  await expect(page.getByRole("button", { name: "Yes" })).toHaveCount(0);
  await expect(page.locator("[data-offer-card]")).toHaveCount(0);

  await answerTotal(page);
  await page.getByRole("button", { name: "Yes" }).click();
  await expect(page.locator("[data-lcv-machine=chat]")).toHaveAttribute("data-lcv-ui-state", "chat:favorites");
  await expect(page.locator("[data-offer-card]")).toHaveCount(0);

  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.locator("[data-lcv-machine=chat]")).toHaveAttribute("data-lcv-ui-state", "chat:results");
  const overBudget = page.locator("[data-offer-card]").filter({ has: page.locator("[data-lcv-chip=over-budget]") });
  await expect(overBudget).toHaveCount(1);
  await expect(overBudget.locator("[data-lcv=must-show]").filter({ hasText: "EUR" })).toHaveCount(1);
});

test("ranks Best match on the first open offer and keeps the counts aligned", async ({ page }) => {
  await reachResults(page);
  const cards = page.locator("[data-offer-card]");
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  let sawOpen = false;
  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    const expired = card.locator("[data-lcv-chip=expired]");
    if ((await expired.count()) > 0) {
      await expect(expired).toBeVisible();
      await expect(expired).not.toHaveClass(/planner-chip-best/);
      await expect(card.locator("[data-lcv-chip=best-match]")).toHaveCount(0);
      continue;
    }
    await expect(card.locator("[data-lcv-chip=best-match]")).toBeVisible();
    sawOpen = true;
    break;
  }
  expect(sawOpen).toBe(true);
  await expect(page.locator("[data-lcv-chip=no-food]").first()).toBeVisible();

  const header = await page.locator("[data-lcv-count=header]").innerText();
  const reply = await page.locator("[data-lcv-count=reply]").innerText();
  expect(countFromHeader(header)).toBe(countFromReply(reply));
  expect(countFromHeader(header)).toBe(count);
});

test("opens an offer in the url, closes with Escape, and keeps the list", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 430 });
  await reachResults(page);
  const thread = page.locator(".planner-thread");
  await thread.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  const held = await thread.evaluate((node) => node.scrollTop);
  expect(held).toBeGreaterThan(0);

  const card = page.locator("[data-offer-card]").last();
  const venue = await card.getAttribute("data-venue");
  expect(venue).toBeTruthy();
  await card.click();
  await expect(page).toHaveURL(/[?&]offer=/);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("[role=dialog] [data-lcv=must-show]").first()).toBeVisible();
  await expect(thread).toHaveJSProperty("scrollTop", held);

  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/[?&]offer=/);
  await expect(page.locator(`[data-offer-card][data-venue="${venue ?? ""}"]`)).toBeFocused();
  await expect(thread).toHaveJSProperty("scrollTop", held);
});

test("saves a single More field", async ({ page }) => {
  await reachConfirm(page);
  await page.getByRole("button", { name: "More" }).click();
  const drawer = page.getByRole("dialog", { name: "Refine the brief" });
  await expect(drawer).toHaveAttribute("data-lcv-ui-state", "more:open");
  const labels = ["Event name", "Organisation", "Email", "Budget (EUR)", "Notes"] as const;
  const before = new Map<string, string>();
  for (const label of labels) {
    before.set(label, await drawer.getByLabel(label).inputValue());
  }
  const english = await drawer.getByRole("button", { name: "English" }).getAttribute("aria-pressed");
  const svenska = await drawer.getByRole("button", { name: "Svenska" }).getAttribute("aria-pressed");
  const rooms = drawer.getByRole("group", { name: "Rooms", exact: true }).locator(".planner-step-value");
  const meetings = drawer.getByRole("group", { name: "Meeting rooms" }).locator(".planner-step-value");
  const roomCount = await rooms.innerText();
  const meetingCount = await meetings.innerText();
  const food = await drawer.getByRole("switch", { name: "Food" }).getAttribute("aria-checked");

  await drawer.getByLabel("Event name").fill("Harbour day");
  await drawer.locator("[data-lcv-event=save-more]").click();
  await expect(drawer).toBeHidden();

  await page.getByRole("button", { name: "More" }).click();
  const again = page.getByRole("dialog", { name: "Refine the brief" });
  await expect(again.getByLabel("Event name")).toHaveValue("Harbour day");
  for (const label of labels) {
    if (label === "Event name") {
      continue;
    }
    await expect(again.getByLabel(label)).toHaveValue(before.get(label) ?? "");
  }
  await expect(again.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", english ?? "false");
  await expect(again.getByRole("button", { name: "Svenska" })).toHaveAttribute("aria-pressed", svenska ?? "false");
  await expect(again.getByRole("group", { name: "Rooms", exact: true }).locator(".planner-step-value")).toHaveText(roomCount);
  await expect(again.getByRole("group", { name: "Meeting rooms" }).locator(".planner-step-value")).toHaveText(meetingCount);
  await expect(again.getByRole("switch", { name: "Food" })).toHaveAttribute("aria-checked", food ?? "false");
});

test("files an English brief from the detail after the email is filled", async ({ page }) => {
  await fileEnglishBrief(page, { width: 1280, height: 800 });
  await fileEnglishBrief(page, { width: 390, height: 844 });
});

test("shows Compare for two or three wide offers only", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await reachResults(page);
  await expectWideCompare(page, true);

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole("button", { name: "Compare" })).toHaveCount(0);
  expect(await groupWidth(page)).toBeLessThan(640);

  await page.setViewportSize({ width: 1280, height: 800 });
  await reachResults(page, 2);
  await expectWideCompare(page, true);
  await reachResults(page, 1);
  await expectWideCompare(page, false);
  await reachResults(page, 5);
  await expectWideCompare(page, false);
});

async function fileEnglishBrief(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await reachResults(page);
  const card = page.locator("[data-offer-card]").first();
  const venue = await card.getAttribute("data-venue");
  expect(venue).toBeTruthy();
  await card.click();
  const detail = page.getByRole("dialog", { name: venue ?? "" });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "File this brief" }).click();
  const drawer = page.getByRole("dialog", { name: "Refine the brief" });
  await expect(drawer).toBeVisible();
  const email = drawer.getByLabel("Email");
  await expect(email).toBeFocused();
  await email.fill("planner@northwind.example");
  const saved = page.waitForResponse(
    (response) => response.url().includes("/api/turn") && response.request().method() === "POST",
  );
  await drawer.locator("[data-lcv-event=save-more]").click();
  await saved;
  await expect(drawer).toBeHidden();
  await expect(detail).toBeVisible();
  const filed = page.waitForResponse(
    (response) => response.url().includes("/api/turn") && response.request().method() === "POST",
  );
  await detail.getByRole("button", { name: "File this brief" }).click();
  await filed;
  await expect(detail.getByRole("status")).toHaveText("The brief is filed.");
  const filedButton = detail.getByRole("button", { name: "Filed" });
  await expect(filedButton).toBeDisabled();
  await expect(filedButton).toHaveAttribute("data-lcv-event", "file-brief");
}

async function reachBasisQuestion(page: Page) {
  await page.goto("/");
  await expect(page.locator("[data-lcv-marker=detail]")).toHaveAttribute("data-lcv-ui-state", "detail:closed");
  await expect(page.locator("[data-lcv-marker=more]")).toHaveAttribute("data-lcv-ui-state", "more:closed");
  await page.getByRole("textbox", { name: "What are you planning?" }).fill(fullDay);
  await page.locator("[data-lcv-event=send]").click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveAttribute("data-lcv-fact", "budget-basis");
  await expect(page.locator("[data-lcv-event=answer-basis]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Yes" })).toHaveCount(0);
}

async function answerTotal(page: Page) {
  await page.locator("#composer").fill("total");
  await page.locator("[data-lcv-event=answer-basis]").click();
  await expect(page.locator("span[data-lcv-fact=budget-basis]")).toHaveText(/total/i);
  await expect(page.getByRole("button", { name: "Yes" })).toBeVisible();
}

async function reachConfirm(page: Page) {
  await reachBasisQuestion(page);
  await answerTotal(page);
}

async function reachResults(page: Page, offers?: number) {
  if (offers !== undefined) {
    await installOfferCount(page, offers);
  }
  await reachConfirm(page);
  await page.getByRole("button", { name: "Yes" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.locator("[data-offer-card]").first()).toBeVisible();
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
  const payload = (await response.json()) as { snapshot?: { grid?: GridRow[] } };
  const grid = payload.snapshot?.grid;
  if (body.action?.type === "favoritesSubmitted" && grid !== undefined && payload.snapshot !== undefined) {
    payload.snapshot.grid = sizedGrid(grid, count);
  }
  await route.fulfill({ response, json: payload });
}

function sizedGrid(grid: GridRow[], count: number): GridRow[] {
  if (grid.length === 0 || count === grid.length) {
    return grid;
  }
  if (count < grid.length) {
    return grid.slice(0, count);
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

async function groupWidth(page: Page): Promise<number> {
  return page.locator(".planner-offer-group").evaluate((node) => node.getBoundingClientRect().width);
}

async function expectWideCompare(page: Page, shown: boolean) {
  expect(await groupWidth(page)).toBeGreaterThanOrEqual(640);
  if (shown) {
    await expect(page.getByRole("button", { name: "Compare" })).toBeVisible();
    return;
  }
  await expect(page.getByRole("button", { name: "Compare" })).toHaveCount(0);
}

function countFromHeader(line: string): number {
  const match = /^(\d+)\s+offers?\b/.exec(line.trim());
  return match?.[1] === undefined ? -1 : Number(match[1]);
}

function countFromReply(sentence: string): number {
  const lead = sentence.trim().split(/\s+/)[0] ?? "";
  const fromWord = countWords.indexOf(lead);
  if (fromWord >= 0) {
    return fromWord;
  }
  return /^\d+$/.test(lead) ? Number(lead) : -1;
}
