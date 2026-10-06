# Product — planner bench

This file is the planner definition. Impeccable's own product record is `product.md`, so this note stays under another name.

One screen. A planner says what they want. The bench turns that into a short brief, finds the best-fitting venues from Proposales, and shows them ranked. Favorites they already have in mind sit on that same list, marked.

The first viewport is the product. Overlays open only where someone asks for more. Images, hotel photos, and a dedicated page per venue wait for the next hydration.

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
5. **Fetch** — build the Proposales query and pull a narrowed set.
6. **Rank** — score that set against the brief and order it.
7. **Show** — top five or ten, in that order, favorites highlighted.

## Flow

Capture → clean → confirm → favorites → fetch → rank → show.

Input to result, few beats, same page. Extra views (overlays, dialogs, popovers) sit off this spine and open only where they are needed.

## Fetch and rank

**Fetch** is System 1. The job is the query: which filters go to Proposales (location, must-haves, whatever the API allows). That slot is a **decision model**. The collab-finder decision model waits; it is a stretch for this build. For now the same slot is an LLM that already knows the questions and the allowed filters, and builds the request from those. If that map is simple, it is ordinary code.

**Rank** is the real LLM. This is the match against the brief. System 2 fits this step: the first brief can be incomplete, they can edit it, and we do not know what they will say. A mix of System 1 and System 2 is still open.

## Engines

- **Proposales** supplies the set. Filing still follows the existing rule: inbox when `inbox_token` is set, draft when it is null.
- **LLM** stands in for the fetch decision model, and does the rank.

## Page

- One viewport on desktop and on mobile. No scroll to use the product.
- If there are columns, golden ratio: the large pane is the important content (the results).
- Expand and hide to keep the rest on the same screen.
- Details open in place.

## Look

The screen is humble and simple. The craft is extreme. Beauty comes from proportion, type, spacing, and the golden split. Decoration does not stand in for hierarchy.

Mode is Operate: a person finishes a task. The first viewport starts at what they want to say. Company is not the first control.

Impeccable owns the visual pass. Tailwind and shadcn are the materials. Type, color, and imagery are chosen in that pass.

Wrong even if polished: a dashboard of labels, a loud marketing page, or a chat transcript that makes them guess the next sentence.

## This pass

The flow, the one-viewport split, and a humble screen that already feels considered. CSS goes as far as that screen needs. The visual world itself (type, color, photos) is the impeccable pass.

## Next hydration

- Images and hotel views.
- Whether a ranked row opens a dedicated page for one venue.
- The collab-finder decision model in place of the fetch stand-in.
- A System 1 + System 2 mix on rank, if System 2 alone is not enough.

## Open

- Fetch: ordinary code when the filter map is a known list. An LLM fills only those known filters. The named decision model waits.
- Rank: System 2 for this pass. A mix with System 1 is not settled.
- Show the top five in the viewport. Further matches wait behind one control.
