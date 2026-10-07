# Review

Sources: [tech-case.md](tech-case.md) and [proposales-report.md](proposales-report.md). The report ranked gaps before the brief existed. The definition after the vote is [planner-product.md](planner-product.md).

## The brief

Sign up free, take the profile API key, build with the API, host on Vercel, share the link. A model or the Vercel AI SDK is a bonus. The free key can create and read drafts and call the public inbox. It cannot register a Connection.

## Vote

Ship the planner bench. Keep the VAT invoice bridge as the hotel-side follow-up.

| | Planner bench | VAT invoice bridge |
| --- | --- | --- |
| Who pays | Planners, agencies, in-house teams | A hotel's finance owner |
| Price | Per brief, or a seat | Setup, then a monthly fee per property |
| Case | Vercel app. A model extracts the brief. `POST /v1/inbox/{token}` files it. One live row from `GET /v3/proposals/{uuid}`, one pasted row, gaps on the grid | Leave it out. The free key can preview lines. It cannot register a Connection |
| After | Fan the brief out, then internal approval | `proposal.invoiceUpdated` and `accepted` into one ledger |
| Report | A2 and A1 | B3 |

Use proposals the account created, or documents the planner already received.

## Later

| Idea | Why it waits |
| --- | --- |
| Revenue warehouse (B1) | Needs webhook history |
| Displacement advisor (B2) | Needs hotel rates and a sidebar Connection |
| Supplier catalogue (B4) | Two cold starts |
| WhatsApp or voice intake (A4) | Sits beside their inbox widget |
| Mock API server (A5) | A test tool, not the business |
| Another editor, e-sign, auto-send, organiser portal | Already the Proposales product |

One link for the case: the planner bench. One short note on the invoice bridge records the hotel-side gap.
