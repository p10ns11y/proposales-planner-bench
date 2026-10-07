# Control Card — productize the planner bench

- **goal:** Turn the fixture bench into the professional shell. Free text goes in one sticky input. Clean, confirm the required facts, show structured data, then AI-UI views. Everything else sits in More, collapsed.
- **phase:** INTEGRATE. Review returned pass. The pull request is open. Do not merge unless asked. Do not reopen the product vote.
- **model_role now:** deep for this card. Next session: coding for the inner steps, review on a fresh context.
- **prior card:** [control-card.md](./control-card.md) owns S1–S6, fixtures, filing, and the contract tests. This card does not redo them.
- **product:** [planner-bench/PRODUCT.md](./planner-bench/PRODUCT.md), [planner-bench/DESIGN.md](./planner-bench/DESIGN.md), [planner-bench/TASTE.md](./planner-bench/TASTE.md), [planner-product.md](./planner-product.md).

## What this session builds

Required before a match:

- Location, cleaned to a city.
- Date and time: a start, and an end or a duration.
- Number of people.

More, collapsed, as form fields: event name, organisation, email, language, rooms, meeting rooms, food, notes, budget.

Email still gates filing. It does not gate the match. Favorites stay a mark on the ranked rows.

Flow: free text → clean → confirm → structured data → AI-UI views. Then favorites, fetch, rank, show, as already defined.

The hold in TASTE.md still comes first. Off-topic does not enter clean.

## Outer

```text
PLAN (this file) → EXECUTE → VERIFY → REVIEW_GATE → INTEGRATE → DONE
                      │ fail
                      └─ REPAIR (budgeted) → VERIFY
```

HITL stays on deploy, secrets, and push. Local commits on `agent/cursor/planner-viewport` are in scope after verify. No force-push. No merge to `main` unless asked.

## Plugins and skills

At most four loads in a phase. Load them. Do not copy them into the app.

| Phase | Loads | What they own |
|---|---|---|
| EXECUTE, domain | `trust-stack`, pstack `tdd`, `typescript-best-practices` | Fitness configs change before the view. Tests first. |
| EXECUTE, shell | `shadcn`, `modern-web-guidance`, `impeccable` (materials only) | Sticky composer, thread, collapsed More. Do not run `impeccable init`. The notes already live in `planner-bench/`. |
| VERIFY | Vercel `verification`, `layout-content-view` | Chromium on `http://localhost:3000`. Desktop and a phone. Must-show: the three facts, the composer, the More control. |
| REVIEW_GATE | pstack `interrogate`, cursor-agent in ask mode | Fresh context. Read-only. It does not rewrite. |

Also bound, not loaded as a fifth:

- `control-graph` owns this card.
- `agent-orchestrator`: one writer. No second builder on the same page.
- `odysseus-navigator`: one shell, not a new visual world. Paper and serif stay.
- `craft`: only if a fitness function is touched and the tests disagree. Not a sweep of the repo.

Cursor review model: `grok-4.7-high`. Opus 5.5 hit a Cursor usage limit on 2026-10-06. Do not use `composer-2.5` for this screen.

## Delegation

| Who | Role | May do | May not do |
|---|---|---|---|
| Next session, one coder | coding | P1 then P2 then P3, in order | A second UI, a CopilotKit shell, deploy |
| `layout-content-view` | explore | Measure overflow after the shell exists | Edit |
| cursor-agent `--mode ask --model grok-4.7-high` | review | Pass or fail against this card and PRODUCT.md | Edit, commit, push |
| Human | HITL | Push, merge, keys, deploy | — |

One implementer. The reviewer starts only after VERIFY. Review input is this card, the diff, and the verify notes. Not the transcript.

## Inner DAG

| id | step | depends_on | done_when | role |
|---|---|---|---|---|
| P1 | Split fitness. `brief:comparable` requires location, start, end or duration, and attendee count. Meeting rooms, food, and rooms move out of that gate. `brief:fileable` still requires email before a brief is sent. Add time on the brief. Keep the contract tests green without editing fixture prices or filing path strings. | — | `pnpm test` and `pnpm typecheck` pass | coding |
| P2 | Clean still fills every fact it can from free text. Confirm asks only a missing required fact, one at a time. Confirm writes the structured brief. | P1 | A Stockholm sentence with a date and 40 people reaches confirm without asking for email | coding |
| P3 | Shell from DESIGN.md. Sticky composer. Thread shows the structured brief, then the ranked rows. More is one collapsed disclosure with form fields. Detail stays an overlay. | P2 | Desktop and 390×844 walks finish with three fixture rows, More closed, no clipped composer | coding |

P1 before P2 before P3. No parallel writers.

## Success criteria

1. A sentence with a city, a date and time, and a headcount reaches ranked rows without a field grid.
2. More is closed until opened. The fields inside it edit the structured brief.
3. Filing still refuses a brief with no email. Matching does not.
4. Off-topic text holds, and does not call fetch or rank.
5. `pnpm test` and `pnpm typecheck` pass in `planner-bench/`.
6. The fresh review returns pass, or only gaps written back on this card.

## Verify commands

```bash
cd planner-bench
pnpm typecheck
pnpm test
```

Browser: `http://localhost:3000` only. `127.0.0.1` does not hydrate.

## Budgets

- max_loop_iters=8 rem=8
- max_repair_rounds=3 rem=3
- max_step_retries=2
- max_tool_calls_per_step=25
- no_progress=2 identical failures → re-PLAN or HITL

## load_diag

- actor=human, dominant=germane. One decision already made: the three required facts. Do not ask it again.
- actor=agent, dominant=extraneous if two agents edit the view. One writer.

## last progress

- 2026-10-07: P1–P3 are in. `brief:comparable` is city, start, end or duration, and headcount. Email still gates filing. One sticky composer, collapsed More, fixture rows. A usable gateway tries the model and any gateway error falls back to the scripted extractor. Desktop and 390×844 walks showed the three facts, the composer, More collapsed, and Harbour House, Canal Loft, Ridge Hall. Fresh review returned pass. Deploy stays with the owner.

## open decisions

- End or duration is included with date and time. Strike it if a single moment is enough.
- Time of day is new. Offers in the fixture have dates, not clock times. Rank may read the time. Fetch does not filter on it until the API can.
- AG-UI ([ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui)) is the wire from the flow to the thread. Spec 1.0. The producer is the existing turn. The consumer is the sticky thread. Events: one run, text for the hold or the one question, a state snapshot of the brief, and named activities for the ranked rows and for More. Static components only. No A2UI trees. No CopilotKit shell. The SDK waits until P3 renders those same elements. P1–P3 add no protocol dependency.
- Location that is not a city ("near the station") is cleaned when it names a city, and asked when it does not.

## pause reason

- none. Waiting for the next session to enter EXECUTE.

## handoff

- artifacts: this card, `planner-bench/PRODUCT.md`, `planner-bench/DESIGN.md`, `planner-bench/TASTE.md`, `planner-product.md`
- open_risks: `brief:comparable` today also requires meeting rooms and food, so P1 must change it or the new rule is only prose; filing and matching are different gates; the dev server must be opened as localhost
