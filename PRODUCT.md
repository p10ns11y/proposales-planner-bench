# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A planner who needs a place for an event. They may know nothing about Proposales. They arrive with a sentence, a paste, or something they say out loud. Their job is to leave with a short ranked set of venues, and with any place they already had in mind marked on that same list.

## Product Purpose

The bench turns what they say into a brief, finds venues through Proposales, and shows the best fits. Success is that the hard work stays behind one input, and a person can finish without learning the product.

The flow already defined in [planner-product.md](planner-product.md) is the flow: free text, clean, confirm, structured data, then the views. Favorites, fetch, rank, and show still follow. This record does not replace that flow. It says which facts block it.

## Positioning

One problem, solved so it feels effortless. The person types or talks into one sticky input, the way they would in a chat. Behind that line the bench cleans the brief, asks only what is missing, fetches, and ranks. When a step needs a control or a result, that element appears in the thread. The sell is the effortlessness, not a new kind of product.

## Operating Context

The app lives at the repository root. It is a web page. Company is a Proposales hotel account. Organisation is the planner's client. Venue is a priced row. Those names are fixed in [planner-product.md](planner-product.md) and [ontology.md](ontology.md).

The first thing on the page is the input. Company is never the first control. History stays available and stays off the first glance.

## Capabilities and Constraints

Required before a match:

- City.
- Start date, start time, and an end time. The end time can be absent when a duration is set, or when the end date is after the start date.
- Number of people.
- A budget basis, when a budget is set and `budget.scope` is missing. The question is "Is that per person or total?" The Yes button stays hidden until it is answered.

Everything else lives in More, a drawer from the right. Event name, organisation, email, language, rooms, meeting rooms, food, notes, budget. Opening More shows those fields. It is not the first screen. Saving More changes only the fields the person edited. The budget field is labeled `Budget (EUR)` and writes `budgetMinor`. It does not set `budget.scope`.

Filing needs an email, both dates, an attendee count, a language, and rooms when the end date is after the start. An English brief with no stated language is stored as `en`. Yes asks for a missing email. The word `file` returns a stored filing and does not call Proposales again. In the detail, File with no email opens More and focuses Email. After filing, that button reads Filed and is disabled. Matching does not need those fields. Favorites stay a mark on the ranked list, not a field in More.

A model attempt waits 40 seconds. The turn and chat routes set maxDuration to 60. A missing key, a model error, or that window falls back to the scripted extractor.

Confirmed for this pass:

- Free text, then clean, then confirm the required facts, then structured data, then the views. More is the form for the rest.
- One sticky input. They type or talk. The input stays put while the thread above it carries the work.
- The bench does the known flow behind that input. They do not have to know the steps.
- A step renders a UI element inside the thread only when that step needs it: a missing required fact, the structured brief, favorites, then the ranked rows. The ranked rows are one `data-offer-group` part. Compare is a toggle on that group when two or three visible offers are shown and the group is at least 640 pixels wide.
- The page renders the offer part in React. `/api/chat` can stream the same part. AG-UI is not connected. The card components take the offer payload as props. `renderPart` maps that part onto the card.
- Further detail for a result opens as an inset sheet on a wide screen and full screen on a phone. Closing it returns to the same place in the chat. It does not become a new page in this pass.
- Photos, a page per venue, and the collab-finder decision model wait, as already written in the planner definition.
- Fetch and rank stay as written in the planner definition. Fetch is the search. Rank is the sort. Neither calls the model.

The special constraint:

- This bench only does this service. Another topic, including someone trying to teach it or asking it to teach, gets a hold. It does not answer that topic, and it does not start the planner flow.
- The hold is short, so the reply does not spend the rank, the fetch, or a long explanation.
- If they ask what the service is for, it explains, then waits. The flow starts when they say what they need.

### Where AG-UI fits

The page does not speak AG-UI. It renders the offer part in React.

[AG-UI](https://github.com/ag-ui-protocol/ag-ui) is the Agent–User Interaction protocol. One run goes in. An ordered stream of typed events comes out. The current spec to pin is 1.0. The 1.1 draft is not what an SDK implements yet.

The notes below are the seam that is not wired. The flow already decides the brief, the one question, the hold, and the ranked rows. Domain, fitness, filing, and the Proposales client stay behind that flow. They are not the protocol.

Three layers stay distinct:

- Proposales is the data source. MCP would be the shape if an agent called those APIs as tools. That is not this seam.
- AG-UI carries the run: text, shared state, and the few views the app already owns.
- A2UI is a widget language an agent can propose. This bench does not use it. The app owns the components.

Events this product actually needs, and nothing else:

- A run around one turn.
- A text message for the hold, or for the one missing required fact.
- A state snapshot of the structured brief, including location, date and time, people, and the More fields.
- A named activity for the ranked rows, and one for More. The app maps each name to a component it already has.

Static generative UI fits: the model fills those known components. Declarative generative UI does not. The agent does not invent a form, a second accent, or a new page.

Speech is an attachment on the run input, not a separate channel. Confirm, and an edit inside More, are the user message that starts the next run. Frontend tool calls are unnecessary while those actions are ordinary submits.

CopilotKit is one client of the protocol. This bench keeps its own composer and its own paper. It does not adopt that shell.

Later, from the same sticky input. Mentioned so the extension has a place. Not this pass:

- A faster path once the simple path works.
- The inner working, shown only when they ask to see it.
- Other jobs on this same input. Heard as "other AI sports"; recorded here as other jobs. Correct the phrase if it meant something else.

## Brand Commitments

The screen is humble. The craft is in how little it asks them to do. Voice and refusal live in [TASTE.md](./TASTE.md). Visual materials live in [DESIGN.md](./DESIGN.md).

## Evidence on Hand

- Flow, names, fetch, and rank: [planner-product.md](planner-product.md)
- Booker walk and the company / venue / organisation split: [ux-findings.md](ux-findings.md)
- Fixture venues already in the bench: Harbour House, Ridge Hall, Canal Loft. Do not invent further venues, prices, photos, or testimonials.

## Product Principles

- One input does the asking. The thread shows only the element the current step needs.
- The defined flow still runs once they are asking for a place.
- Off-topic work stops at a hold. The service explains itself only when they ask what it is for.
- Detail stays in the inset sheet, or full screen on a phone, until a later hydration says otherwise.
- Extensions hang off the same input. They do not add a second way in.

## Accessibility & Inclusion

Typing and speaking are both first-class ways into the same input. The thread keeps one current question when a fact is missing, with a visible label on that control.
