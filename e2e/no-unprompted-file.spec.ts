import { expect, test, type Page, type Request } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const;

const completeBrief =
  "Title Harbour day. Organisation Northwind. Email planner@northwind.example. Start 2026-12-03. End 2026-12-04. Attendees 25. Language en. City Stockholm. Rooms 8. Meeting rooms 2. Food yes. Budget around EUR 300 total. Notes Dinner in the hall. Start time 09:00. End time 17:00.";

const folds = ["Contact", "Event and dates", "People and rooms", "Budget", "Preferences"];

test("clicks every visible control from brief to results without File and sends no filing request", async ({ page }) => {
  test.setTimeout(120_000);
  const filingRequests: string[] = [];
  let filedTurns = 0;
  page.on("request", (request) => {
    if (isFilingRequest(request)) {
      filingRequests.push(`${request.method()} ${request.url()}`);
    }
  });
  page.on("response", async (response) => {
    if (!response.url().includes("/api/turn") || response.request().method() !== "POST") {
      return;
    }
    const payload: unknown = await response.json().catch(() => null);
    const filing = readFiling(payload);
    if (filing !== null) {
      filedTurns += 1;
    }
  });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("textbox", { name: "What are you planning?" }).fill(completeBrief);
    await page.locator("[data-lcv-event=send]").click();
    if ((await page.getByRole("heading", { level: 2 }).getAttribute("data-lcv-fact")) === "budget-basis") {
      await page.locator("#composer").fill("total");
      await page.locator("[data-lcv-event=answer-basis]").click();
    }
    await page.getByRole("button", { name: "Yes" }).click();
    await expect(page.getByText("The brief is filed.")).toHaveCount(0);
    await expect(page.getByText("A draft was created in Proposales.")).toHaveCount(0);
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.locator("[data-offer-card]").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "File this brief" })).toBeEnabled();

    await page.locator(".planner-header").getByRole("button", { name: "Add details", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Add details" });
    for (const fold of folds) {
      await drawer.getByRole("button", { name: fold, exact: true }).click();
    }
    await drawer.getByLabel("Notes").fill("Dinner in the hall, updated.");
    const applied = waitForTurn(page);
    await drawer.locator("[data-lcv-event=save-more]").click();
    await applied;
    await expect(drawer).toBeHidden();

    const card = page.locator("[data-offer-card]").first();
    const venue = await card.getAttribute("data-venue");
    expect(venue).toBeTruthy();
    await card.click();
    const detail = page.getByRole("dialog", { name: venue ?? "" });
    await expect(detail).toBeVisible();
    await expect(detail.getByRole("button", { name: "File this brief" })).toBeEnabled();
    const closed = waitForTurn(page);
    await detail.getByRole("button", { name: "Close" }).click();
    await closed;

    await clickIfVisible(page, "Widen the date");
    await clickIfVisible(page, "Fewer people");
    await clickIfVisible(page, "Try again");
    await page.getByRole("button", { name: "History", exact: true }).click();
    const history = page.getByRole("dialog", { name: "History" });
    await expect(history).toBeVisible();
    await history.getByRole("button", { name: "Close" }).click();
    await expect(history).toBeHidden();
    await pressRemainingControls(page);
    await page.locator(".planner-header").getByRole("button", { name: "New chat" }).click();
    await expect(page.getByRole("textbox", { name: "What are you planning?" })).toBeVisible();
    await expect(page.getByText("The brief is filed.")).toHaveCount(0);
    await expect(page.getByText("A draft was created in Proposales.")).toHaveCount(0);
  }

  expect(filingRequests).toEqual([]);
  expect(filedTurns).toBe(0);
});

function isFilingRequest(request: Request): boolean {
  const url = request.url();
  if (url.includes("/v1/inbox/")) {
    return true;
  }
  if (request.method() === "POST" && /\/v3\/proposals\/?$/.test(new URL(url).pathname)) {
    return true;
  }
  return /\/api\/file(?:\/|$|\?)/.test(url);
}

function readFiling(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const snapshot = Reflect.get(payload, "snapshot");
  if (typeof snapshot !== "object" || snapshot === null) {
    return null;
  }
  const filing = Reflect.get(snapshot, "filing");
  return filing ?? null;
}

function waitForTurn(page: Page) {
  return page.waitForResponse(
    (response) => response.url().includes("/api/turn") && response.request().method() === "POST",
  );
}

async function clickIfVisible(page: Page, name: string) {
  const button = page.getByRole("button", { name, exact: true });
  if ((await button.count()) === 0) {
    return;
  }
  const target = button.first();
  if (!(await target.isVisible()) || !(await target.isEnabled())) {
    return;
  }
  const pending = page
    .waitForResponse(
      (response) => response.url().includes("/api/turn") && response.request().method() === "POST",
      { timeout: 1500 },
    )
    .then(
      () => true,
      () => false,
    );
  await target.click();
  await pending;
}

function leavesFilingAlone(name: string): boolean {
  return name === "" || /file/i.test(name) || name === "New chat" || name === "Start a new chat";
}

async function pressRemainingControls(page: Page) {
  const seen = new Set<string>();
  for (let round = 0; round < 16; round += 1) {
    const dialog = page.getByRole("dialog");
    const dialogOpen = (await dialog.count()) > 0 && (await dialog.first().isVisible());
    const scope = dialogOpen ? dialog.first() : page;
    const place = dialogOpen ? ((await dialog.first().getAttribute("aria-label")) ?? "dialog") : "page";
    const buttons = scope.getByRole("button");
    const count = await buttons.count();
    let pressed = false;
    for (let index = 0; index < count; index += 1) {
      const button = buttons.nth(index);
      if (!(await button.isVisible()) || !(await button.isEnabled())) {
        continue;
      }
      const name = ((await button.innerText()) || (await button.getAttribute("aria-label")) || "")
        .replace(/\s+/g, " ")
        .trim();
      const key = `${place}:${name}`;
      if (seen.has(key) || leavesFilingAlone(name)) {
        continue;
      }
      seen.add(key);
      const pending = page
        .waitForResponse(
          (response) => response.url().includes("/api/turn") && response.request().method() === "POST",
          { timeout: 1500 },
        )
        .then(
          () => true,
          () => false,
        );
      const clicked = await button.click({ timeout: 2000 }).then(
        () => true,
        () => false,
      );
      if (!clicked) {
        continue;
      }
      await pending;
      pressed = true;
      break;
    }
    if (!pressed) {
      break;
    }
  }
  const open = page.getByRole("dialog");
  if ((await open.count()) > 0 && (await open.first().isVisible())) {
    await open.first().getByRole("button", { name: "Close" }).click();
    await expect(open).toHaveCount(0);
  }
}
