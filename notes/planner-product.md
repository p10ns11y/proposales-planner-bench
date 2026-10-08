# Product — planner bench

Flow, names, fetch, and rank. Shell and hold: [PRODUCT.md](../PRODUCT.md). Voice: [TASTE.md](../TASTE.md). Visuals: [DESIGN.md](../DESIGN.md).

One sticky input. The bench makes a short brief, ranks Proposales venues in the thread, and marks favorites on that list. Photos and a page per venue wait. Evidence: [ux-findings.md](./ux-findings.md). Terms: [ontology.md](./ontology.md). Build: [control-card.md](./control-card.md).

## Names

| Name | Job |
| --- | --- |
| Brief | What they want, then cleaned |
| Organisation | The planner's client. Example: Northwind |
| Company | A hotel account that can receive a brief. Harbour House, Quiet Court |
| Venue | A priced row. Harbour House, Ridge Hall, Canal Loft |
| Favorite | A place they already have in mind, marked on the ranked list |

Harbour House is a company and a venue. Ridge Hall and Canal Loft are venues. Quiet Court is a company. Organisation is neither.

## Flow

Free text, clean, confirm, structured data, then the views. Then favorites, fetch, rank, show.

| Step | Does |
| --- | --- |
| Capture | Type, speak, or paste |
| Clean | A concrete brief |
| Confirm | Show it and ask. They can edit |
| Favorites | Which places they already have in mind |
| Fetch | `GET /v3/proposal-search?limit=25`. Keep a row when either city is blank or the cities match, and the headcount fits the offer |
| Rank | A named currency leads. Otherwise the event city's currency leads, the same rule as the budget currency. Inside a currency, open offers come before expired ones, then fewer gaps, then the lower total. Other currencies follow from A to Z, each sorted the same way. No conversion. A favorite mark leaves the order unchanged |
| Show | Five rows, then five more |

Required to match: city, start date, start time, attendees, and an end time. The end time can be absent when a duration is set, or when the end date is after the start. A budget with no basis stays on confirm and asks "Is that per person or total?" Yes stays hidden until the basis is set. The rest sits in Add details.

Filing needs an email, both dates, attendees, a language, and rooms when the end date is after the start. English with no stated language stores `en`. Yes asks for a missing email. A later file on the page returns the stored filing. Matching does not need those fields.

The search sends no city filter. Rank does not call the model. The model, when `XAI_API_KEY` is set, extracts the brief. The collab-finder decision model is not in this build.

## Page

One route holds the chat, the detail, and Add details. One sticky input at the bottom. The thread shows a step only when they must see it. The page draws that part in React. `/api/chat` can stream the same `data-offer-group` part. AG-UI is not connected. Detail opens in an overlay. Company is not the first control.

Tailwind and shadcn stay the materials ([DESIGN.md](../DESIGN.md)). Off-topic asks stop at the hold in [TASTE.md](../TASTE.md).

## Later

Images, whether a row opens its own page, and the collab-finder model in place of the fetch stand-in. Rank stays the sort above. From the same input: a faster path, the inner working when they ask, and other jobs.

Fetch is the search plus the city and capacity checks. Show the top five. Further matches wait behind one control.

Back: [Actualization](actualization.md)

Read next: [Architecture](../docs/ARCHITECTURE.md)
