# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A planner who needs a place for an event. They may know nothing about Proposales. They arrive with a sentence, a paste, or something they say out loud. Their job is to leave with a short ranked set of venues, and with any place they already had in mind marked on that same list.

## Product Purpose

The bench turns what they say into a brief, finds venues through Proposales, and shows the best fits. Success is that the hard work stays behind one input, and a person can finish without learning the product.

The flow already defined in [planner-product.md](./planner-product.md) is the flow: capture, clean, confirm, favorites, fetch, rank, show. This record does not replace that flow. It replaces the shell the flow sits in.

## Positioning

One problem, solved so it feels effortless. The person types or talks into one sticky input, the way they would in a chat. Behind that line the bench cleans the brief, asks only what is missing, fetches, and ranks. When a step needs a control or a result, that element appears in the thread. The sell is the effortlessness, not a new kind of product.

## Operating Context

The app lives in `planner-bench`. It is a web page. Company is a Proposales hotel account. Organisation is the planner's client. Venue is a priced row. Those names are fixed in [planner-product.md](./planner-product.md) and [ontology.md](./ontology.md).

The first thing on the page is the input. Company is never the first control. History stays available and stays off the first glance.

## Capabilities and Constraints

Confirmed for this pass:

- One sticky input. They type or talk. The input stays put while the thread above it carries the work.
- The bench does the known flow behind that input. They do not have to know the steps.
- A step renders a UI element inside the thread only when that step needs it: one missing fact, the brief to confirm, favorites, then the ranked rows.
- Those elements may follow AG-UI (Agent-User Interaction) so a later client can render the same events. This pass may render them in ordinary React. AG-UI is allowed. It is not a blocker.
- Further detail for a result opens in an overlay or a modal. It does not become a new page in this pass.
- Photos, a page per venue, and the collab-finder decision model wait, as already written in the planner definition.
- Fetch and rank stay as written there. Fetch fills known Proposales filters. Rank is the LLM for this pass. The mix is still open.

The special constraint:

- This bench only does this service. Another topic, including someone trying to teach it or asking it to teach, gets a hold. It does not answer that topic, and it does not start the planner flow.
- The hold is short, so the reply does not spend the rank, the fetch, or a long explanation.
- If they ask what the service is for, it explains, then waits. The flow starts when they say what they need.

Later, from the same sticky input. Mentioned so the extension has a place. Not this pass:

- A faster path once the simple path works.
- The inner working, shown only when they ask to see it.
- Other jobs on this same input. Heard as "other AI sports"; recorded here as other jobs. Correct the phrase if it meant something else.

## Brand Commitments

The screen is humble. The craft is in how little it asks them to do. Voice and refusal live in [TASTE.md](./TASTE.md). Visual materials live in [DESIGN.md](./DESIGN.md).

## Evidence on Hand

- Flow, names, fetch, and rank: [planner-product.md](./planner-product.md)
- Booker walk and the company / venue / organisation split: [ux-findings.md](./ux-findings.md)
- Fixture venues already in the bench: Harbour House, Ridge Hall, Canal Loft. Do not invent further venues, prices, photos, or testimonials.

## Product Principles

- One input does the asking. The thread shows only the element the current step needs.
- The defined flow still runs once they are asking for a place.
- Off-topic work stops at a hold. The service explains itself only when they ask what it is for.
- Detail stays in an overlay or a modal until a later hydration says otherwise.
- Extensions hang off the same input. They do not add a second way in.

## Accessibility & Inclusion

Typing and speaking are both first-class ways into the same input. The thread keeps one current question when a fact is missing, with a visible label on that control.
