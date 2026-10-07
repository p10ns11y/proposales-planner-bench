# Findings

Observations for the planner bench. Rows are clustered before a fix. A pointer to this file is enough; the raw log stays here.

## Rows

| What | Where | When | Evidence |
| --- | --- | --- | --- |
| CRAP and mutation scripts in craft are Python-only and stop when `coverage` or `pytest` is missing | p10ns11y/plugins `craft/bin/crap-score.py` and `craft/bin/mutation-score.py` at `31d93a0355838d8b24511966ae1ba0062c05f012` | 2026-10-07 | Both scripts import those Python modules. This bench is TypeScript, so the same thresholds need a TypeScript runner. |
| The layout probe throws unless `BRAVE_BETA_PATH` is an existing executable, and the default path is Brave Beta | p10ns11y/plugins `layout-content-view/scripts/probe-web.mjs` at the same commit | 2026-10-07 | Any Chromium executable works once the variable is set. The plugin was not edited. |
| `applyDayPartClock` cyclomatic complexity is 9 | `planner-bench/src/domain/planner-brief.ts` | 2026-10-07 | McCabe count: each `if`, loop, `catch`, ternary, `case`, `&&`, `\|\|`, and `??` adds one, starting from 1. Nested functions are separate. Agent threshold is 6. |
| `completeDayPart` cyclomatic complexity is 13 | `planner-bench/src/flow/agent-mode.ts` | 2026-10-07 | Same count. It maps a day part onto the clock with a different assumption rule than `applyDayPartClock`. |
| `projectBriefFlow` also accepts the `comparing` state before it sends any offer | `planner-bench/src/flow/brief-flow.ts` | 2026-10-07 | The actor starts in `collecting`. `comparing` is entered from `offerAdded` after `filed`. |
| A null or empty inbox token is rejected again after `filingPath`, which already returns `draft` for those values | `planner-bench/src/proposales/http-client.ts` | 2026-10-07 | `filingPath` returns `inbox` only for a non-empty token. |
| `@stryker-mutator/vitest-runner` 10.0.0 selects no Vitest 5 tests when coverage is per test | StrykerJS issue 6210, against Vitest 5.0.3 in this bench | 2026-10-07 | Vitest 5 matches the full name chain joined with ` > `. That runner joins with a space, so covered mutants are reported as survived. |
| The CRAP scorer parses every file as TypeScript, so JSX branches in a `.tsx` function are left out of the complexity count | `planner-bench/scripts/crap-score.mjs` | 2026-10-07 | `ts.createSourceFile` is called with `ScriptKind.TS`. The Filed control in `offer-detail.tsx` is scored from `file-brief-state.ts`, which has no JSX. |

## Clusters

- Plugin tools. The Python scorers and the layout probe's browser path stay findings for p10ns11y/plugins. The plugins are not vendored and not edited.
- Day-part complexity. `applyDayPartClock` and `completeDayPart` are the same theme: clock mapping above the threshold. Split them, and keep the two outcomes (leave a stored assumption, or rewrite it).
- Unreachable checks. The early `comparing` disjunct and the second inbox-token check. Fold the token check into a helper the tests can call, and project offers only from `filed`.
- Mutation runner. Do not use the Vitest runner until it speaks Vitest 5. Score with Stryker's command runner on the focused suite.
- Complexity parser. JSX needs `ScriptKind.TSX` before a `.tsx` file can be scored on its own. Until then, score the plain TypeScript module that holds the decision.
