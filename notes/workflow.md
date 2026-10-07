# Workflow — planner bench, built with the plugin ecosystem

The [control card](./control-card.md) owns the finished S1–S6 build. The next session is [control-card-productize.md](./control-card-productize.md): sticky input, three required facts, More collapsed, and AG-UI as the wire to the thread. This file says which plugin does what at each phase. At most four loads per phase. Plugins are loaded, not copied.

Credit: playbooks and principles from [pstack](https://github.com/cursor/plugins/tree/main/pstack) by Lauren Tan (MIT).

## Exit condition (autonomous run)

The run ends when all of these hold, with no human input:

1. `pnpm typecheck`, `pnpm test`, and `pnpm build` pass at the repository root.
2. In fixture mode, a browser run completes chat brief → filed → offers → Results grid → History entry.
3. The `layout-content-view` probe reports no clipped must-show data on Chat, Results, or History.
4. The fresh-context review returns pass, or only gaps that are logged.

The predicate is never relaxed to declare victory. A real dead end gets surfaced instead.

## Phases

| Phase | Purpose | Loads (≤4) | Output |
|---|---|---|---|
| **P0 Route** (done) | Pick the route and the product | `intelli-route`, `control-graph`, `concordance` | Card, concordance proceed |
| **P1 Invariants** | Put each rule on the earliest layer that can hold it, before any code | `trust-stack` | Invariant table (below) |
| **P2 Design** | Fix the data shapes and the brief's state machine before logic | pstack `feature` playbook, `principle-model-the-domain`, `architecture-synthesis` | Types, state machine, throughput checkpoint |
| **P3 Build** | Steps S1–S6 from the card | pstack `tdd`, `typescript-best-practices`, Vercel `ai-sdk`, `shadcn` | Code plus tests, one verified unit at a time |
| **P4 Verify** | Real commands on the right surface | pstack `prove-it-works`, Vercel `verification`, Playwright MCP, `layout-content-view` | Pass/fail per exit-condition item |
| **P5 Harden** | Only the core logic: fitness, normaliser, gaps, client mode switch | `craft` (CRAP scores, mutation testing) | Mutation score, untested branches closed |
| **P6 Review** | Fresh context, not the implementer | pstack `interrogate`, `no-comments`, `unslop` | Gaps list |
| **P7 Integrate** | Record and hand over | `show-me-your-work`, `michelin-kitchen` (`findings-first`, `shared-scripts`) | `journey.md`, `worklog.md`, card updated |
| **P8 Human** (later) | Design, keys, deploy | `impeccable`, `shadcn`, `layout-content-view`, Vercel `env-vars` and `vercel-cli` | D1 design session; secrets and deploy by you |

## P1 — invariants placed by trust-stack

| Invariant | Layer | How |
|---|---|---|
| Fixtures and live responses match the Proposales API | shape + check | Zod generated from `openapi.json` by `@adaptate/utils`; contract test |
| Offer totals and `budgetMinor` are minor units. `budget.amount` is major units | shape | A branded `MinorUnits` type. The ceiling is the major amount times 100, rounded. Formatting stays at the view edge |
| A brief is filed only when it is fileable | shape + check | `@adaptate/core` fitness config `brief:fileable`. A missing email is asked. A stored filing on the page is returned. |
| Fixture mode never makes a network call | check | Test that the fixture adapter is used when `PROPOSALES_MODE` is unset |
| No secrets in the repo or the client bundle | check + human | Keys only in server env; `.env*` gitignored; you add keys |
| Views do not import domain, Proposales, or flow | shape + check | `no-restricted-imports` in `src/views/` blocks `src/domain/`, `src/proposales/`, and `src/flow/` |
| No code comments | check | ESLint `no-warning-comments` plus a test-time scan that fails on `//` and `/*` comments in `src/` |
| Proposal viewers are never scraped | human guide | Stated in the README; only API data or text the planner pastes |

## P2 — the shape before the logic

- **Brief lifecycle (state machine, not booleans):** `collecting → fileable → filed → comparing`. The transitions are driven by fitness checks, not by flags.
- **One schema per entity, many fitness configs:** `PlannerBrief` and `VenueOffer` are deep-partial. Each consumer declares what it requires.
- **Registry over branching:** `package_split.type → offer bucket` (`accommodation → rooms`, `food → foodAndBeverage`, `meetingRoom → space`, `other → extras`).
- **Port and adapters:** one `ProposalesClient` interface with `fixture` and `http` adapters. The agent tools only see the port.

## P3 throughput checkpoint (pstack feature)

- **Blocking first steps:** S1 scaffold and S2 schemas plus fixtures. Nothing fans out before the contract test passes.
- **Independent workstreams:** S3 domain (`src/domain/`) and S4 client (`src/proposales/`) have disjoint files and run in parallel.
- **Shared mutable state:** the generated schemas in `src/contract/` are written once in S2, then read-only.
- **Smallest safe decomposition:** one owner for S5–S6, because the agent route and the chat UI share the tool contract.

## Models

Set in `~/.cursor/rules/pstack-models.mdc` (applies to new sessions).

| Work | Model | pstack roles |
|---|---|---|
| High-level decisions | `claude-opus-5-5-medium` (Opus 5.5 high is not available here) | judgment and prose, hardest tasks, how explainer, why synthesizer, reflect judgment |
| Long-running work | `grok-4.7-high-fast` | feature, refactoring, perf-issue, hillclimb, how explorer, why investigators, swarm workers |
| Documentation correctness and fixes | `composer-2.5-fast` | bug-fix, reflect tooling |
| Panels | all three, one runner each | architect runners, arena, interrogate reviewers |

Phase mapping: P2 design decisions on Opus; S1–S6 build on Grok; doc passes in P7 and repair rounds on Composer; P6 review on the three-model interrogate panel.

## Design-swappable UI

The first version must take a new design without rewrites. Data, UI, and UX flow connect through one path each way, with no shortcuts.

```text
domain (pure TS) ─► flow machine (XState) ─► view-models (selectors) ─► views (presentational)
        ▲                    │                                              │
        └── ProposalesClient ◄┘◄──────────── user events (typed) ◄──────────┘
```

| Layer | Owns | Never contains |
|---|---|---|
| `src/domain/` | Schemas, fitness configs, normaliser, gap finder | React, fetch, styling |
| `src/proposales/` | `ProposalesClient` port and its adapters | UI state |
| `src/flow/` | One XState machine for the brief lifecycle; agent tool calls become machine events | Markup, class names |
| `src/view-models/` | Pure selectors: machine state → `ChatViewModel`, `ResultsViewModel`, `HistoryViewModel` | Side effects |
| `src/views/` | Presentational components that render a view-model and emit typed events | Business rules, data fetching, layout decisions that belong to a design |
| `src/design/` | Tokens (CSS variables), shadcn theme, layout shells per view | Domain types beyond view-models |
| `src/app/` | Thin routes that wire machine → view-model → view | Logic |

Patterns that keep a redesign cheap:

- State reaches the CSS through `data-*` attributes (`data-gap="missing"`, `data-brief-stage="fileable"`), not conditional class strings. A new design restyles by attribute.
- Every color, space, and radius is a token. Components never hard-code values.
- Views take a view-model and callbacks only. A new design swaps `src/views/` and `src/design/` and keeps everything above them.
- The chat transcript and the Results grid read the same machine state, so neither depends on the other's markup.
- No global context except the machine provider. No prop-drilled styling.

## Code rules

- No workarounds. Fix the root cause (`principle-fix-root-causes`). When a library does not fit, wrap it behind a port instead of patching around it.
- No code comments. Names and types carry the intent (`no-comments`, `semantic-name`, the workspace naming rule). The only exception is a constraint the code cannot show.
- No `any`, no non-null assertions, no type casts to silence errors (`typescript-best-practices`, `principle-type-system-discipline`).

## Practices from p10ns11y/skills

| Skill | Used for |
|---|---|
| `react-client-expert` | Minimal client state, deliberate effects, XState for the brief flow, restrained Context |
| `semantic-markup-css` | Native elements, ARIA, `data-*` state attributes, tokens, contrast |
| `bdd-strategizer` | Core-first test slices: domain and contract green before flow, flow before views |
| `supply-chain-harden` | pnpm workspace hardening (`minimumReleaseAge`, `strictDepBuilds`) and `pnpm audit` at S1 |
| `semantic-name` | Names that say what the thing does in context |
| `architecture-synthesis` | The layer table above, checked again at P6 |

## Considered and skipped

| Plugin | Why not now |
|---|---|
| `eva-emptiness` | The map exists; nothing important is unknown |
| `mission-map`, `uncertainty-laws` | No replan or bet under uncertainty |
| `split-machine` | No machine-placement question |
| `pstack arena`, `swarm` | One shape is clear enough; parallel runners would cost more than they reveal |
| `git-worktrees` | One owner; no parallel checkouts |
| `odysseus-navigator` | Optional at P6 if the design looks over-clever |
| `pulse-memory`, `premflow` | `journey.md` and `worklog.md` already cover this |
| `mvu-refactor-plan` | Written for C and CMake. Its model-view-update idea is covered by the XState flow layer |
