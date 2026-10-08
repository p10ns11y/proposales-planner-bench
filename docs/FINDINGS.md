# Findings

| What | Where | Evidence |
| --- | --- | --- |
| Craft CRAP and mutation scripts are Python-only and stop without `coverage` or `pytest` | plugins `craft/bin/crap-score.py`, `mutation-score.py` at `31d93a0` | This bench is TypeScript, so the thresholds need a TypeScript runner |
| The layout probe throws unless `BRAVE_BETA_PATH` is an executable. The default is Brave Beta | plugins `layout-content-view/scripts/probe-web.mjs`, same commit | Any Chromium works once the variable is set. The plugin was not edited |
| `applyDayPartClock` complexity is 9 | `src/domain/planner-brief.ts` | McCabe from 1, plus each branch. Agent threshold is 6 |
| `completeDayPart` complexity is 13 | `src/flow/agent-mode.ts` | Different rule from `applyDayPartClock` |
| `projectBriefFlow` accepts `comparing` before it sends an offer | `src/flow/brief-flow.ts` | Starts in `collecting`. `comparing` is `offerAdded` after `filed` |
| A null inbox token is rejected again after `filingPath` | `src/proposales/http-client.ts` | `filingPath` returns `inbox` only for a non-empty token |
| `@stryker-mutator/vitest-runner` 10.0.0 selects no Vitest 5 tests when coverage is per test | StrykerJS 6210, Vitest 5.0.3 | Vitest joins with ` > `. That runner joins with a space, so covered mutants look survived |
| The CRAP scorer parses files as TypeScript, so JSX branches are left out | `scripts/crap-score.mjs` | `ScriptKind.TS`. The Filed control is scored from `file-brief-state.ts` |
| Covered CRAP max is 6.00. Lowest mutation score is 0.9924 | `scripts/crap-score.mjs`, `scripts/mutation-score.mjs` | `pnpm verify` exited 0 after rebase onto `6676cc7`. Worst CRAP: `briefWrittenInEnglish`. Scores: fitness 58/58, compare 315/316, brief-flow 130/131, day-part 70/70, http 136/137, language 129/129, filing-guard 28/28, file-brief 24/24 |

## Clusters

- Plugin tools stay with p10ns11y/plugins.
- Day-part complexity: clock mapping above the threshold. Leave a stored assumption, or rewrite it.
- Unreachable checks: early `comparing`, and the second inbox-token check. Project offers only from `filed`.
- Skip the Vitest mutation runner until it speaks Vitest 5. Use Stryker's command runner.
- JSX needs `ScriptKind.TSX` before a `.tsx` file is scored on its own.
