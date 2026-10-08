# Control Card — productize the planner bench

| | |
| --- | --- |
| Goal | One sticky input. Clean, confirm the required facts, show structured data, then the views. Everything else sits in Add details, collapsed. |
| Phase | INTEGRATE. Review returned pass. The pull request is open. Do not merge unless asked. |
| Prior | [control-card.md](./control-card.md) owns S1–S6. This card does not redo them. |
| Product | [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md), [TASTE.md](../TASTE.md), [planner-product.md](./planner-product.md). |

## What this session builds

| Before a match | |
| --- | --- |
| City | Required |
| Start | Date and time |
| End | An end time, or a duration, or an end date after the start |
| People | A count |
| Budget | When set and the scope is missing: "Is that per person or total?" |

Add details, collapsed: event name, organisation, email, language, rooms, meeting rooms, food, notes, budget.

Filing needs an email, both dates, attendees, a language, and rooms when the end date is after the start. English with no stated language stores `en`. Yes asks for a missing email. A later file on the page returns the stored filing. Matching does not need those fields. Favorites stay a mark on the ranked rows.

Flow: free text, clean, confirm, the views, then favorites, fetch, rank, show. The hold in [TASTE.md](../TASTE.md) comes first.

```text
PLAN → EXECUTE → VERIFY → REVIEW → INTEGRATE → DONE
          │ fail
          └─ REPAIR → VERIFY
```

Deploy, secrets, and push stay with a person. No force-push. No merge to `main` unless asked.

## Loads

At most four per phase. Load them. Do not copy them into the app.

| Phase | Loads | Owns |
| --- | --- | --- |
| EXECUTE, domain | `trust-stack`, pstack `tdd`, `typescript-best-practices` | Fitness before the view. Tests first. |
| EXECUTE, shell | `shadcn`, `modern-web-guidance`, `impeccable` (materials only) | Sticky composer, thread, collapsed Add details. Do not run `impeccable init`. |
| VERIFY | Vercel `verification`, `layout-content-view` | Chromium on the dev server, by name. A numeric address does not hydrate. Desktop and a phone. |
| REVIEW | pstack `interrogate`, cursor-agent in ask mode | Fresh context. Read-only. |

One writer. Review model: `grok-4.7-high`. Do not use `composer-2.5` for this screen. One coder does P1, then P2, then P3. No second UI, no CopilotKit shell, no deploy. The layout probe measures and does not edit. Review is read-only, after VERIFY, against this card and [PRODUCT.md](../PRODUCT.md). A person pushes, merges, and holds the keys.

## Steps

| id | done when |
| --- | --- |
| P1 | Comparable and fileable field sets, as above. Time stays on the brief. Contract tests, `pnpm test`, and `pnpm typecheck` pass. |
| P2 | A Stockholm sentence with a date and 40 people reaches confirm without asking for email. Confirm writes the structured brief. |
| P3 | Shell from DESIGN.md. Sticky composer. Thread shows the brief, then the ranked rows. Add details is collapsed. Detail is an overlay. Desktop and 390×844 finish with three fixture rows and Add details closed. |

P1 before P2 before P3.

## Success

1. A sentence with city, date and time, and headcount reaches ranked rows.
2. Add details stays closed until opened.
3. Filing waits for the fileable fields. English stores `en`. Yes asks for a missing email. A later file returns the stored filing.
4. Off-topic text holds, and does not call fetch or rank.
5. `pnpm test` and `pnpm typecheck` pass at the repository root.
6. Fresh review passes, or the gaps are written on this card.

```bash
pnpm typecheck
pnpm test
```

## Progress

P1–P3 are in. A bare budget asks "Is that per person or total?" before Yes. Sticky composer, collapsed Add details, rows Harbour House, Canal Loft, Ridge Hall. A missing key, a model error, or the 40 second window falls back to the scripted extractor. Turn and chat set maxDuration to 60. Desktop and 390×844 passed. Deploy stays with the owner.

## Open

- End or duration travels with date and time. Strike it if a single moment is enough.
- Time of day is on the brief. Rank does not read it. Fetch does not filter on it.
- [AG-UI](https://github.com/ag-ui-protocol/ag-ui) is not connected. The page draws the offer part. `/api/chat` can stream the same `data-offer-group` part. Spec 1.0. No A2UI. No CopilotKit.
- A location that names a city is cleaned. One that does not is asked.

Handoff: this card, [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md), [TASTE.md](../TASTE.md), [planner-product.md](./planner-product.md). Filing and matching use different field sets. The dev server must be opened by name.
