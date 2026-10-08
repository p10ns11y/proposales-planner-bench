import { describe, expect, it } from "vitest";
import { crap, functionComplexity } from "../scripts/crap-score.mjs";

describe("crap score", () => {
  it("uses complexity squared times the uncovered cube, plus complexity", () => {
    expect(crap(6, 1)).toBe(6);
    expect(crap(2, 0)).toBe(6);
    expect(crap(6, 0)).toBe(42);
  });

  it("counts branches on a function and not inside a nested function", () => {
    const rows = functionComplexity(`
      export function demo(value: number): number {
        if (value > 0 && value < 3) {
          return value ?? 0;
        }
        return value ? 1 : 2;
      }
      export function outer(): number {
        if (false) {
          return 0;
        }
        function inner(): number {
          if (true) {
            return 1;
          }
          return 0;
        }
        return inner();
      }
    `);
    expect(rows.find((row) => row.name === "demo")?.comp).toBe(5);
    expect(rows.find((row) => row.name === "outer")?.comp).toBe(2);
    expect(rows.find((row) => row.name === "outer.inner")?.comp).toBe(2);
  });
});
