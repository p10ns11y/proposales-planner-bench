import { mkdirSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

const knownBrief =
  "Title Harbour day. Organisation Northwind. Email planner@northwind.example. Start 2026-12-03. End 2026-12-04. Attendees 25. Language en. City Stockholm. Rooms 8. Meeting rooms 2. Food yes. Budget around EUR 300 total. Notes Dinner in the hall. Start time 09:00. End time 17:00.";

const viewports = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const;

test("prefills known brief fields and keeps one section open", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("textbox", { name: "What are you planning?" }).fill(knownBrief);
    await page.locator("[data-lcv-event=send]").click();
    await expect(page.locator("[data-lcv-fact=city]")).toHaveText("Stockholm");
    await page.locator(".planner-header").getByRole("button", { name: "Add details", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Add details" });
    await expect(drawer).toBeVisible();
    await expectOneFold(drawer, "Contact");
    await expect(drawer.getByLabel("Organisation")).toHaveValue("Northwind");
    await expect(drawer.getByLabel("Email")).toHaveValue("planner@northwind.example");
    await expect(drawer.getByRole("region", { name: "Event and dates" })).toHaveCount(0);
    if (process.env.EVIDENCE === "1") {
      mkdirSync("docs/evidence/add-details-prefill-fold", { recursive: true });
      await drawer.screenshot({
        path: `docs/evidence/add-details-prefill-fold/drawer-${viewport.width}.png`,
      });
    }

    await drawer.getByRole("button", { name: "Event and dates" }).click();
    await expectOneFold(drawer, "Event and dates");
    await expect(drawer.getByRole("button", { name: "Contact" })).toHaveAttribute("aria-expanded", "false");
    await expect(drawer.getByLabel("Event name")).toHaveValue("Harbour day");
    await expect(drawer.getByLabel("City")).toHaveValue("Stockholm");
    await expect(drawer.getByLabel("Start date")).toHaveValue("2026-12-03");
    await expect(drawer.getByLabel("End date")).toHaveValue("2026-12-04");
    await expect(drawer.getByLabel("Start time")).toHaveValue("09:00");
    await expect(drawer.getByLabel("End time")).toHaveValue("17:00");
    if (process.env.EVIDENCE === "1") {
      await drawer.screenshot({
        path: `docs/evidence/add-details-prefill-fold/event-${viewport.width}.png`,
      });
    }

    await drawer.getByRole("button", { name: "People and rooms" }).click();
    await expectOneFold(drawer, "People and rooms");
    await expect(drawer.getByRole("group", { name: "Guests" }).locator(".planner-step-value")).toHaveText("25");
    await expect(drawer.getByRole("group", { name: "Rooms", exact: true }).locator(".planner-step-value")).toHaveText("8");
    await expect(drawer.getByRole("group", { name: "Meeting rooms" }).locator(".planner-step-value")).toHaveText("2");
    await expect(drawer.getByRole("switch", { name: "Food" })).toHaveAttribute("aria-checked", "true");
    await expectNoSideScroll(page, drawer);

    await drawer.getByRole("button", { name: "Budget", exact: true }).click();
    await expectOneFold(drawer, "Budget");
    await expect(drawer.getByLabel("Budget (EUR)")).toHaveValue("300");
    await expect(drawer.getByRole("button", { name: "Total" })).toHaveAttribute("aria-pressed", "true");
    await expect(drawer.getByRole("button", { name: "Per person" })).toHaveAttribute("aria-pressed", "false");
    await expect(drawer.getByLabel("Currency")).toHaveValue("EUR");
    await expectNoSideScroll(page, drawer);

    await drawer.getByRole("button", { name: "Preferences" }).click();
    await expectOneFold(drawer, "Preferences");
    await expect(drawer.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    await expect(drawer.getByRole("button", { name: "Svenska" })).toHaveAttribute("aria-pressed", "false");
    await expect(drawer.getByLabel("Notes")).toHaveValue("Dinner in the hall.");
    await expectNoSideScroll(page, drawer);

    await drawer.locator("[data-lcv-event=save-more]").click();
    await expect(drawer).toBeHidden();
    await expect(page.locator("[data-more-update]")).toHaveText("Nothing changed");
  }
});

async function expectOneFold(drawer: Locator, name: string) {
  await expect(drawer.locator('.planner-fold-toggle[aria-expanded="true"]')).toHaveCount(1);
  const toggle = drawer.getByRole("button", { name, exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const panelId = await toggle.getAttribute("aria-controls");
  const toggleId = await toggle.getAttribute("id");
  expect(panelId).toBeTruthy();
  expect(toggleId).toBeTruthy();
  if (panelId === null || toggleId === null) {
    return;
  }
  const panel = drawer.locator(`[id="${panelId}"]`);
  await expect(panel).toHaveAttribute("role", "region");
  await expect(panel).toHaveAttribute("aria-labelledby", toggleId);
  await expect(drawer.getByRole("region")).toHaveCount(1);
}

async function expectNoSideScroll(page: Page, drawer: Locator) {
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
      return node.scrollWidth <= node.clientWidth + 1 && !spilled;
    }),
  ).toBe(true);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
  ).toBe(true);
}
