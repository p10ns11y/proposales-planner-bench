# Evidence

Counts are word counts (`wc -w`) after the rebase onto `0086209`, before this prose pass. The same counts are on `HEAD` for these files. The pass then cut every doc except the README rebuild and the files marked kept.

A file is inside the band when the later count is between 40% and 60% of the earlier count, inclusive.

## Before and after

| Before | After | Share | File |
| ---: | ---: | ---: | --- |
| 3930 | 2140 | 54.5% | notes/design-refs/REFERENCE-PACK.md |
| 3414 | 1366 | 40.0% | notes/proposales-report.md |
| 2510 | 1505 | 60.0% | docs/ARCHITECTURE.md |
| 1518 | 908 | 59.8% | DESIGN.md |
| 1437 | 725 | 50.5% | notes/workflow.md |
| 1419 | 782 | 55.1% | PRODUCT.md |
| 1391 | 832 | 59.8% | notes/control-card.md |
| 1297 | 774 | 59.7% | notes/control-card-productize.md |
| 988 | 592 | 59.9% | notes/ontology.md |
| 966 | 539 | 55.8% | notes/planner-product.md |
| 845 | 139 | rebuilt | README.md |
| 832 | 492 | 59.1% | notes/ux-findings.md |
| 729 | 292 | 40.1% | notes/journey.md |
| 681 | 316 | 46.4% | notes/review.md |
| 559 | 332 | 59.4% | docs/FINDINGS.md |
| 425 | 255 | 60.0% | TASTE.md |
| 253 | 150 | 59.3% | notes/worklog.md |
| 240 | 96 | 40.0% | notes/README.md |
| 115 | 69 | 60.0% | notes/tech-case.md |
| 103 | 61 | 59.2% | scripts/INDEX.md |
| 95 | 95 | kept | AGENTS.md |
| 58 | 33 | 56.9% | qa/critical-path.md |
| 20 | 20 | kept | e2e/features/planner.md |
| 1 | 1 | kept | CLAUDE.md |
| 23826 | 12514 |  | Total, 24 files |

`e2e/features/critical-path.feature` stays at 645 words. It is the Gherkin spec, so this pass did not cut it.

The README is a new front page, so the 40–60% band does not apply. It has 139 words in all, and 104 words outside fenced blocks.

## Walkthrough

Recorded on production at https://proposales-planner-bench.vercel.app. The brief is made up: a team offsite for 25 people in Stockholm on 3 December, half day, meeting room and lunch. The clip shows the empty composer, the brief, Yes, Skip, three result cards, the More drawer, the Canal Loft detail, and File with no email, which opens More with Email focused and empty. No draft is filed.

The computer-use tool was blocked by a model quota, so the capture is headed Chrome driven by Playwright, then cropped to the page.

| File | What |
| --- | --- |
| docs/media/walkthrough.mp4 | 31.8 s, 416968 bytes, 1244×772, H.264, 30 fps, no audio |
| docs/media/walkthrough.gif | 31.76 s, 1000504 bytes, 720×447, 254 frames |
| docs/media/hero-desktop.png | 1280×800, 66343 bytes |
| docs/media/hero-phone.png | 390×844, 44873 bytes |
| docs/media/poster.png | 1244×772, 122443 bytes, still of the results |

The README embed is the GIF, linked to the mp4:

```markdown
[![Walkthrough of the live bench: a Stockholm offsite, three venues, then File asks for an email](docs/media/walkthrough.gif)](docs/media/walkthrough.mp4)
```

## Privacy

Docs and the new media were checked before and after the cut.

- Markdown has no email address, no home path, no loopback address, no machine name, and no secret.
- `AI` remains only inside proper names: Vercel AI SDK, xAI, `@ai-sdk/xai`, and `AI_GATEWAY_API_KEY`.
- Frames of the walkthrough and both hero shots show the made-up Stockholm offsite, an empty Email field, and no address bar, account name, or key.
- Tests and the verify script still contain fictional example addresses and a loopback bind. This pass did not edit application code.

## Links

Lychee 0.18.1 on the project Markdown (`README.md`, `PRODUCT.md`, `DESIGN.md`, `TASTE.md`, `AGENTS.md`, `CLAUDE.md`, `docs/`, `notes/`, `qa/`, `scripts/`, `e2e/`, `.github/`).

Online: 108 links, 105 ok, 0 errors, 3 excluded. The excluded links are the npm pages for `@adaptate/core`, `@adaptate/utils`, and `@ai-sdk/xai`. This network gets HTTP 403 from `npmjs.com`. The registry answers 200 for the same packages (`@adaptate/core` 2.2.2, `@adaptate/utils` 2.2.2, `@ai-sdk/xai` 5.0.18).

Offline, file and fragment links: 92 ok, 0 errors.

