import { expect, test, type Page } from "@playwright/test";

const failedStart = "Speech input could not start in this browser.";

test("explains that speech input is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    class BlockedRecognition {
      lang: string;
      onresult: null;
      onerror: null;
      onend: null;

      constructor() {
        this.lang = "";
        this.onresult = null;
        this.onerror = null;
        this.onend = null;
      }

      start() {
        throw new Error("blocked");
      }

      stop() {}
    }
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      writable: true,
      value: BlockedRecognition,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });
  await expectUnavailable(page, { width: 390, height: 844 });
  await expectUnavailable(page, { width: 1280, height: 800 });
});

async function expectUnavailable(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto("/");
  await expect(page.locator("[data-lcv-marker=detail]")).toHaveAttribute("data-lcv-ui-state", "detail:closed");
  await expect(page.locator("#composer")).toBeEnabled();
  const speak = page.getByRole("button", { name: "Speak" });
  await expect(speak).toBeEnabled();
  await expect(speak).toHaveAttribute("aria-pressed", "false");
  await speak.click();
  await expect(page.getByRole("button", { name: "Speak" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Listening" })).toHaveCount(0);
  const status = page.getByRole("status", { name: failedStart });
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute("data-speech-state", "unavailable");
  const box = await status.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return;
  }
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  await page.screenshot({
    path: `test-results/composer-mic-${viewport.width}x${viewport.height}.png`,
    fullPage: false,
  });
}
