# Journey

What the research established, and where it stops. Detail: [proposales-report.md](./proposales-report.md), [ontology.md](./ontology.md), [review.md](./review.md), [planner-product.md](./planner-product.md), [worklog.md](./worklog.md).

## Findings

| | |
| --- | --- |
| Product | Proposales sells to hotels. A proposal is structured data. The buyer needs no account. OPERA Cloud holds, confirms, and releases inventory. The Buyer Portal covers one event. Nothing compares several venues. No accounting connectors on `/connect`. |
| API | 14 endpoints. They stop at drafts: no send, accept, or sign. Search returns at most 25 rows. `POST /v1/inbox/{token}` is public. `inbox_token` comes from `GET /v3/companies` and can be null. Webhooks need an Enterprise Connection. Money is minor units. Response shapes can gain keys. |
| Decision | Free signup, profile key, Vercel, a model as a bonus. The submission is the planner bench. The VAT invoice bridge waits. One real signup. Concordance: closed labels, two judges, a real `p_dm`, and `tau` set in advance as `1 - H/L`. Share of rubric points is not a probability. |
| Limits | Free `inbox_token`, rate limits, trial tier, Workflows, Logic Layer, and banquet event orders were not checked. Marketing claims such as "75% conversion" are Proposales' own. The first concordance hold came from a flawed `p_dm`, and the blind judge used the same model family. When a check is cheap, `tau` sits near 1, so the check is worth running. |

Research used the public site and the docs. Firecrawl was used once its key worked. No live API call had been made when these notes were written. The method is written up in the report above.

## Next

1. Sign up, call `GET /v3/companies`, and record whether `inbox_token` is set.
2. Build the bench on the path that matches: inbox, or a draft.
