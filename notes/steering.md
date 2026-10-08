# Steering

```mermaid
timeline
  title How steering got easier
  5–6 Oct : Research to a product
          : Grok Build and cursor-agent
  Plugins : Loaded, not copied
          : next dev rewrites the agent file
  Cloud : Cursor cloud agents
        : Phone steering is outside this repo
```

Session span: [table](worklog.md#session-span).

## 5–6 Oct

My framing: research to a product, with Grok Build and cursor-agent as collaborators.

| In this repo | |
| --- | --- |
| Work log | 5 Oct is report, ontology, review. 6 Oct names Grok 4.7, then Grok and Cursor. |
| Commits | None on 5 Oct. Six commits on 6 Oct carry a Cursor trailer. |
| Label | estimate |

laptop-1 sessions with Grok Build and cursor-agent show only through commits, so 5–6 Oct may be higher.

## Plugins

My framing: [p10ns11y/plugins](https://github.com/p10ns11y/plugins) removed the need to set up agent files for this project, because the harness workflow took care of it.

One plugin repo, synced to every harness I use:

| Harness | How it loads |
| --- | --- |
| Grok Build | `.grok-plugin` |
| cursor-agent, local Cursor, cloud Cursor | `.cursor-plugin` |
| Claude Code | marketplace in `.claude-plugin/marketplace.json` |

| In this repo | |
| --- | --- |
| Loaded, not copied | [Workflow](workflow.md) says plugins are loaded, not copied. |
| Checkout | Verify pins layout-content-view from [p10ns11y/plugins](https://github.com/p10ns11y/plugins) at `31d93a0`. |
| Agent file | The file says `next dev` writes it again. No commit here removes a hand-written agent file. |

## Cloud

My framing: Grok Bot plus Cursor cloud agents, until steering from a phone was easy.

| In this repo | |
| --- | --- |
| Branches | 31 of 35 merged pull requests use a branch name with `cursor`. |
| Trailers | Ten commits on 7 Oct carry a Cursor Agent trailer. The work log names a cloud agent that day. |
| Card | The productize card names cursor-agent in ask mode (`eea1d9b`). |
| Grok Bot | The [reference pack](design-refs/REFERENCE-PACK.md) uses it as the look of the chat column. It does not record steering. |
| Phone | evidence: outside this repo |
| 7–8 Oct | Session span, mostly agent build time with short human input. A few short sessions of input. Agents built the rest. |

`@adaptate/core` and `@adaptate/utils` are in use. Credits are on the [front page](../README.md#references).

Back: [Work log](worklog.md)

Read next: end
