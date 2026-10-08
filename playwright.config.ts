import { defineConfig, devices } from "@playwright/test";

const port = 3000;
const origin = `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: origin,
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next start --hostname localhost --port ${port}`,
    url: origin,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PROPOSALES_MODE: "fixture",
      PROPOSALES_API_KEY: "",
      XAI_API_KEY: "",
    },
  },
});
