# Control Card — planner bench

- **goal:** A planner bench on Vercel. A planner turns one free-text brief into a structured brief, adds the venue proposals they received, and sees one comparison grid with what is missing against the brief. It runs fully on fixtures until a real Proposales API key exists, then switches to the real API with one environment variable.
- **phase:** PLAN → EXECUTE (ready)
- **decision:** concordance proceed. Both judges say planner-bench, `p_dm` 0.42, `tau` 0.4 (caller). The pending `inbox_token` check cannot change the label.
- **model_role now:** deep (plan). Next: coding.
- **workflow:** [workflow.md](./workflow.md) maps each phase to plugins and sets the autonomous-run exit condition.

## Tech stack
| Concern | Choice | Role in the app |
|---|---|---|
| Framework | Next.js App Router on Vercel | Hosting, route handlers for the agent |
| API contract | `@adaptate/utils` (`openAPISchemaToZod`) | Zod schemas generated from `openapi.json` for `Proposal`, `Company`, `CreateRfpRequest`. Validates fixtures and live responses. |
| Model fitness | `@adaptate/core` (`transformSchema`, `makeConditionalSchemaTransformer`) | One deep-partial `PlannerBrief` schema. Each consumer has a config of required fields. Whatever fails the config is the gap list, and the agent's next question. Example of a conditional rule: rooms are required when the end date is after the start date. |
| Agent | Vercel AI SDK (`streamText` with tools, `useChat`) | Chat-first intake. Tools: `updateBrief`, `fileBrief`, `addOffer`, `compareOffers`. |
| Voice | Browser Web Speech API for input | No key needed. Speech goes into the same chat. |
| UI primitives | shadcn/ui | Chat, table, sheet, badge |
| Design | `impeccable` plugin, `layout-content-view` where applicable | **Separate session.** This build ships a plain, structurally sound shell. |
| History | `localStorage` | No database or secrets for the case |
| Tests | Vitest | Contract, fitness, normaliser, mode switch |

## Views (few, agentic)
1. **Chat** (home): talk or type the brief. The agent fills the brief and asks for whatever the fitness config says is missing.
2. **Results:** comparison grid for one brief, with gap badges per venue.
3. **History:** past briefs and their results.

## Success criteria
1. `PROPOSALES_MODE=fixture` (the default) runs the full flow with no secrets: brief in, offers in, grid out.
2. Every fixture validates against `openapi.json` component schemas (`Proposal`, `Company`, `CreateRfpRequest`).
3. Offers from Proposales are normalised **deterministically** from `blocks[].package_split.type` (`accommodation`, `food`, `meetingRoom`, `other`). The LLM is used only for free text: the brief, and proposals pasted as text.
4. With no LLM key, brief extraction falls back to a fixture extractor, so the UI never blocks.
5. Filing the brief picks a path at runtime: `inbox_token` set → `POST /v1/inbox/{token}` with `is_test`; `null` → `POST /v3/proposals` draft with the brief in `data`.
6. Switching to the real API needs only `PROPOSALES_MODE=live` and `PROPOSALES_API_KEY`. No code change.

## Verify commands
```bash
cd planner-bench
pnpm typecheck
pnpm test        # vitest: contract, normaliser, gaps, client mode switch
pnpm build
```

## Budgets
- max_loop_iters=8 rem=8
- max_repair_rounds=3 rem=3
- max_step_retries=2
- max_tool_calls_per_step=25
- no_progress=2 identical failures → re-PLAN or HITL

## load_diag
- actor=human, dominant=extraneous (signup and keys) → offloaded to the user's separate session. No asks during EXECUTE.
- actor=agent, dominant=intrinsic (data contract) → fixed by contract tests in S2 before the UI.

## Steps (Inner DAG)

| id | step | depends_on | done_when | role |
|---|---|---|---|---|
| S1 | Scaffold `planner-bench/`: Next.js App Router, TypeScript, Tailwind, Vitest, Zod, `ai` SDK. `git init`. | — | `pnpm build` passes on an empty page | coding |
| S2 | Generate Zod schemas from `openapi.json` with `@adaptate/utils`. First check that it accepts a JSON spec (its loader documents YAML). Fixtures: `companies` (token set and `null` variants), 3 venue proposals with different prices, extras, and expiry, 2 sample briefs. Contract test. | S1 | contract test passes | coding |
| S3 | Domain: deep-partial `PlannerBrief` and `VenueOffer`. Fitness configs per consumer with `@adaptate/core` (`brief:fileable`, `brief:comparable`, `offer:gridRow`). `normaliseProposal()` from `package_split`. `findGaps()` = fields that fail the fitness check. Unit tests. | S2 | tests pass | coding |
| S4 | `ProposalesClient` port with `fixture` and `http` adapters, chosen by `PROPOSALES_MODE`. Live responses are parsed with the generated schemas. `fileBrief()` picks inbox or draft from `inbox_token`. | S2 | mode-switch and path tests pass | coding |
| S5 | Agent route: AI SDK `streamText` with tools `updateBrief`, `fileBrief`, `addOffer`, `compareOffers`. The next question comes from the gap list. Scripted fixture agent when there is no model key. | S3, S4 | tests pass with no key | coding |
| S6 | UI shell with shadcn: Chat (text and Web Speech input), Results grid, History (`localStorage`). Plain styling only. | S5 | `pnpm build` passes and the flow works on fixtures | coding |
| S7 | Fresh-context review of plan and diff, plus a `layout-content-view` pass on the three views. Update `journey.md` and `worklog.md`. | S6 | pass/fail and gaps listed | review |
| D1 | **Design session (separate):** look and feel and the nature of the app with `impeccable`, shadcn theming, `layout-content-view`. | S6 | user-led | human + deep |

S3 and S4 can run in parallel after S2.

## HITL gates (later, not now)
- Vercel deploy (production).
- Adding `PROPOSALES_API_KEY` or an LLM key (secrets). The user does this in a separate session.

## last progress
- PLAN written. OpenAPI component schemas confirmed for fixtures.
- Stack, layers, code rules, and plugin mapping fixed in [workflow.md](./workflow.md).
- S1 is committed in `planner-bench/` as `14eb334`. Checks for that scaffold passed. The `braces` audit advisory is dev-only and has no patch.
- The first build owner exited during the S2 Adaptate probe. No S2 files were written. Do not redo S1. Do not start a second builder. Continue at S2.
- Lane split, 2026-10-06: the Cursor build owner keeps `src/contract/`, `src/domain/`, `src/flow/`, `src/view-models/`, `src/views/`, and `src/app/`. Grok owns `src/proposales/` and `tests/proposales-client.test.ts` (S4). Do not edit those two paths. S4 is in place: fixture and http clients, inbox when `inbox_token` is set, draft when it is null.
- `typecheck` needs `next typegen` to run first, because `LayoutProps` is a generated type.
- **Ownership:** the Grok build harness owns S2 onward. Cursor is the consultant: it answers questions and takes delegated tasks, and writes nothing in `planner-bench/` unless a task is handed to it.

## open decisions
- `pnpm audit` reports one high advisory in `braces@3.0.3`. It is reached only through `eslint-config-next`, used for linting in development. No patched version exists. Do not override it; re-run audit before deploy.

## compact context for any new agent
- Read only: this card, `workflow.md`, `.firecrawl/openapi.json`, and the doc pages in `.firecrawl/docs/` named by a step.
- Do not read: `proposales-report.md`, `review.md`, `journey.md`, or agent transcripts, unless a step needs a fact that is missing here.
- Workspace: `/home/sustainableabundance/dev/tech-cases/proposales/`. App: `planner-bench/`. Node 24, pnpm 9.
- Git root is this workspace, not `planner-bench/`. Do not run `git init` inside the app. Small steps can commit to `main`. Larger features go on a branch and a pull request.
- No secrets exist yet. Fixture mode is the default. Never ask the human during EXECUTE; log open decisions on this card.

## pause reason
- none

## handoff
- artifacts: `control-card.md`, `proposales-report.md`, `review.md`, `.firecrawl/openapi.json`
- open_risks: the free account's `inbox_token` (handled by S4's two paths); LLM provider choice (AI SDK, provider-agnostic; decided in S5); whether `@adaptate/utils` loads a JSON spec and handles every Proposales schema (checked first in S2, with the fallback of parsing JSON and passing each component schema to `openAPISchemaToZod`); Web Speech support varies by browser (text input is always available)
