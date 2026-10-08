# Evidence

Counts are word counts (`wc -w`) after the rebase onto `0086209`, before this prose pass. The same counts are on `HEAD` for these files. The pass then cut every doc except the README rebuild and the files marked kept.

A file is inside the band when the later count is between 40% and 60% of the earlier count, inclusive.

## Before and after

| Before | After | Share | File |
| ---: | ---: | ---: | --- |
| 3930 | 2148 | 54.7% | notes/design-refs/REFERENCE-PACK.md |
| 3414 | 1366 | 40.0% | notes/proposales-report.md |
| 2510 | 1567 | 62.4% | docs/ARCHITECTURE.md |
| 1518 | 917 | 60.4% | DESIGN.md |
| 1437 | 725 | 50.5% | notes/workflow.md |
| 1419 | 809 | 57.0% | PRODUCT.md |
| 1391 | 832 | 59.8% | notes/control-card.md |
| 1297 | 781 | 60.2% | notes/control-card-productize.md |
| 988 | 592 | 59.9% | notes/ontology.md |
| 966 | 540 | 55.9% | notes/planner-product.md |
| 845 | 113 | rebuilt | README.md |
| 832 | 492 | 59.1% | notes/ux-findings.md |
| 729 | 292 | 40.1% | notes/journey.md |
| 681 | 316 | 46.4% | notes/review.md |
| 559 | 332 | 59.4% | docs/FINDINGS.md |
| 425 | 256 | 60.2% | TASTE.md |
| 253 | 150 | 59.3% | notes/worklog.md |
| 240 | 97 | 40.4% | notes/README.md |
| 115 | 69 | 60.0% | notes/tech-case.md |
| 103 | 61 | 59.2% | scripts/INDEX.md |
| 95 | 95 | kept | AGENTS.md |
| 58 | 33 | 56.9% | qa/critical-path.md |
| 20 | 21 | kept | e2e/features/planner.md |
| 1 | 1 | kept | CLAUDE.md |
| 23826 | 12605 |  | Total, 24 files |

`e2e/features/critical-path.feature` is 1105 words after main added scenarios. `qa/composer-mic.md` is 91 words and `qa/filing-email.md` is 113. Those three arrived with `db1324d`.

The README is a new front page, so the 40–60% band does not apply. It has 113 words in all, and 78 words outside fenced blocks. A few rows sit a little over 60% after the drawer, currency, and filing sentences from main.

## Walkthrough

Recorded on production at https://proposales-planner-bench.vercel.app after `182b6f4`. The brief is made up: Harbour day, Northwind, 25 people, Stockholm, 3 December 2026, 09:00–17:00. The clip opens on the email card, then the ranked venues, one History row named Harbour day, then Add details with Contact open and Event and dates filled. File was not pressed. The brief stays unfiled. The filed still is fixture mode, not this production capture.

The capture is the page in Chromium.

| File | What |
| --- | --- |
| docs/media/walkthrough.mp4 | 14.57 s, 449118 bytes, 1280×800, H.264, 30 fps, no audio |
| docs/media/walkthrough.gif | 14.60 s, 1913437 bytes, 720×450, 146 frames |
| docs/media/hero-desktop.png | 1280×736, 42413 bytes, cropped below the floating header |
| docs/media/hero-phone.png | 390×844, 47269 bytes |
| docs/media/poster.png | 1280×800, 60476 bytes, still of Add details |
| docs/media/actualization-brief.png | 1280×800, 40001 bytes, production brief card |
| docs/media/actualization-filed.png | 1280×800, 62182 bytes, fixture mode, File pressed only there |

The README embed is the GIF, linked to the mp4:

```markdown
[![Walkthrough: ranked venues for a Stockholm offsite](media/walkthrough.gif)](media/walkthrough.mp4)
```

## Privacy

Docs and the new media were checked before and after the cut.

- Markdown has no email address, no home path, no loopback address, no machine name, and no secret.
- `AI` remains only inside proper names: Vercel AI SDK, xAI, `@ai-sdk/xai`, and `AI_GATEWAY_API_KEY`.
- Production frames show the made-up Stockholm brief, an empty Email field, and no address bar, account name, or key. The filed still is fixture mode.
- Tests and the verify script still contain fictional example addresses and a loopback bind. The merge kept those in the application.

## Links

Lychee 0.18.1 on the project Markdown (`README.md`, `PRODUCT.md`, `DESIGN.md`, `TASTE.md`, `AGENTS.md`, `CLAUDE.md`, `docs/`, `notes/`, `qa/`, `scripts/`, `e2e/`, `.github/`).

Online: 108 links, 105 ok, 0 errors, 3 excluded. The excluded links are the npm pages for `@adaptate/core`, `@adaptate/utils`, and `@ai-sdk/xai`. This network gets HTTP 403 from `npmjs.com`. The registry answers 200 for the same packages (`@adaptate/core` 2.2.2, `@adaptate/utils` 2.2.2, `@ai-sdk/xai` 5.0.18).

Offline, file and fragment links: 92 ok, 0 errors.

