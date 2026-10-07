# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A planner who needs a place for an event. They may know nothing about Proposales. They arrive with a sentence, a paste, or speech, and leave with a short ranked list. A place they already had in mind is marked on that same list.

## Product Purpose

The bench turns what they say into a brief, finds venues through Proposales, and shows the best fits. The hard work stays behind one input. The flow in [planner-product.md](notes/planner-product.md) still runs: free text, clean, confirm, structured data, then the views. Favorites, fetch, rank, and show follow. This page says which facts block that flow.

## Positioning

One sticky input, typed or spoken. The bench cleans the brief, asks only what is missing, fetches, and ranks. A step shows a control in the thread only when the person must see it.

## Operating Context

The app is a web page at the repository root. Names are fixed in [planner-product.md](notes/planner-product.md) and [ontology.md](notes/ontology.md).

| Name | Means |
| --- | --- |
| Company | A Proposales hotel account |
| Organisation | The planner's client |
| Venue | A priced row |

The input is first. Company is never the first control. History stays off the first glance.

## Capabilities and Constraints

| Before a match | Rule |
| --- | --- |
| City | Required |
| Start | Date and time |
| End | An end time, or a duration, or an end date after the start |
| People | A count |
| Budget | When a budget is set and `budget.scope` is missing, ask "Is that per person or total?" Yes stays hidden until the answer |

More is a drawer from the right: event name, organisation, email, language, rooms, meeting rooms, food, notes, budget. Saving changes only edited fields. `Budget (EUR)` writes `budgetMinor` and leaves `budget.scope` unset.

| Filing | Matching |
| --- | --- |
| Email, both dates, attendees, a language, and rooms when the end date is after the start | Those fields are not required |
| English with no stated language stores `en` | — |
| Yes asks for a missing email | — |
| The word `file` returns a stored filing and makes no second Proposales call | — |
| In the detail, File with no email opens More and focuses Email | — |
| After filing, that button reads Filed and is disabled | Favorites are a mark on the ranked list |

A model attempt waits 40 seconds. Turn and chat set maxDuration to 60. A missing key, a model error, or that window falls back to the scripted extractor.

| This pass | |
| --- | --- |
| Input | One sticky composer. The thread above it carries the work. |
| Thread | One element when the step needs it: a missing fact, the brief, favorites, then one `data-offer-group` part. |
| Compare | A toggle when two or three offers are visible and the group is at least 640 pixels wide. |
| Detail | Inset sheet on a wide screen, full screen on a phone. Close returns to the same place in the chat. |
| Fetch and rank | Search, then the sort. Neither calls the model. |
| Later | Photos, a page per venue, and the collab-finder decision model. |

The page draws the offer part in React. `/api/chat` can stream the same part. [AG-UI](https://github.com/ag-ui-protocol/ag-ui) spec 1.0 is not connected. No A2UI trees. No CopilotKit shell.

Off-topic text, including an attempt to teach the bench or to be taught, gets a short hold. The flow starts when they say what they need. If they ask what this is for, the bench explains, then waits.

From the same input, later: a faster path, the inner working when they ask to see it, and other jobs.

## Brand Commitments

The screen is humble. Voice is in [TASTE.md](./TASTE.md). Visual materials are in [DESIGN.md](./DESIGN.md).

## Evidence on Hand

- Flow, names, fetch, and rank: [planner-product.md](notes/planner-product.md)
- Booker walk: [ux-findings.md](notes/ux-findings.md)
- Fixture venues: Harbour House, Ridge Hall, Canal Loft.

## Product Principles

- One input does the asking. The thread shows only the element the current step needs.
- The defined flow runs once they ask for a place.
- Off-topic work stops at a hold.
- Detail stays in the sheet until a later hydration says otherwise.
- Extensions hang off the same input.

## Accessibility & Inclusion

Typing and speaking both enter the same input. A missing fact is one current question, with a visible label.
