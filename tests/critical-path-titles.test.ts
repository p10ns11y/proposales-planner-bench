import path from "node:path";
import { expect, it } from "vitest";
import { criticalPathTitles } from "../scripts/qa-critical-path.mjs";

it("pairs each critical path scenario with one test", () => {
  const paired = criticalPathTitles(path.resolve(import.meta.dirname, ".."));
  expect(paired.scenarios).toEqual(paired.tests);
  expect(paired.ok).toBe(true);
});
