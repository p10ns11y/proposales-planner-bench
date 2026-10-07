# Workflow

[control-card.md](./control-card.md) owns S1–S6. [control-card-productize.md](./control-card-productize.md) owns the shell. AG-UI is not connected. At most four plugin loads per phase. Plugins are loaded, not copied.

Credit: [pstack](https://github.com/cursor/plugins/tree/main/pstack) by Lauren Tan (MIT).

## Exit

1. `pnpm typecheck`, `pnpm test`, and `pnpm build` pass at the repository root.
2. Fixture browser run: chat brief, filed, offers, results, history.
3. `layout-content-view` reports no clipped must-show data on Chat, Results, or History.
4. Fresh review passes, or only logged gaps remain.

## Phases

| Phase | Loads | Output |
| --- | --- | --- |
| P0 Route | `intelli-route`, `control-graph`, `concordance` | Card, concordance proceed |
| P1 Invariants | `trust-stack` | Table below |
| P2 Design | pstack `feature`, `principle-model-the-domain`, `architecture-synthesis` | Types, state machine |
| P3 Build | pstack `tdd`, `typescript-best-practices`, Vercel `ai-sdk`, `shadcn` | S1–S6 |
| P4 Verify | `prove-it-works`, Vercel `verification`, Playwright, `layout-content-view` | Pass or fail per exit item |
| P5 Harden | `craft` | Fitness, normaliser, gaps, mode switch |
| P6 Review | `interrogate`, `no-comments`, `unslop` | Gaps list |
| P7 Integrate | `show-me-your-work`, `michelin-kitchen` | [journey.md](journey.md), [worklog.md](worklog.md) |
| P8 Human | `impeccable`, `shadcn`, `layout-content-view`, Vercel `env-vars` | Design, keys, deploy |

## Invariants

| Invariant | How |
| --- | --- |
| Fixtures and live responses match the API | Zod from `openapi.json` via `@adaptate/utils` |
| Totals and `budgetMinor` are minor units. `budget.amount` is major | Branded `MinorUnits`. Ceiling is the major amount times 100, rounded |
| A brief is filed only when it is fileable | `@adaptate/core` `brief:fileable`. A missing email is asked. A stored filing is returned |
| Fixture mode makes no network call | Test the fixture adapter when `PROPOSALES_MODE` is unset |
| No secrets in the repo or the client bundle | Keys in server env. `.env*` gitignored |
| Views do not import domain, Proposales, or flow | `no-restricted-imports` |
| No code comments | ESLint `no-warning-comments` plus a scan of `src/` for `//` and `/*` |
| Proposal viewers are never scraped | API data, or text the planner pastes |

## Shape

- Stages: `collecting`, `fileable`, `filed`, `comparing`. Fitness drives the transitions.
- One deep-partial schema per entity. Each consumer declares what it requires.
- `package_split.type` maps to a bucket: `accommodation` rooms, `food` foodAndBeverage, `meetingRoom` space, `other` extras.
- One `ProposalesClient` port. `fixture` and `http` adapters. Tools see the port.

S1 and S2 block everything else. S3 (`src/domain/`) and S4 (`src/proposales/`) can run in parallel. Schemas are written once in S2. One owner for S5–S6.

## Models

| Work | Model |
| --- | --- |
| Decisions | `claude-opus-5-5-medium` |
| Long build | `grok-4.7-high-fast` |
| Doc fixes | `composer-2.5-fast` |
| Panels | all three, one runner each |

P2 on Opus. S1–S6 on Grok. Doc passes on Composer. P6 on the three-model panel.

## Layers

```text
domain → flow (XState) → view-models → views
   ▲         │                         │
   └── ProposalesClient ◄── typed events
```

| Layer | Owns |
| --- | --- |
| `src/domain/` | Schemas, fitness, normaliser, gaps |
| `src/proposales/` | The client port and adapters |
| `src/flow/` | The brief machine. Tool calls become events |
| `src/view-models/` | Selectors to chat, results, and history |
| `src/views/` | Presentational components and typed events |
| `src/design/` | Tokens, shadcn theme, shells |
| `src/app/` | Routes that wire machine, view-model, and view |

State reaches CSS through `data-*` attributes. Colour, space, and radius are tokens. Views take a view-model and callbacks. Chat and results read the same machine state. No global context except the machine provider.

## Rules

No workarounds. No code comments. No `any`, no non-null assertions, no casts that silence errors.

| Skill | Used for |
| --- | --- |
| `react-client-expert` | Client state, XState, restrained context |
| `semantic-markup-css` | Native elements, ARIA, tokens |
| `bdd-strategizer` | Domain and contract before flow, flow before views |
| `supply-chain-harden` | pnpm hardening and `pnpm audit` |
| `semantic-name` | Names that say what the thing does |
| `architecture-synthesis` | The layer table, checked again at P6 |

Skipped for this build: `eva-emptiness`, `mission-map`, `uncertainty-laws`, `split-machine`, `pstack arena`, `swarm`, `git-worktrees`, `odysseus-navigator`, `pulse-memory`, `premflow`, `mvu-refactor-plan`. [journey.md](journey.md) and [worklog.md](worklog.md) already cover the memory notes.
