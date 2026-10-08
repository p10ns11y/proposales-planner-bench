import { expect, test, type Page } from "@playwright/test";

const failedStart = "Speech input could not start in this browser.";
const deniedStatus = "Microphone permission was denied in this browser. Press Speak to try again.";

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

test("returns the microphone after a recognition error", async ({ page }) => {
  await installDeniedRecognition(page);
  await expectRecovered(page, { width: 390, height: 844 });
  await expectRecovered(page, { width: 1280, height: 800 });
});

test("keeps a gap between the speech status and the composer", async ({ page }) => {
  await installDeniedRecognition(page);
  await expectGap(page, { width: 390, height: 844 }, true);
  await expectGap(page, { width: 1280, height: 800 }, false);
});

async function installDeniedRecognition(page: Page) {
  await page.addInitScript(() => {
    class DeniedRecognition {
      lang: string;
      onresult: ((event: unknown) => void) | null;
      onerror: ((event: unknown) => void) | null;
      onend: (() => void) | null;
      starts: number;

      constructor() {
        this.lang = "";
        this.onresult = null;
        this.onerror = null;
        this.onend = null;
        this.starts = 0;
      }

      start() {
        const seen = Reflect.get(window, "__speechStarts");
        const count = typeof seen === "number" ? seen + 1 : 1;
        Reflect.set(window, "__speechStarts", count);
        this.starts = count;
        if (count > 1) {
          return;
        }
        const fail = this.onerror;
        const finish = this.onend;
        queueMicrotask(() => {
          fail?.({ error: "not-allowed" });
          finish?.();
        });
      }

      stop() {}
    }
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      writable: true,
      value: DeniedRecognition,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    Object.defineProperty(window, "__speechStarts", {
      configurable: true,
      writable: true,
      value: 0,
    });
  });
}

async function expectRecovered(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto("/");
  const speak = page.getByRole("button", { name: "Speak" });
  await expect(speak).toBeEnabled();
  await speak.click();
  const status = page.getByRole("status", { name: deniedStatus });
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute("data-speech-state", "idle");
  const again = page.getByRole("button", { name: "Speak" });
  await expect(again).toBeEnabled();
  await expect(again).toHaveAttribute("aria-pressed", "false");
  await again.click();
  const listening = page.getByRole("button", { name: "Listening" });
  await expect(listening).toBeVisible();
  await expect(listening).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status", { name: deniedStatus })).toHaveCount(0);
}

async function expectGap(page: Page, viewport: { width: number; height: number }, twoLines: boolean) {
  await page.setViewportSize(viewport);
  await page.goto("/");
  const composer = page.locator(".planner-composer");
  const before = await composer.boundingBox();
  expect(before).not.toBeNull();
  await page.getByRole("button", { name: "Speak" }).click();
  const status = page.getByRole("status", { name: deniedStatus });
  await expect(status).toBeVisible();
  const statusBox = await status.boundingBox();
  const after = await composer.boundingBox();
  expect(statusBox).not.toBeNull();
  expect(after).not.toBeNull();
  if (before === null || statusBox === null || after === null) {
    return;
  }
  const gap = after.y - (statusBox.y + statusBox.height);
  expect(gap).toBeGreaterThanOrEqual(8);
  expect(after.x).toBeCloseTo(before.x, 0);
  expect(after.y).toBeCloseTo(before.y, 0);
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
  if (twoLines) {
    expect(statusBox.height).toBeGreaterThan(18);
  }
  await page.screenshot({
    path: `test-results/composer-mic-gap-${viewport.width}x${viewport.height}.png`,
    fullPage: false,
  });
}

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
