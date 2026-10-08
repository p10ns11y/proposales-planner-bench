# Evidence

## Overview

Snapshot: `origin/main` at `d5f8657`, 8 Oct 2026. Days are Europe/Stockholm. `+0200` is the local offset on these dates.

Session-span figures are my estimate as supplied. They were not recomputed. Mon 5 Oct and Tue 6 Oct are labeled estimate. Wed 7 Oct and Thu 8 Oct are labeled session span, mostly agent build time with short human input. The number column is session span (estimate).

## Contents

| Section | What it is |
| --- | --- |
| [Commands](#commands) | Counts and the commands that produced them |
| [Notes removed or kept](#notes-removed-or-kept) | Where old pages went |
| [Package source](#package-source) | `@adaptate/core` and `@adaptate/utils` |
| [Reading path](#reading-path) | The six pages |

Vitest and Playwright were run on checkout `ed3de3b`, which is `d5f8657` plus the steering restore. That restore does not change tests.

## Commands

| Figure | Command | Result |
| --- | --- | --- |
| Commits 5 Oct | `git rev-list --count origin/main --since='2026-10-05 00:00:00 +0200' --until='2026-10-06 00:00:00 +0200'` | 0 |
| Commits 6 Oct | `git rev-list --count origin/main --since='2026-10-06 00:00:00 +0200' --until='2026-10-07 00:00:00 +0200'` | 16 |
| Commits 7 Oct | `git rev-list --count origin/main --since='2026-10-07 00:00:00 +0200' --until='2026-10-08 00:00:00 +0200'` | 15 |
| Commits 8 Oct | `git rev-list --count origin/main --since='2026-10-08 00:00:00 +0200' --until='2026-10-09 00:00:00 +0200'` | 26 |
| Commits on main | `git rev-list --count origin/main` | 57 |
| Author day vs committer day | Compare `%aI` and `%cI` after conversion to Europe/Stockholm, for every commit on `origin/main` | 0 mismatches, so the `rev-list` day is the author day |
| Latest 8 Oct stamp | `git log origin/main --since='2026-10-08 00:00:00 +0200' --until='2026-10-09 00:00:00 +0200' --pretty=format:'%cI'` | latest `2026-10-08T18:45:59+02:00` |
| Pull requests merged | `gh pr list --repo p10ns11y/proposales-planner-bench --state merged --limit 100 --json number,mergedAt` then bucket `mergedAt` in Europe/Stockholm | 5 Oct 0, 6 Oct 1, 7 Oct 14, 8 Oct 26, total 41 |
| Branches with `cursor` | `gh pr list --repo p10ns11y/proposales-planner-bench --state merged --limit 100 --json headRefName`, then count names that contain `cursor` | 34 of 41 |
| Cursor trailer, 6 Oct | Count commits that day whose Co-authored-by name is `Cursor` | 6 |
| Cursor Agent trailer, 7 Oct | Count commits that day whose Co-authored-by name is `Cursor Agent` | 10 |
| Issues closed | `gh issue list --repo p10ns11y/proposales-planner-bench --state closed --limit 200 --json number` | 27 |
| Issues open | `gh issue list --repo p10ns11y/proposales-planner-bench --state open --limit 200 --json number` | 11 |
| ship-by-thursday | Same closed and open lists, label `ship-by-thursday` | 19 closed, 0 open |
| Finding issues | Closed issues titled V1–V6, V8–V10, U1, or U3 | 11, all closed |
| Vitest | `pnpm exec vitest run` on `ed3de3b` | 359 passed, 37 files, 45.79 s. Start 23:56:36 Stockholm |
| Playwright scenarios | `pnpm exec playwright test --list` | Total: 31 tests in 7 files |
| Vitest plus Playwright | 359 + 31 | 390 |
| Production deploys | `gh api --paginate repos/p10ns11y/proposales-planner-bench/deployments?environment=Production&per_page=100` | 39. Newest `b4092e7` at 23:55:57 Stockholm |

`docs/FINDINGS.md` is a note in the repo. It is not treated as the V-findings issue count.

## Notes removed or kept

| File | Where the content went |
| --- | --- |
| `docs/evidence/pr17-body.md` | Deleted. The relative link `docs/evidence.md` was broken. The root-directory fact is already in `docs/ARCHITECTURE.md`. The walkthrough record is already in `docs/evidence.md`. |
| `e2e/features/planner.md` | Deleted. "One route holds the chat, the detail, and Add details" is now in `notes/planner-product.md` under Page. |
| `notes/README.md` | Deleted. The reading path is the map on the front page. The design row is now in `DESIGN.md`. Research, findings, and plans were already linked from the path. |
| `scripts/INDEX.md` | Deleted. The script table is now in `docs/ARCHITECTURE.md` under Checks. |
| `docs/FINDINGS.md` | Kept. Linked from `docs/ARCHITECTURE.md` Checks. |
| `qa/critical-path.md` | Kept. Linked from `docs/ARCHITECTURE.md` Checks. |
| `qa/composer-mic.md` | Kept. Linked from `docs/ARCHITECTURE.md` Checks. |
| `qa/filing-email.md` | Kept. Linked from `docs/ARCHITECTURE.md` Checks. |
| `docs/evidence.md` | Kept. Off the reading path. |
| `docs/evidence/cursor-composer-mic-ffb9.md` | Kept. Off the reading path. |
| `docs/evidence/cursor-mic-recovery-spacing-2015.md` | Kept. Off the reading path. |
| `docs/evidence/cursor-currency-display-b8d5.md` | Kept. Off the reading path. |
| `docs/evidence/cursor-file-button-order-f6d8.md` | Kept. Off the reading path. |
| `docs/evidence/cursor-more-drawer-layout-a47d.md` | Kept. Off the reading path. |
| `docs/evidence/cursor-rank-within-currency-97ac.md` | Kept. Off the reading path. |
| `docs/evidence/filing-email-flow-317a.md` | Kept. Off the reading path. |
| `docs/evidence/header-composer-copy-d705.md` | Kept. Off the reading path. |

Living pages describe main at `d5f8657`. Yes does not file. Only a File press or an exact file phrase does. Add details opens prefilled and folded. Counts are this snapshot. Shot notes stay off the reading path.

## Package source

| Figure | Command | Result |
| --- | --- | --- |
| `@adaptate/core` repository | `npm view @adaptate/core repository.url` | `git+https://github.com/p10ns11y/adaptate.git` |
| `@adaptate/utils` repository | `npm view @adaptate/utils repository.url` | `git+https://github.com/p10ns11y/adaptate.git` |

The pages link that repository as `https://github.com/p10ns11y/adaptate`. Imports: `@adaptate/core` in `src/domain/fitness.ts`, `@adaptate/utils/ssr` in `src/contract/proposales-schemas.ts`. The contract test is the only importer of `proposalesSchemas()`.

`AGENTS.md` and `CLAUDE.md` are harness files. They were left in place.

## Reading path

`README.md` → `notes/actualization.md` → `notes/planner-product.md` → `docs/ARCHITECTURE.md` → `notes/worklog.md` → `notes/steering.md`

Each page ends with Back and Read next.
