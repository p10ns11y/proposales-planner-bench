# Work log

Session span beside commits and merged pull requests. The span figures are a supplied estimate. The counts are from git and GitHub. Commands: [evidence](../docs/evidence/reading-path.md).

```mermaid
xychart-beta
  title "Commits as bars, merged pull requests as a line"
  x-axis ["5 Oct", "6 Oct", "7 Oct", "8 Oct"]
  y-axis "Count" 0 --> 20
  bar [0, 16, 15, 14]
  line [0, 1, 14, 14]
```

## Session span

Method: the owner's message, call, mail, and commit timestamps; a gap over 25 min starts a new session; each session counts its span plus 5 min.

| Day | Session span (estimate) | Low–high | Label | Commits | PRs merged |
| --- | --- | --- | --- | --- | --- |
| Mon 5 Oct | 1.6 h | 1.1–2.0 | estimate | 0 | 0 |
| Tue 6 Oct | 4.0 h | 2.4–5.0 | estimate | 16 | 1 |
| Wed 7 Oct | 6.9 h | 5.1–8.0 | session span, mostly agent build time with short human input | 15 | 14 |
| Thu 8 Oct, to 14:57 | 3.8 h | 2.5–4.6 | session span, mostly agent build time with short human input | 14 | 14 |

All four days, session span (estimate): about 16 h (11–19.5). About 9 h in five focus blocks and about 7 h in short bursts.

Mon 5 Oct and Tue 6 Oct keep the plain estimate label. On Wed 7 Oct and Thu 8 Oct the figure is session span, mostly agent build time with short human input. Input on those days was a few short sessions. Agents built the rest.

laptop-1 sessions with Grok Build and cursor-agent show only through commits, so 5–6 Oct may be higher.

Thursday's span stops at 14:57. Commits and merged pull requests are the whole Stockholm day. In this snapshot the latest stamp on 8 Oct is 13:05 Stockholm time.

## Other counts

| What | Number |
| --- | --- |
| Commits on main, 5–8 Oct | 45 |
| Pull requests merged | 29 |
| Issues closed | Unknown |
| ship-by-thursday issues | Unknown |
| V-findings issues | Unknown |
| Vitest tests | 275 |
| Playwright scenarios | 22 |
| Vitest plus Playwright | 297 |
| Production deploys | Unknown |

## Written log

UTC+2. This is the log as written with the pages. It is not the session-span estimate above.

| Date | Start–end | Time | Prompts | Harness | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-10-05 | 22:59–23:54 | 55 min | 9 | Cursor | Report, ontology, review |
| 2026-10-06 | 00:01–11:35 | 15 min | 3 | Cursor | Tau, signup, null token |
| 2026-10-06 | 14:26– | | 8 | Cursor | Log and notes |
| 2026-10-06 | 14:56–15:16 | 20 min | 1 | Grok 4.7 | S1 scaffold |
| 2026-10-06 | 15:27– | | 2 | Grok + Cursor | Handover |
| 2026-10-07 | 10:56–12:00 | 64 min | 1 | Cloud agent | Sticky composer, fixture path |

| Minutes | Prompts | Harnesses |
| --- | --- | --- |
| ~154 min | 24 | Cursor, Grok build, cloud agent |

## Notes with shots

| Page | What |
| --- | --- |
| [Prior cut](../docs/evidence.md) | Word counts and the walkthrough clip |
| [Composer microphone](../docs/evidence/cursor-composer-mic-ffb9.md) | Speech results |
| [Microphone recovery](../docs/evidence/cursor-mic-recovery-spacing-2015.md) | Status spacing |
| [Currency](../docs/evidence/cursor-currency-display-b8d5.md) | Budget label |
| [File control](../docs/evidence/cursor-file-button-order-f6d8.md) | File this brief |
| [Add details layout](../docs/evidence/cursor-more-drawer-layout-a47d.md) | Drawer rows |
| [Rank](../docs/evidence/cursor-rank-within-currency-97ac.md) | Currency groups |
| [Filing](../docs/evidence/filing-email-flow-317a.md) | Email and file |
| [Header copy](../docs/evidence/header-composer-copy-d705.md) | New chat and budget |

Back: [Architecture](../docs/ARCHITECTURE.md)

Read next: [Steering](steering.md)
