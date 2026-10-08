# File this brief below the ranked venues

## Before

On the results card, File this brief sat in the summary bubble, above the ranked venue list.

At 390×844, scrolling the thread to the end left the button at the top of the viewport (top −2, bottom 42) while the last venue row ended at 684. The header covered the button.

At 1280×800 the summary ended at 256, the button ran from 264 to 308, and the last venue row ended at 640.

![Phone before](cursor-file-button-order-f6d8/before-phone.png)

![Desktop before](cursor-file-button-order-f6d8/before-desktop.png)

## After

The order is the summary, the ranked venues, then File this brief. The label stays "File this brief" and the test id stays `file-brief`.

At 390×844, after scrolling to the end, the last venue row ends at 632 and the button runs from 680 to 724. It sits inside the viewport, above the composer. The thread does not scroll sideways.

At 1280×800 the summary ends at 256, the last venue row ends at 588, and the button runs from 636 to 680, inside the viewport.

![Phone after](cursor-file-button-order-f6d8/after-phone.png)

![Desktop after](cursor-file-button-order-f6d8/after-desktop.png)

## Commands

From the repository root.

- `pnpm exec vitest run tests/offer-detail.test.tsx` passed (17 tests).
- `pnpm exec playwright test e2e/critical-path.spec.ts -g "places File this brief below the ranked venues"` passed at 390×844 and 1280×800.
