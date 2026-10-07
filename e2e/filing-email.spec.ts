import { expect, test, type Locator, type Page } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const;

const fullDay =
  "Team offsite in Stockholm for 25 people on 3 Dec 2026, a full day with breakout space and vegetarian lunch. Budget around EUR 300.";

const labeledBrief =
  "City Stockholm. Attendees 25. Start 2026-12-03. End 2026-12-03. Start time 09:00. End time 17:00. Email planner@northwind.example.";

const emailAsk = "Add an email under Add details so venues reply to this address.";
const languageAsk = "Add a language under Add details.";
const whyMore = "Add details opened so venues reply to this address.";
const replyHint = "Venues reply to this address";
const transportError = "Couldn't reach Proposales. Your brief is saved.";
const filedNotice = "The brief is filed.";

test("keeps email optional while searching and requires it when File opens More", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await reachResults(page);
    await page.locator(".planner-header").getByRole("button", { name: "Add details", exact: true }).click();
    const optional = page.getByRole("dialog", { name: "Add details" });
    const optionalEmail = optional.getByLabel("Email");
    await expect(optionalEmail).not.toHaveAttribute("aria-required", "true");
    await expect(optional.getByText(replyHint)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(optional).toBeHidden();

    await page.getByRole("button", { name: "File this brief" }).click();
    const required = page.getByRole("dialog", { name: "Add details" });
    await expect(required.getByLabel("Email")).toHaveAttribute("aria-required", "true");
    await expect(required.getByText(replyHint)).toBeVisible();
    await shot(required.getByText(replyHint), "email-hint.png", viewport.width);
    await required.getByRole("button", { name: "Apply" }).click();
    await expect(required).toBeVisible();
    await expect(required.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    await page.keyboard.press("Escape");
    await expect(required).toBeHidden();

    const card = page.locator("[data-offer-card]").first();
    const venue = await card.getAttribute("data-venue");
    expect(venue).toBeTruthy();
    await card.click();
    const detail = page.getByRole("dialog", { name: venue ?? "" });
    await expect(detail).toBeVisible();
    await detail.getByRole("button", { name: "File this brief" }).click();
    await expect(page.locator(".planner-detail-sheet [role=status]")).toHaveText(whyMore);
    const drawer = page.getByRole("dialog", { name: "Add details" });
    await drawer.getByLabel("Email").fill("planner@northwind.example");
    const saved = waitForTurn(page);
    await drawer.locator("[data-lcv-event=save-more]").click();
    await saved;
    await expect(drawer).toBeHidden();
    const filed = waitForTurn(page);
    await detail.getByRole("button", { name: "File this brief" }).click();
    await filed;
    await expect(detail.getByRole("status")).toHaveText(filedNotice);
    await shot(detail.getByRole("status"), "filed-status.png", viewport.width);
  }
});

test("asks for one missing fileable field at Yes and confirms the filing in chat", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await reachConfirm(page);
    await page.getByRole("button", { name: "Yes" }).click();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(emailAsk);
    await expect(page.getByRole("status")).toHaveCount(0);
    await shot(page.getByRole("heading", { level: 2 }), "email-question.png", viewport.width);
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.locator("[data-offer-card]").first()).toBeVisible();

    await page.goto("/");
    await page.getByRole("textbox", { name: "What are you planning?" }).fill(labeledBrief);
    await page.locator("[data-lcv-event=send]").click();
    await page.getByRole("button", { name: "Yes" }).click();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(languageAsk);
    await expect(page.getByText(filedNotice)).toHaveCount(0);
    await page.locator(".planner-header").getByRole("button", { name: "Add details", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Add details" });
    await drawer.getByRole("button", { name: "Svenska" }).click();
    const saved = waitForTurn(page);
    await drawer.locator("[data-lcv-event=save-more]").click();
    await saved;
    await expect(drawer).toBeHidden();
    await page.locator("#composer").fill("file");
    const filed = waitForTurn(page);
    await page.locator("[data-lcv-event=send]").click();
    await filed;
    await expect(page.getByRole("status")).toHaveText(filedNotice);
  }
});

test("shows a transport error in the open detail and keeps File pressable", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await reachResults(page);
    const card = page.locator("[data-offer-card]").first();
    const venue = await card.getAttribute("data-venue");
    expect(venue).toBeTruthy();
    await card.click();
    const detail = page.getByRole("dialog", { name: venue ?? "" });
    await detail.getByRole("button", { name: "File this brief" }).click();
    const drawer = page.getByRole("dialog", { name: "Add details" });
    await drawer.getByLabel("Email").fill("planner@northwind.example");
    const saved = waitForTurn(page);
    await drawer.locator("[data-lcv-event=save-more]").click();
    await saved;
    await expect(drawer).toBeHidden();

    await page.route("**/api/turn", async (route) => {
      if (route.request().method() === "POST") {
        await route.abort("failed");
        return;
      }
      await route.continue();
    });
    await detail.getByRole("button", { name: "File this brief" }).click();
    await expect(detail.getByRole("status")).toHaveText(transportError);
    const retry = detail.getByRole("button", { name: "File this brief" });
    await expect(retry).toBeEnabled();
    await shot(detail.getByRole("status"), "transport-error.png", viewport.width);
    await page.unrouteAll({ behavior: "ignoreErrors" });
    const filed = waitForTurn(page);
    await retry.click();
    await filed;
    await expect(detail.getByRole("status")).toHaveText(filedNotice);
  }
});

async function shot(locator: Locator, name: string, width: number) {
  if (process.env.EVIDENCE !== "1" || width !== 390) {
    return;
  }
  await locator.screenshot({ path: `docs/evidence/filing-email-flow-317a/${name}` });
}

function waitForTurn(page: Page) {
  return page.waitForResponse(
    (response) => response.url().includes("/api/turn") && response.request().method() === "POST",
  );
}

async function reachBasisQuestion(page: Page) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "What are you planning?" }).fill(fullDay);
  await page.locator("[data-lcv-event=send]").click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveAttribute("data-lcv-fact", "budget-basis");
}

async function reachConfirm(page: Page) {
  await reachBasisQuestion(page);
  await page.locator("#composer").fill("total");
  await page.locator("[data-lcv-event=answer-basis]").click();
  await expect(page.getByRole("button", { name: "Yes" })).toBeVisible();
}

async function reachResults(page: Page) {
  await reachConfirm(page);
  await page.getByRole("button", { name: "Yes" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.locator("[data-offer-card]").first()).toBeVisible();
}
