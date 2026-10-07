# Scripts

| Path | Purpose | Example |
| --- | --- | --- |
| `scripts/qa-critical-path.mjs` | Pair critical-path scenario titles with tests, build, and run that Playwright file | `pnpm qa` |
| `scripts/crap-score.mjs` | CRAP from cyclomatic complexity and Vitest statement coverage. Threshold 6 | `pnpm crap` |
| `scripts/mutation-score.mjs` | StrykerJS mutation score for the scoped files. Threshold 0.95 | `pnpm mutation` |
| `scripts/verify.mjs` | One JSON object for unit, contract, e2e, layout probe, CRAP, and mutation | `pnpm verify` |

`pnpm verify --skip-mutation` leaves mutation for a separate run. None of these commands calls a model.
