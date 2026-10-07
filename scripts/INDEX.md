# Scripts

| Path | Does |
| --- | --- |
| `qa-critical-path.mjs` | Pair titles, build, run critical-path Playwright. `pnpm qa` |
| `crap-score.mjs` | CRAP. Threshold 6. `pnpm crap` |
| `mutation-score.mjs` | StrykerJS. Threshold 0.95. `pnpm mutation` |
| `verify.mjs` | Unit, contract, build, e2e, probe, CRAP, mutation. `pnpm verify` |

`--skip-mutation` defers mutation. No model calls.
