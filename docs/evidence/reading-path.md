# Evidence

Snapshot: `origin/main` at `182b6f4`, 8 Oct 2026. Days are Europe/Stockholm. `+0200` is the local offset on these dates.

Session-span figures are the owner's estimate as supplied. They were not recomputed. Mon 5 Oct and Tue 6 Oct are labeled estimate. Wed 7 Oct and Thu 8 Oct are labeled session span, mostly agent build time with short human input. The number column is session span (estimate).

## Commands

| Figure | Command | Result |
| --- | --- | --- |
| Commits 5 Oct | `git rev-list --count origin/main --since='2026-10-05 00:00:00 +0200' --until='2026-10-06 00:00:00 +0200'` | 0 |
| Commits 6 Oct | `git rev-list --count origin/main --since='2026-10-06 00:00:00 +0200' --until='2026-10-07 00:00:00 +0200'` | 16 |
| Commits 7 Oct | `git rev-list --count origin/main --since='2026-10-07 00:00:00 +0200' --until='2026-10-08 00:00:00 +0200'` | 15 |
| Commits 8 Oct | `git rev-list --count origin/main --since='2026-10-08 00:00:00 +0200' --until='2026-10-09 00:00:00 +0200'` | 20 |
| Commits on main | `git rev-list --count origin/main` | 51 |
| Author day vs committer day | Compare `%aI` and `%cI` after conversion to Europe/Stockholm, for every commit on `origin/main` | 0 mismatches, so the `rev-list` day is the author day |
| Latest 8 Oct stamp | `git log origin/main --since='2026-10-08 00:00:00 +0200' --until='2026-10-09 00:00:00 +0200' --pretty=format:'%cI'` | latest `2026-10-08T18:45:59+02:00` |
| Pull requests merged | `gh pr list --repo p10ns11y/proposales-planner-bench --state merged --limit 100 --json number,mergedAt` then bucket `mergedAt` in Europe/Stockholm | 5 Oct 0, 6 Oct 1, 7 Oct 14, 8 Oct 20, total 35 |
| Branches with `cursor` | `gh pr list --repo p10ns11y/proposales-planner-bench --state merged --limit 100 --json headRefName`, then count names that contain `cursor` | 31 of 35 |
| Cursor trailer, 6 Oct | Count commits that day whose Co-authored-by name is `Cursor` | 6 |
| Cursor Agent trailer, 7 Oct | Count commits that day whose Co-authored-by name is `Cursor Agent` | 10 |
| Issues closed | `gh issue list --repo p10ns11y/proposales-planner-bench --state closed --limit 200 --json number` | 27 |
| Issues open | `gh issue list --repo p10ns11y/proposales-planner-bench --state open --limit 200 --json number` | 11 |
| ship-by-thursday | Same closed and open lists, label `ship-by-thursday` | 19 closed, 0 open |
| Finding issues | Closed issues titled V1–V6, V8–V10, U1, or U3 | 11, all closed |
| Vitest | `pnpm exec vitest run` on `182b6f4` | 329 passed, 36 files, 40.89 s. Start 20:07:25 Stockholm |
| Playwright scenarios | `pnpm exec playwright test --list` | Total: 27 tests in 6 files |
| Vitest plus Playwright | 329 + 27 | 356 |
| Production deploys | `gh api repos/p10ns11y/proposales-planner-bench/deployments?environment=Production` | 32, all successful. Newest `182b6f4` at 18:46:32 Stockholm. The first page is 30 and links a next page of 2. |
| Rollbacks | Production was rolled back to `4b99a6a` at 16:35 Stockholm on 8 Oct | 1 |

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

Living pages describe main at `182b6f4`. Yes does not file. Only a File press or an exact file phrase does. Add details opens prefilled and folded. Counts are this snapshot. Shot notes stay off the reading path.

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
