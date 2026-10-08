# Evidence

Snapshot: `origin/main` at `4b99a6a`, 8 Oct 2026. Days are Europe/Stockholm. `+0200` is the local offset on these dates.

Session-span figures are the owner's estimate as supplied. They were not recomputed. Mon 5 Oct and Tue 6 Oct are labeled estimate. Wed 7 Oct and Thu 8 Oct are labeled session span, mostly agent build time with short human input. The number column is session span (estimate).

## Commands

| Figure | Command | Result |
| --- | --- | --- |
| Commits 5 Oct | `git rev-list --count origin/main --since='2026-10-05 00:00:00 +0200' --until='2026-10-06 00:00:00 +0200'` | 0 |
| Commits 6 Oct | `git rev-list --count origin/main --since='2026-10-06 00:00:00 +0200' --until='2026-10-07 00:00:00 +0200'` | 16 |
| Commits 7 Oct | `git rev-list --count origin/main --since='2026-10-07 00:00:00 +0200' --until='2026-10-08 00:00:00 +0200'` | 15 |
| Commits 8 Oct | `git rev-list --count origin/main --since='2026-10-08 00:00:00 +0200' --until='2026-10-09 00:00:00 +0200'` | 14 |
| Commits on main | `git rev-list --count origin/main` | 45 |
| Author day vs committer day | Compare `%aI` and `%cI` after conversion to Europe/Stockholm, for every commit on `origin/main` | 0 mismatches, so the `rev-list` day is the author day |
| Latest 8 Oct stamp | `git log origin/main --since='2026-10-08 00:00:00 +0200' --until='2026-10-09 00:00:00 +0200' --pretty=format:'%cI'` | latest `2026-10-08T13:05:20+02:00` |
| Pull requests merged | `gh pr list --repo p10ns11y/proposales-planner-bench --state merged --limit 100 --json number,mergedAt` then bucket `mergedAt` in Europe/Stockholm | 5 Oct 0, 6 Oct 1, 7 Oct 14, 8 Oct 14, total 29 |
| Branches with `cursor` | `gh pr list --repo p10ns11y/proposales-planner-bench --state merged --limit 100 --json headRefName`, then count names that contain `cursor` | 28 |
| Cursor trailer, 6 Oct | Count commits that day whose Co-authored-by name is `Cursor` | 6 |
| Cursor Agent trailer, 7 Oct | Count commits that day whose Co-authored-by name is `Cursor Agent` | 10 |
| Issues closed | `gh api repos/p10ns11y/proposales-planner-bench/issues?state=closed&per_page=1` | HTTP 403. Unknown |
| Issue search, closed | `gh search issues --repo p10ns11y/proposales-planner-bench --state closed --limit 20 --json number,title` | `[]`. Not used as a count |
| Issue search, open | `gh search issues --repo p10ns11y/proposales-planner-bench --state open --limit 5 --json number,title` | `[]`. Not used as a count |
| ship-by-thursday | `gh search issues --repo p10ns11y/proposales-planner-bench --state closed --limit 5 "ship-by-thursday" --json number,title` | `[]`. List API is 403, so Unknown |
| V-findings issues | `gh search issues --repo p10ns11y/proposales-planner-bench --state closed --limit 5 "V-findings" --json number,title` | `[]`. List API is 403, so Unknown |
| Vitest | `pnpm exec vitest run` | 275 passed (33 files) |
| Playwright scenarios | `pnpm exec playwright test --list` | Total: 22 tests in 3 files |
| Vitest plus Playwright | 275 + 22 | 297 |
| Production deploys | `gh api "repos/p10ns11y/proposales-planner-bench/deployments?environment=Production&per_page=1"` | HTTP 403, `deployments=read`. Unknown |
| Environment names | `gh api repos/p10ns11y/proposales-planner-bench/environments --jq '.environments[].name'` | Preview, Production. Names are not a deploy count |

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
| `docs/evidence.md` | Kept. Linked from the work log and from this file. |
| `docs/evidence/cursor-composer-mic-ffb9.md` | Kept. Listed on the work log. The shots stay in that file. |
| `docs/evidence/cursor-mic-recovery-spacing-2015.md` | Kept. Listed on the work log. |
| `docs/evidence/cursor-currency-display-b8d5.md` | Kept. Listed on the work log. |
| `docs/evidence/cursor-file-button-order-f6d8.md` | Kept. Listed on the work log. |
| `docs/evidence/cursor-more-drawer-layout-a47d.md` | Kept. Listed on the work log. |
| `docs/evidence/cursor-rank-within-currency-97ac.md` | Kept. Listed on the work log. |
| `docs/evidence/filing-email-flow-317a.md` | Kept. Listed on the work log. |
| `docs/evidence/header-composer-copy-d705.md` | Kept. Listed on the work log. |

`AGENTS.md` and `CLAUDE.md` are harness files. They were left in place.

## Reading path

`README.md` → `notes/actualization.md` → `notes/planner-product.md` → `docs/ARCHITECTURE.md` → `notes/worklog.md` → `notes/steering.md`

Each page ends with Back and Read next.
