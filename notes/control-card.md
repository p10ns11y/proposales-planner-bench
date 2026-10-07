# Control Card — planner bench

Next: [control-card-productize.md](./control-card-productize.md). S1–S6. [workflow.md](./workflow.md). [ontology.md](./ontology.md).

| | |
| --- | --- |
| Goal | One free-text brief becomes a structured brief, then a comparison grid. Fixtures until a Proposales key exists. |
| Phase | EXECUTE. S6 done. S7 and D1 not started. |
| Decision | Concordance proceed. Both judges say planner-bench, `p_dm` 0.42, `tau` 0.4. The pending `inbox_token` check cannot change the label. |
| Role | Coding through S6. Next: S7. |

## Tech stack

| Concern | Choice | Role |
| --- | --- | --- |
| Framework | Next.js App Router on Vercel | Hosting and route handlers |
| API contract | `@adaptate/utils` (`openAPISchemaToZod`) | Zod from `src/contract/openapi.json` for contract tests. Runtime uses the tolerant readers in `http-client.ts`. |
| Fitness | `@adaptate/core` (`makeConditionalSchemaTransformer`) | One deep-partial `PlannerBrief`. Each consumer lists required fields. Failures are the gap list and the next question. Rooms are required when the end date is after the start. |
| Agent | Vercel AI SDK (`streamText` with tools) | The page posts to `/api/turn`. `/api/chat` streams `updateBrief`, `fileBrief`, `addOffer`, and `compareOffers`. The page does not call `useChat`. |
| Voice | Browser Web Speech API | Speech enters the same chat. |
| UI | shadcn/ui | Chat, table, sheet, badge |
| Design | `impeccable`, `layout-content-view` | A separate session. This build ships a plain shell. |
| History | `localStorage` | No database |
| Tests | Vitest | Contract, fitness, normaliser, mode switch |

## Success

1. `PROPOSALES_MODE=fixture` runs brief, offers, and grid with no secrets.
2. Every fixture validates against `Proposal`, `Company`, and `CreateRfpRequest`.
3. Offers are normalised from `blocks[].package_split.type` (`accommodation`, `food`, `meetingRoom`, `other`). The model reads free text only.
4. With no model key, extraction uses the scripted extractor. A model attempt waits 40 seconds. Turn and chat set maxDuration to 60.
5. `inbox_token` set posts `POST /v1/inbox/{token}` with `is_test`. Null posts a `POST /v3/proposals` draft with the brief in `data`. English with no stated language is `en`. Yes asks when the email is missing. A later file on the page returns the stored filing.
6. Live mode needs `PROPOSALES_MODE=live` and `PROPOSALES_API_KEY`.

## Verify

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Steps

| id | step | depends_on | done when |
| --- | --- | --- | --- |
| S1 | Scaffold at the repository root: Next.js, TypeScript, Tailwind, Vitest, Zod, `ai`. | — | `pnpm build` on an empty page |
| S2 | Zod from `openapi.json` via `@adaptate/utils`. Check the JSON loader. Fixtures: companies with token and null, 3 proposals, 2 briefs. | S1 | contract test passes |
| S3 | `PlannerBrief`, `VenueOffer`, `brief:fileable`, `brief:comparable`, `offerGridRowConfig`, `normaliseProposal()`, `findGaps()`. | S2 | tests pass |
| S4 | `ProposalesClient` fixture and http, chosen by `PROPOSALES_MODE`. Tolerant readers. `fileBrief()` picks inbox or draft from `inbox_token`. | S2 | mode and path tests pass |
| S5 | `streamText` tools `updateBrief`, `fileBrief`, `addOffer`, `compareOffers`. Next question from the gap list. Scripted agent when there is no model key. | S3, S4 | tests pass with no key |
| S6 | shadcn shell: chat, speech, results, history. | S5 | `pnpm build`, fixture flow works |
| S7 | Fresh review and a `layout-content-view` pass. Update [journey.md](journey.md) and [worklog.md](worklog.md). | S6 | pass or gaps listed |
| D1 | Look and feel, separate, with `impeccable`. | S6 | user-led |

S3 and S4 can run in parallel after S2.

## Later, not this card

Deploy, and adding `PROPOSALES_API_KEY` or `XAI_API_KEY`, stay with the owner.

## Progress

- S1–S6 are on `main`. `pnpm typecheck`, `pnpm test`, and `pnpm build` pass at the repository root.
- Fixture Chromium on the dev server, port 3456: typed brief, inbox filing, Harbour House, Ridge Hall, Canal Loft, history entry. Quiet Court filed a draft.
- S7 and the design session were left alone.
- `typecheck` needs `next typegen` first, because `LayoutProps` is generated.

## Open

- `getDereferencedOpenAPIDocument` loads `src/contract/openapi.json`. js-yaml accepts the JSON. A company with `tax_mode: "nope"` fails, so `$ref` resolution is in effect. Generated schemas check fixtures. Live responses use the tolerant readers.
- `openAPISchemaToZod` drops `additionalProperties`. The draft post sends `draftBody`: the inbox fields plus `planner_bench_brief`. It does not forward a stored `Proposal.data` object.
- Totals use `value_without_tax` when present, otherwise `value_with_tax`, times block `quantity` (default 1).
- No `XAI_API_KEY` keeps the scripted extractor. A set key calls xAI through `@ai-sdk/xai`. The model id is `grok-4.7` unless `PLANNER_MODEL` is set. There is no `AI_GATEWAY_API_KEY`.
- Contract tests load the spec. API routes leave the file unread.
- `pnpm audit`: high advisory in `braces@3.0.3`, reached only through `eslint-config-next`. No patched version. Do not override it.
- Web Speech depends on the browser. Typed input is always available.

## Handoff

Read this card, [workflow.md](./workflow.md), and `src/contract/openapi.json`. Node 22, pnpm 9, repository root. Do not run `git init`. Fixture mode is the default. Pause: none.
