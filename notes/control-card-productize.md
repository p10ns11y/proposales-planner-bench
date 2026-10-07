# Control Card — productize the planner bench

- **goal:** Turn the fixture bench into the professional shell. Free text goes in one sticky input. Clean, confirm the required facts, show structured data, then the views. Everything else sits in More, collapsed.
- **phase:** INTEGRATE. Review returned pass. The pull request is open. Do not merge unless asked. Do not reopen the product vote.
- **model_role now:** deep for this card. Next session: coding for the inner steps, review on a fresh context.
- **prior card:** [control-card.md](./control-card.md) owns S1–S6, fixtures, filing, and the contract tests. This card does not redo them.
- **product:** [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md), [TASTE.md](../TASTE.md), [planner-product.md](./planner-product.md).

## What this session builds

Required before a match:

- City.
- Start date, start time, and an end time. The end time can be absent when a duration is set, or when the end date is after the start date.
- Number of people.
- A budget basis, when a budget is set and the scope is missing. The question is "Is that per person or total?"

More, collapsed, as form fields: event name, organisation, email, language, rooms, meeting rooms, food, notes, budget.

Filing needs an email, both dates, an attendee count, a language, and rooms when the end date is after the start. An English brief with no stated language is stored as `en`. Yes asks for a missing email. A later file on the page returns the stored filing. Matching does not need those fields. Favorites stay a mark on the ranked rows.

Flow: free text → clean → confirm → structured data → the views. Then favorites, fetch, rank, show, as already defined.

The hold in TASTE.md still comes first. Off-topic does not enter clean.

## Outer

```text
PLAN (this file) → EXECUTE → VERIFY → REVIEW → INTEGRATE → DONE
                      │ fail
                      └─ REPAIR (budgeted) → VERIFY
```

HITL stays on deploy, secrets, and push. Local commits on `agent/cursor/planner-viewport` are in scope after verify. No force-push. No merge to `main` unless asked.

## Plugins and skills

At most four loads in a phase. Load them. Do not copy them into the app.

| Phase | Loads | What they own |
|---|---|---|
| EXECUTE, domain | `trust-stack`, pstack `tdd`, `typescript-best-practices` | Fitness configs change before the view. Tests first. |
| EXECUTE, shell | `shadcn`, `modern-web-guidance`, `impeccable` (materials only) | Sticky composer, thread, collapsed More. Do not run `impeccable init`. The notes already live in this repository. |
| VERIFY | Vercel `verification`, `layout-content-view` | Chromium on `http://localhost:3000`. Desktop and a phone. Must-show: the three facts, the composer, the More control. |
| REVIEW | pstack `interrogate`, cursor-agent in ask mode | Fresh context. Read-only. It does not rewrite. |

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
| P1 | Split fitness. `brief:comparable` requires a city, a start date, a start time, an attendee count, and an end time unless a duration is set or the end date is after the start. `brief:fileable` requires an email, both dates, an attendee count, a language, and rooms when the end date is after the start. Add time on the brief. Keep the contract tests green without editing fixture prices or filing path strings. | — | `pnpm test` and `pnpm typecheck` pass | coding |
| P2 | Clean still fills every fact it can from free text. Confirm asks only a missing required fact, one at a time. Confirm writes the structured brief. | P1 | A Stockholm sentence with a date and 40 people reaches confirm without asking for email | coding |
| P3 | Shell from DESIGN.md. Sticky composer. Thread shows the structured brief, then the ranked rows. More is one collapsed disclosure with form fields. Detail stays an overlay. | P2 | Desktop and 390×844 walks finish with three fixture rows, More closed, no clipped composer | coding |

P1 before P2 before P3. No parallel writers.

## Success criteria

1. A sentence with a city, a date and time, and a headcount reaches ranked rows without a field grid.
2. More is closed until opened. The fields inside it edit the structured brief.
3. Filing waits until the fileable fields are set. An English brief stores language `en`. Yes asks for a missing email. A later file on the page returns the stored filing. Matching does not require the fileable fields.
4. Off-topic text holds, and does not call fetch or rank.
5. `pnpm test` and `pnpm typecheck` pass at the repository root.
6. The fresh review returns pass, or only gaps written back on this card.

## Verify commands

```bash
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

- 2026-10-07: P1–P3 are in. `brief:comparable` is a city, a start date, a start time, an attendee count, and an end time unless a duration is set or the end date is after the start. A bare budget asks "Is that per person or total?" before Yes. Filing uses the fileable fields. One sticky composer, collapsed More, fixture rows. A model attempt falls back to the scripted extractor on a missing key, an error, or the 40 second window. Desktop and 390×844 walks showed the facts, the composer, More collapsed, and Harbour House, Canal Loft, Ridge Hall. Fresh review returned pass. Deploy stays with the owner.
- 2026-10-07: The model window is 40 seconds. The turn and chat routes set maxDuration to 60. A missing key, a model error, or that window falls back to the scripted extractor.

## open decisions

- End or duration is included with date and time. Strike it if a single moment is enough.
- Time of day is on the brief. Rank does not read it. Fetch does not filter on it.
- AG-UI ([ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui)) is not connected. The page renders the offer part in React. `/api/chat` can stream the same `data-offer-group` part. Spec 1.0 is the protocol note. No A2UI trees. No CopilotKit shell. P1–P3 add no protocol dependency.
- Location that is not a city ("near the station") is cleaned when it names a city, and asked when it does not.

## pause reason

- none. P1–P3 are in.

## handoff

- artifacts: this card, [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md), [TASTE.md](../TASTE.md), [planner-product.md](./planner-product.md)
- open_risks: filing and matching use different field sets; the dev server must be opened as localhost
