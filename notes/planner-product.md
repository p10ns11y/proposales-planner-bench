# Product — planner bench

This file is the planner definition: the flow, the names, and fetch and rank. The shell, the hold, and the later extensions are in [PRODUCT.md](../PRODUCT.md). Voice is in [TASTE.md](../TASTE.md). Visual materials are in [DESIGN.md](../DESIGN.md).

One screen. A planner says what they want into one sticky input. The bench turns that into a short brief, finds the best-fitting venues from Proposales, and shows them ranked in the thread. Favorites they already have in mind sit on that same list, marked.

Overlays and modals open only where someone asks for more. Images, hotel photos, and a dedicated page per venue wait for the next hydration.

UX evidence: [ux-findings.md](./ux-findings.md). Terms: [ontology.md](./ontology.md). Build contract: [control-card.md](./control-card.md).

## Names

| Name | Job |
|---|---|
| **Brief** | What they want. Spoken, typed, or pasted, then cleaned. |
| **Organisation** | The planner's client. The party the event is for. Example: Northwind. |
| **Company** | A hotel account on Proposales. The account that can receive a brief. Demo: Harbour House, Quiet Court. |
| **Venue** | A place that answered with a price. A grid row. Demo: Harbour House, Ridge Hall, Canal Loft. |
| **Favorite** | A hotel or venue they already have in mind. Shown on the ranked list, marked, so they can see where it stands. |

Harbour House is both a company and a venue name. Ridge Hall and Canal Loft are venues only. Quiet Court is a company only. Organisation is neither.

## Core functions

1. **Capture** — type, speak, or paste a dump.
2. **Clean** — strip the dump down to a concrete brief.
3. **Confirm** — show that brief and ask if this is it. They can edit.
4. **Favorites** — ask which hotels or venues they already have in mind.
5. **Fetch** — `GET /v3/proposal-search?limit=25`. Keep a row when either city is blank or the cities match, and when the headcount fits the bounds that offer sets.
6. **Rank** — if the brief names a currency, that currency leads. Otherwise the fewest gaps lead, with currency A to Z on a tie, then the lower total. No conversion. A favorite mark does not change the order.
7. **Show** — five rows, then five more. Favorites are marked on that list.

## Flow

Free text → clean → confirm → structured data → the views.

Favorites → fetch → rank → show still follow the structured brief.

Required to reach a match: a city, a start date, a start time, an attendee count, and an end time. The end time can be absent when a duration is set, or when the end date is after the start date. A budget with no basis stays on confirm and asks "Is that per person or total?" The Yes button stays hidden until that basis is set. The rest sits in More, collapsed. Filing needs an email, both dates, an attendee count, a language, and rooms when the end date is after the start. An English brief with no stated language is stored as `en`. Yes asks for a missing email. A later file on the page returns the stored filing. Matching does not need those fields.

Input to result, few beats, same page. Extra views (overlays, dialogs, popovers) sit off this spine and open only where they are needed.

## Fetch and rank

**Fetch** is one search: `GET /v3/proposal-search?limit=25`. City and capacity are checked in the app after the rows come back. The search itself sends no city filter. The collab-finder decision model is not in this build.

**Rank** is the sort in the core functions above. It does not call the model. The model, when `XAI_API_KEY` is set, extracts the brief.

## Engines

- **Proposales** supplies the set. Filing uses the inbox when `inbox_token` is set, and a draft when it is null. A later file on the page returns that result.
- The model extracts the brief. Fetch and rank stay ordinary code.

## Page

- One sticky input at the bottom. They type or talk. The input stays put.
- The thread above it shows the current step, and it is the part that may move.
- A step renders an element in the thread only when they need to see it. The page draws that part in React. `/api/chat` can stream the same `data-offer-group` part. AG-UI is not connected.
- Detail for a result opens in an overlay or a modal.
- Company is not the first control.

## Look

The screen is humble and simple. The craft is extreme. Beauty comes from the one input, the quiet thread, and elements that appear only when needed.

Mode is Operate: a person finishes a task. The first thing they meet is the input.

Tailwind and shadcn stay the materials. The recorded materials are in [DESIGN.md](../DESIGN.md).

Wrong even if polished: a dashboard of labels, a loud marketing page, a form of every brief field, or a thread that makes them guess a magic phrase.

## This pass

Make the defined flow work behind the sticky input. Simple on the surface. The cleaning, the fetch, and the rank stay the hard work. Off-topic asks stop at the hold in [TASTE.md](../TASTE.md).

## Next hydration

- Images and hotel views.
- Whether a ranked row opens a dedicated page for one venue.
- The collab-finder decision model in place of the fetch stand-in.
- Rank stays the sort above.
- From the same input, later: a faster path, the inner working when they ask to see it, and other jobs.

## Open

- Fetch is the search plus the city and capacity checks. The named decision model is not in this build.
- Rank is the sort above.
- Show the top five in the viewport. Further matches wait behind one control.
