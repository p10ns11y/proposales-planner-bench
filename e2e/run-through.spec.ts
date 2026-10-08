import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const;

const fullDay =
  "Team offsite in Stockholm for 25 people on 3 Dec 2026, a full day with breakout space and vegetarian lunch. Budget around EUR 300.";

const singleDay = "I need a place in Stockholm for 20 people on 12 November 2026, from 06:00 to 12:00.";

const endDateHint = "Add the end date in the message, as YYYY-MM-DD.";
const filedNotice = "The brief is filed.";

test("a typed file with no email shows an inline email input", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await reachResults(page);
    await page.locator("#composer").fill("file");
    const asked = waitForTurn(page);
    await page.locator("[data-lcv-event=send]").click();
    await asked;
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Skip" })).toBeVisible();
    await expect(page.getByRole("button", { name: "File this brief" })).toBeEnabled();
    await expect(page.getByText(filedNotice)).toHaveCount(0);
    await expect(page.getByText("A draft was created in Proposales.")).toHaveCount(0);
  }
});

test("a single-day brief detail shows no end-date hint", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("textbox", { name: "What are you planning?" }).fill(singleDay);
    await page.locator("[data-lcv-event=send]").click();
    await page.getByRole("button", { name: "Yes" }).click();
    await page.getByRole("button", { name: "Skip" }).click();
    const card = page.locator("[data-offer-card]").first();
    await expect(card).toBeVisible();
    const venue = await card.getAttribute("data-venue");
    expect(venue).toBeTruthy();
    await card.click();
    const detail = page.getByRole("dialog", { name: venue ?? "" });
    await expect(detail).toBeVisible();
    await expect(detail.getByText(endDateHint)).toHaveCount(0);
    await expect(detail.getByText("YYYY-MM-DD")).toHaveCount(0);
    await expect(detail.getByRole("button", { name: "File this brief" })).toBeEnabled();
  }
});

test("history names the current brief once per chat", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem("planner-bench.history");
  });
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await reachResults(page);
    await fileWithEmail(page);
    await page.locator("#composer").fill("30 people");
    const edited = waitForTurn(page);
    await page.locator("[data-lcv-event=send]").click();
    await edited;
    const again = waitForTurn(page);
    await page.getByRole("button", { name: "File this brief" }).click();
    await again;
    await expect(page.getByText(filedNotice)).toBeVisible();
    await page.getByRole("button", { name: "History", exact: true }).click();
    const list = page.locator(".planner-history-list");
    await expect(list).toHaveAttribute("data-history-count", "1");
    const item = list.locator(".planner-history-item");
    await expect(item).toHaveCount(1);
    await expect(item).not.toContainText("Untitled brief");
    await expect(item).toContainText("Stockholm");
    await expect(item).toContainText("Filed twice");
    await expect(item).toContainText(/1 venue|\d+ venues/);
    await expect(item).not.toContainText("1 venues");
    await expect(item).toContainText(/[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}, \d{2}:\d{2}/);
    await expect(item).not.toContainText(/T\d{2}:\d{2}:\d{2}/);
  }
});

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

async function reachResults(page: Page) {
  await reachBasisQuestion(page);
  await page.locator("#composer").fill("total");
  await page.locator("[data-lcv-event=answer-basis]").click();
  await page.getByRole("button", { name: "Yes" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.locator("[data-offer-card]").first()).toBeVisible();
}

async function fileWithEmail(page: Page) {
  await page.locator(".planner-header").getByRole("button", { name: "Add details", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Add details" });
  await drawer.getByLabel("Email").fill("planner@northwind.example");
  const saved = waitForTurn(page);
  await drawer.locator("[data-lcv-event=save-more]").click();
  await saved;
  await expect(drawer).toBeHidden();
  const filed = waitForTurn(page);
  await page.getByRole("button", { name: "File this brief" }).click();
  await filed;
  await expect(page.getByRole("button", { name: "Filed" })).toBeDisabled();
}
