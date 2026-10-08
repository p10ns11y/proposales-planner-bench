# Planner chat turns

Each search stays as its own card. A later message appends below it.

## Off-topic

After a Stockholm result card, "What's the weather in Paris tomorrow?" returns "Let's get back to planning the event." The offers request count stays the same. The brief is unchanged. The first card is the same object.

## Follow-up

"I need a place in Gothenburg for 12 people." appends a second card. The first card's query and rows stay. The offers client is called once more.

## Narrow

"pick only two" appends a card with the first two rows of the latest card. A second "pick only two" returns "I can't narrow that list. Tell me what to change." and adds no card. Neither turn calls the offers client.

## Filing

The filing sweep includes off-topic, follow-up, and refine. Each leaves filing null and the filings list empty. Filing still goes through `fileWithIntent`. The caller scan in `tests/file-with-intent.test.ts` passed with the unit suite.

## Browser

`e2e/result-cards.spec.ts` runs that sequence at 390×844 and 1280×800. The thread does not scroll sideways. The Playwright list in `scripts/verify.mjs` passed: 28 tests.

## Other checks

- `pnpm typecheck` passed
- `pnpm lint` passed
- `pnpm exec vitest run` passed: 37 files, 336 tests
- `pnpm exec node scripts/crap-score.mjs` — worst `briefWrittenInEnglish` at 6.00, threshold 6. `src/flow/result-cards.ts` is in that scope. Its functions are at or under 4.00 with full statement coverage.
- The mutation file list and its 0.95 line are unchanged.
