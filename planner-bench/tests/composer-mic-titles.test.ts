import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

it("pairs the composer microphone scenario with one test", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const feature = readFileSync(path.join(root, "e2e/features/composer-mic.feature"), "utf8");
  const spec = readFileSync(path.join(root, "e2e/composer-mic.spec.ts"), "utf8");
  const scenarios = [...feature.matchAll(/^\s*Scenario:\s*(.+?)\s*$/gm)].map((match) => match[1] ?? "");
  const tests = [...spec.matchAll(/^test\(\s*"([^"]+)"/gm)].map((match) => match[1] ?? "");
  expect(scenarios).toEqual(tests);
  expect(scenarios.length).toBeGreaterThan(0);
});
