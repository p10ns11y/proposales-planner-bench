# Critical path

Scenarios in `e2e/features/critical-path.feature` match tests in `e2e/critical-path.spec.ts` one to one, by title.

## Procedure

1. From `planner-bench`, install with `pnpm install --frozen-lockfile`.
2. Run `pnpm qa`.

`pnpm qa` checks the title pairing, builds with fixture mode and empty `PROPOSALES_API_KEY` and `XAI_API_KEY`, then runs the critical-path Playwright file.

The procedure passes when that command exits 0.
