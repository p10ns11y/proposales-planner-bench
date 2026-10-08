# Planner chat turns

Each search stays as its own card. A later message appends below it.

## Off-topic

After a Stockholm result card, each of these replies "Let's get back to planning the event." The offers request count stays the same. The brief is unchanged. The first card is the same object.

- What's the weather in Paris tomorrow?
- hi
- hello
- thanks
- ok
- okay
- yes

On the recap, typed Yes and the Yes button still move on to favourites.

## A word that fills a field

"Gothenburg" sets the city and appends a card. The new summary names Gothenburg. "60" sets the guest count and appends a card whose summary includes 60. Fixture venue rows have no city, so the venue names stay the same set. The summary is what changes.

## Brief changes

Drawer Apply from 40 to 45 guests appends a card. The earlier card still shows 40 guests. Apply with the same guest count leaves that card and sends no offers request. Inline Save in results appends a card. A favourite ranking that changes appends a card. An unchanged ranking keeps the same card. Show more expands the latest card in place, including after hi. The control label is Further matches.

## Narrow

"pick only two", "pick two", "only two", and "just the top two" append a card with the first two rows. A second request returns "I can't narrow that list. Tell me what to change." and adds no card. Neither turn calls the offers client.

## Filing

The filing sweep includes the weather follow-up, refine, hi, hello, thanks, and ok, okay, and yes in results. Each leaves filing null and the filings list empty. File, then hi or "pick only two", clears the press. A later Save files nothing. Filing still goes through `fileWithIntent`. The caller scan in `tests/file-with-intent.test.ts` passed with the unit suite.

## Browser

`e2e/result-cards.spec.ts` runs the weather sequence, hi, hello, thanks, ok, okay, yes, Apply from 40 to 45 after hi, and Further matches after hi, at 390×844 and 1280×800. The thread does not scroll sideways. The Playwright list in `scripts/verify.mjs` passed: 31 tests.

## Other checks

- `pnpm typecheck` passed
- `pnpm lint` passed
- `pnpm exec vitest run` passed: 37 files, 359 tests
- `pnpm exec node scripts/crap-score.mjs` — worst `briefWrittenInEnglish` at 6.00, threshold 6. `src/flow/result-cards.ts` is in that scope. `rememberRank` is 5.00.
- The mutation file list and its 0.95 line are unchanged.
