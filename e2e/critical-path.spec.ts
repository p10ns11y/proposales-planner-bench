import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

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
  await headerButton(page, "Add details").click();
  const drawer = page.getByRole("dialog", { name: "Add details" });
  await expect(drawer).toHaveAttribute("data-lcv-ui-state", "more:open");
  const labels = ["Event name", "Organisation", "Email", "Budget (EUR)", "Notes"] as const;
  const before = new Map<string, string>();
  for (const label of labels) {
    await openFold(drawer, foldFor(label));
    before.set(label, await drawer.getByLabel(label).inputValue());
  }
  await openFold(drawer, "Preferences");
  const english = await drawer.getByRole("button", { name: "English" }).getAttribute("aria-pressed");
  const svenska = await drawer.getByRole("button", { name: "Svenska" }).getAttribute("aria-pressed");
  await openFold(drawer, "People and rooms");
  const rooms = drawer.getByRole("group", { name: "Rooms", exact: true }).locator(".planner-step-value");
  const meetings = drawer.getByRole("group", { name: "Meeting rooms" }).locator(".planner-step-value");
  const roomCount = await rooms.innerText();
  const meetingCount = await meetings.innerText();
  const food = await drawer.getByRole("switch", { name: "Food" }).getAttribute("aria-checked");

  await openFold(drawer, "Event and dates");
  await drawer.getByLabel("Event name").fill("Harbour day");
  await drawer.locator("[data-lcv-event=save-more]").click();
  await expect(drawer).toBeHidden();

  await headerButton(page, "Add details").click();
  const again = page.getByRole("dialog", { name: "Add details" });
  await openFold(again, "Event and dates");
  await expect(again.getByLabel("Event name")).toHaveValue("Harbour day");
  for (const label of labels) {
    if (label === "Event name") {
      continue;
    }
    await openFold(again, foldFor(label));
    await expect(again.getByLabel(label)).toHaveValue(before.get(label) ?? "");
  }
  await openFold(again, "Preferences");
  await expect(again.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", english ?? "false");
  await expect(again.getByRole("button", { name: "Svenska" })).toHaveAttribute("aria-pressed", svenska ?? "false");
  await openFold(again, "People and rooms");
  await expect(again.getByRole("group", { name: "Rooms", exact: true }).locator(".planner-step-value")).toHaveText(roomCount);
  await expect(again.getByRole("group", { name: "Meeting rooms" }).locator(".planner-step-value")).toHaveText(meetingCount);
  await expect(again.getByRole("switch", { name: "Food" })).toHaveAttribute("aria-checked", food ?? "false");
});

test("files an English brief from the detail after the email is filled", async ({ page }) => {
  await fileEnglishBrief(page, { width: 1280, height: 800 });
  await fileEnglishBrief(page, { width: 390, height: 844 });
});

test("shows Budget (SEK) for a Stockholm brief", async ({ page }) => {
  await expectStockholmBudget(page, { width: 390, height: 844 });
  await expectStockholmBudget(page, { width: 1280, height: 800 });
});

test("shows Compare for two or three wide offers only", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await reachResults(page);
  await expectWideCompare(page, true);

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole("button", { name: "Compare", exact: true })).toHaveCount(0);
  expect(await groupWidth(page)).toBeLessThan(640);

  await page.setViewportSize({ width: 1280, height: 800 });
  await reachResults(page, 2);
  await expectWideCompare(page, true);
  await reachResults(page, 1);
  await expectWideCompare(page, false);
  await reachResults(page, 5);
  await expectWideCompare(page, false);
});

async function expectStockholmBudget(page: Page, viewport: { width: number; height: number }) {
  const stockholm =
    "Team offsite in Stockholm for 25 people on 3 Dec 2026, a full day with breakout space and vegetarian lunch.";
  await page.setViewportSize(viewport);
  await page.goto("/");
  await page.getByRole("textbox", { name: "What are you planning?" }).fill(stockholm);
  await page.locator("[data-lcv-event=send]").click();
  await expect(page.locator("[data-lcv-fact=city]")).toHaveText("Stockholm");
  await page.locator(".planner-header").getByRole("button", { name: "Add details", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Add details" });
  await openFold(drawer, "Budget");
  await expect(drawer.getByLabel("Budget (SEK)")).toBeVisible();
}

test("fits the More drawer on a phone and a desktop", async ({ page }) => {
  await reachResults(page);
  await expectDrawerFits(page, { width: 390, height: 844 });
  await page.keyboard.press("Escape");
  await expectDrawerFits(page, { width: 1280, height: 800 });
});

test("shows the chosen language after an English brief", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("[data-lcv-marker=detail]")).toHaveAttribute("data-lcv-ui-state", "detail:closed");
  await expect(page.locator("[data-lcv-marker=more]")).toHaveAttribute("data-lcv-ui-state", "more:closed");
  await page.locator(".planner-header").getByRole("button", { name: "Add details", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Add details" });
  await openFold(drawer, "Preferences");
  const english = drawer.getByRole("button", { name: "English" });
  const svenska = drawer.getByRole("button", { name: "Svenska" });
  await expect(english).toHaveAttribute("aria-pressed", "false");
  await expect(svenska).toHaveAttribute("aria-pressed", "false");
  await expect(english).toBeEnabled();
  await expect(svenska).toBeEnabled();
  await expect(drawer.locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(drawer.getByText("Language of the request venues receive")).toBeVisible();
  expect(await svenska.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();

  await page.setViewportSize({ width: 1280, height: 800 });
  await reachResults(page);
  await page.locator(".planner-header").getByRole("button", { name: "Add details", exact: true }).click();
  const open = page.getByRole("dialog", { name: "Add details" });
  await openFold(open, "Preferences");
  const language = open.getByRole("group", { name: "Language" });
  await expect(language.locator('[aria-pressed="true"]')).toHaveCount(1);
  await expect(open.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
  await expect(open.getByRole("button", { name: "Svenska" })).toHaveAttribute("aria-pressed", "false");
  const pressedBackground = await open.getByRole("button", { name: "English" }).evaluate((element) => getComputedStyle(element).backgroundColor);
  const openBackground = await open.getByRole("button", { name: "Svenska" }).evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(pressedBackground).not.toBe(openBackground);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(language.locator('[aria-pressed="true"]')).toHaveCount(1);
});

test("shows the updated headcount after More applies", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await reachResults(page);
  await page.locator(".planner-header").getByRole("button", { name: "Add details", exact: true }).click();
  let drawer = page.getByRole("dialog", { name: "Add details" });
  await drawer.locator("[data-lcv-event=save-more]").click();
  await expect(drawer).toBeHidden();
  await expect(page.locator("[data-more-update]")).toHaveText("Nothing changed");

  await page.locator(".planner-header").getByRole("button", { name: "Add details", exact: true }).click();
  drawer = page.getByRole("dialog", { name: "Add details" });
  await openFold(drawer, "People and rooms");
  await stepTo(drawer.getByRole("group", { name: "Guests" }), "guests", 30);
  await stepTo(drawer.getByRole("group", { name: "Meeting rooms" }), "meeting rooms", 2);
  let releaseTurn: () => void = () => undefined;
  const turnHeld = new Promise<void>((resolve) => {
    releaseTurn = resolve;
  });
  await page.route("**/api/turn", async (route) => {
    const body = route.request().postDataJSON() as { action?: { type?: string } };
    if (body.action?.type === "moreEdited") {
      await turnHeld;
    }
    await route.continue();
  });
  const applying = drawer.locator("[data-lcv-event=save-more]").click();
  await expect(page.getByRole("status").filter({ hasText: "Updating the brief" })).toBeVisible();
  releaseTurn();
  await applying;
  await expect(page.locator("[data-more-update]")).toHaveText("Updated: 30 guests, 2 meeting rooms");
  await expect(page.locator("[data-lcv-count=header]")).toContainText("30 guests");

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator("[data-more-update]")).toHaveText("Updated: 30 guests, 2 meeting rooms");
  await expect(page.locator("[data-lcv-count=header]")).toContainText("30 guests");
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
  const drawer = page.getByRole("dialog", { name: "Add details" });
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
  await expectNoTurn(page, () => filedButton.click({ force: true }));
}

async function expectNoTurn(page: Page, act: () => Promise<unknown>) {
  const sent = page
    .waitForRequest((request) => request.method() === "POST" && request.url().includes("/api/turn"), { timeout: 600 })
    .then(
      () => true,
      () => false,
    );
  await act().catch(() => undefined);
  expect(await sent).toBe(false);
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
    await expect(page.getByRole("button", { name: "Compare", exact: true })).toBeVisible();
    return;
  }
  await expect(page.getByRole("button", { name: "Compare", exact: true })).toHaveCount(0);
}

async function expectDrawerFits(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.locator(".planner-header").getByRole("button", { name: "Add details", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Add details" });
  await expect(drawer).toBeVisible();
  await openFold(drawer, "People and rooms");
  const body = drawer.locator(".planner-drawer-body");
  expect(
    await body.evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      const spilled = [...node.querySelectorAll("input, textarea, button, .planner-step-row, .planner-segment")].some(
        (element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1);
        },
      );
      return node.scrollWidth <= node.clientWidth && !spilled;
    }),
  ).toBe(true);
  const rooms = drawer.getByRole("group", { name: "Rooms", exact: true });
  const meetings = drawer.getByRole("group", { name: "Meeting rooms" });
  const roomsBox = await rooms.boundingBox();
  const meetingsBox = await meetings.boundingBox();
  const bodyBox = await body.boundingBox();
  expect(roomsBox).toBeTruthy();
  expect(meetingsBox).toBeTruthy();
  expect(bodyBox).toBeTruthy();
  if (roomsBox === null || meetingsBox === null || bodyBox === null) {
    return;
  }
  expect(meetingsBox.y).toBeGreaterThanOrEqual(roomsBox.y + roomsBox.height - 1);
  expect(roomsBox.width).toBeGreaterThan(bodyBox.width * 0.85);
  expect(meetingsBox.width).toBeGreaterThan(bodyBox.width * 0.85);
  const buttonBox = await rooms.getByRole("button").first().boundingBox();
  expect(buttonBox).toBeTruthy();
  if (buttonBox === null) {
    return;
  }
  expect(buttonBox.width).toBeGreaterThanOrEqual(44);
  expect(buttonBox.height).toBeGreaterThanOrEqual(44);
  const labelBox = await rooms.locator("span").first().boundingBox();
  const stepperBox = await rooms.locator(".planner-stepper").boundingBox();
  expect(labelBox).toBeTruthy();
  expect(stepperBox).toBeTruthy();
  if (labelBox === null || stepperBox === null) {
    return;
  }
  expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(stepperBox.x + 1);
}

async function stepTo(group: Locator, label: string, target: number) {
  const value = group.locator(".planner-step-value");
  let current = Number((await value.innerText()).trim());
  const name = `${current < target ? "More" : "Fewer"} ${label}`;
  while (current !== target) {
    await group.getByRole("button", { name }).click();
    current += current < target ? 1 : -1;
  }
  await expect(value).toHaveText(String(target));
}

const sizedViewports = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const;

test("starts a new chat from the header during a conversation", async ({ page }) => {
  for (const viewport of sizedViewports) {
    await page.setViewportSize(viewport);
    await reachConfirm(page);
    await expect(page.getByRole("button", { name: "Yes" })).toBeVisible();
    const headerNew = headerButton(page, "New chat");
    await expect(headerNew).toBeVisible();
    await headerNew.click();
    await expect(page.getByRole("heading", { level: 1, name: "What are you planning?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "40 people in Stockholm, 12 Nov" })).toBeVisible();
    await expect(page.getByText(fullDay)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Yes" })).toHaveCount(0);
    await expect(page.locator("[data-offer-card]")).toHaveCount(0);
    await expect(page.locator("[data-lcv-machine=chat]")).toHaveAttribute("data-lcv-ui-state", "chat:capture");
  }
});

test("names the details control the same in the header, composer, and drawer", async ({ page }) => {
  for (const viewport of sizedViewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const header = headerButton(page, "Add details");
    const composer = page.locator(".planner-composer").getByRole("button", { name: "Add details" });
    await expect(header).toBeVisible();
    await expect(composer).toBeVisible();
    await expect(header).toHaveAttribute("title", "Add details");
    await expect(composer).toHaveAttribute("title", "Add details");
    expect(await header.getAttribute("aria-label")).toBe(await composer.getAttribute("aria-label"));
    const headerIcon = header.locator("svg");
    const composerIcon = composer.locator("svg");
    await expect(headerIcon).toHaveClass(/lucide-list-plus/);
    await expect(composerIcon).toHaveClass(/lucide-list-plus/);
    const headerIconBox = await headerIcon.boundingBox();
    const composerIconBox = await composerIcon.boundingBox();
    expect(headerIconBox).toBeTruthy();
    expect(composerIconBox).toBeTruthy();
    expect(Math.round(headerIconBox?.width ?? 0)).toBe(Math.round(composerIconBox?.width ?? 0));
    expect(Math.round(headerIconBox?.height ?? 0)).toBe(Math.round(composerIconBox?.height ?? 0));
    const headerBox = await header.boundingBox();
    const composerBox = await composer.boundingBox();
    expect(Math.round(headerBox?.height ?? 0)).toBe(Math.round(composerBox?.height ?? 0));
    await header.click();
    const drawer = page.getByRole("dialog", { name: "Add details" });
    await expect(drawer.locator(".planner-drawer-title")).toHaveText("Add details");
    await page.getByRole("button", { name: "Close" }).click();
    await expect(drawer).toBeHidden();
    await composer.click();
    await expect(page.getByRole("dialog", { name: "Add details" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
  }
});

test("places File this brief on the best-match suggestion", async ({ page }) => {
  for (const viewport of sizedViewports) {
    await page.setViewportSize(viewport);
    await reachResults(page);
    const thread = page.locator(".planner-thread");
    await thread.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });
    const file = page.locator(".planner-file-suggestion [data-lcv-event=file-brief]");
    await expect(file).toHaveText("File this brief");
    await expect(file).toBeEnabled();
    const placed = await page.evaluate((width) => {
      const row = document.querySelector(".planner-file-suggestion");
      const summary = row?.querySelector("[data-lcv-count=reply]");
      const fileButton = row?.querySelector("[data-lcv-event=file-brief]");
      const last = [...document.querySelectorAll("[data-offer-card]")].at(-1);
      const threadNode = document.querySelector(".planner-thread");
      if (
        !(row instanceof HTMLElement) ||
        !(summary instanceof HTMLElement) ||
        !(fileButton instanceof HTMLButtonElement) ||
        !(last instanceof HTMLElement) ||
        !(threadNode instanceof HTMLElement)
      ) {
        return null;
      }
      const rowBox = row.getBoundingClientRect();
      const summaryBox = summary.getBoundingClientRect();
      const lastBox = last.getBoundingClientRect();
      const fileBox = fileButton.getBoundingClientRect();
      const overlaps =
        fileBox.top < summaryBox.bottom && fileBox.bottom > summaryBox.top && fileBox.left > summaryBox.left;
      const wrapped = fileBox.top >= summaryBox.bottom - 1;
      const inside =
        fileBox.left >= rowBox.left - 1 &&
        fileBox.right <= rowBox.right + 1 &&
        fileBox.top >= rowBox.top - 1 &&
        fileBox.bottom <= rowBox.bottom + 1 &&
        summaryBox.left >= rowBox.left - 1 &&
        summaryBox.right <= rowBox.right + 1;
      return {
        belowResults: rowBox.top >= lastBox.bottom - 1,
        inside,
        beside: width >= 800 ? overlaps && fileBox.right > summaryBox.right - 1 : inside && (overlaps || wrapped),
        wrapGap: wrapped ? fileBox.top - summaryBox.bottom : 0,
        threadOverflow: threadNode.scrollWidth > threadNode.clientWidth + 1,
      };
    }, viewport.width);
    expect(placed).not.toBeNull();
    if (placed === null) {
      return;
    }
    expect(placed.belowResults).toBe(true);
    expect(placed.inside).toBe(true);
    expect(placed.beside).toBe(true);
    expect(placed.wrapGap).toBeLessThanOrEqual(16);
    expect(placed.threadOverflow).toBe(false);
  }
});

test("separates the budget on the confirm step", async ({ page }) => {
  for (const viewport of sizedViewports) {
    await page.setViewportSize(viewport);
    await reachConfirm(page);
    await expect(page.locator("p[data-must-show=facts]")).toHaveText(
      "Stockholm, 3 December 2026, 09:00\u201317:00, 25 people. Assumed 09:00\u201317:00 for a full day. Budget EUR 300 total.",
    );
    await expect(page.locator("span[data-lcv-fact=budget]")).toHaveText("EUR 300");
    await expect(page.locator("span[data-lcv-fact=budget-basis]")).toHaveText("total");
  }
});

const stockholmDay =
  "I need a place in Stockholm for 40 people on 12 November 2026, from 09:00 to 17:00, with dinner and a meeting room.";

test("ranks the city currency before a cheaper other currency and keeps an expired offer behind", async ({ page }) => {
  for (const viewport of sizedViewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("textbox", { name: "What are you planning?" }).fill(stockholmDay);
    await page.locator("[data-lcv-event=send]").click();
    await page.getByRole("button", { name: "Yes" }).click();
    await page.getByRole("button", { name: "Skip" }).click();
    const cards = page.locator("[data-offer-card]");
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toHaveAttribute("data-venue", "Ridge Hall");
    await expect(cards.nth(1)).toHaveAttribute("data-venue", "Harbour House");
    await expect(cards.nth(2)).toHaveAttribute("data-venue", "Canal Loft");
    await expect(cards.nth(0)).toContainText("SEK 950");
    await expect(cards.nth(1)).toContainText("EUR 365");
    await expect(cards.nth(2)).toContainText("EUR 210");
    await expect(cards.nth(0).locator("[data-lcv-chip=best-match]")).toBeVisible();
    await expect(cards.nth(1).locator("[data-lcv-chip=expired]")).toHaveCount(0);
    await expect(cards.nth(2).locator("[data-lcv-chip=expired]")).toBeVisible();
    await expect(cards.nth(2).locator("[data-lcv-chip=best-match]")).toHaveCount(0);
    if (process.env.EVIDENCE === "1") {
      await page.screenshot({
        path: `docs/evidence/cursor-rank-within-currency-97ac/results-${viewport.width}.png`,
        fullPage: false,
      });
    }
  }
});

function foldFor(label: string): string {
  if (label === "Organisation" || label === "Email") {
    return "Contact";
  }
  if (label === "Notes") {
    return "Preferences";
  }
  if (label.startsWith("Budget") || label === "Currency") {
    return "Budget";
  }
  if (label === "Guests" || label === "Rooms" || label === "Meeting rooms" || label === "Food") {
    return "People and rooms";
  }
  return "Event and dates";
}

async function openFold(drawer: Locator, name: string) {
  const toggle = drawer.getByRole("button", { name, exact: true });
  if ((await toggle.getAttribute("aria-expanded")) === "true") {
    return;
  }
  await toggle.click();
}

function headerButton(page: Page, name: string) {
  return page.locator(".planner-header").getByRole("button", { name, exact: true });
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
