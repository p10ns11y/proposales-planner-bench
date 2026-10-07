# UX findings — planner bench

Walked 2026-10-06 on `http://localhost:3000` in Chromium, as a person who only wants to book a place. No product knowledge. These notes are for the later design session (S7 / D1). The page is unchanged.

The research notes stay in [journey.md](./journey.md). Terms stay in [ontology.md](./ontology.md). The product definition is in [planner-product.md](./planner-product.md).

## Verdict

A booker cannot get through the page from top to bottom. The first screen already assumes they know what a brief, a company, an inbox, and a grid are. After they speak, the next action is a sentence they have to type, and a shorter reply fails.

## First look

- The page should wait for the person. Voice or text. They say what they want: an event, a posting, a booking. That is the first step.
- The Company dropdown is the first control they have to decode. It should not be.
- Subtitle: "One brief, the offers you received, one grid."
- Company menu: "Harbour House (inbox)" and "Quiet Court (draft)".
- Stage: "collecting".
- One question is clear: "What should we call this event?"
- Results: "Offers show up here after you add venue proposals."
- History (0): "Filed briefs show up here."

`http://127.0.0.1:3000` paints the same shell and then freezes: Company empty, Send grey, no question. Next.js blocks that host in development. The walk used localhost.

## What they type

A normal sentence is dropped. "Hi, I need a place in Stockholm for 40 people on 12 November, with dinner and a meeting room." The page repeats it and asks the same question again. City, date, headcount, dinner, and meeting room are gone.

The only message that fills the form is this shape:

```
Title Northwind offsite. Organisation Northwind. Email ada@northwind.example. Start 2026-11-12. End 2026-11-12. Attendees 40. Language en. City Stockholm. Meeting rooms 2. Food yes. Notes One plenary and dinner.
```

Nothing on the page shows that shape. Plain English should become the structured event, then the next step should start.

After that parse, the assistant coaches exact phrases: "Say file the brief when you want it sent." Then "Say add the venue proposals when you have the offers." That coaching is easy to abandon. There is no control that makes the next action obvious. A shorter reply has to work: "file" has to count the same as "file the brief".

Those two phrases do file and then show the grid. History goes to 1.

## Company, venue, organisation

**Company** is the hotel account that receives the brief. The dropdown picks that account.

- Harbour House (id 1): has an inbox, so the brief is delivered.
- Quiet Court (id 2): no inbox, so the brief is saved as a draft on that account.

**Venue** is a place that answered with a price. Each grid row is one offer: rooms, food, space, extras, a total, and an expiry. The three offers are Harbour House, Ridge Hall, and Canal Loft.

**Organisation** is the planner's client, the party the event is for. In the example that is Northwind. Northwind is not a company in the dropdown and not a venue in the grid.

## Which venue sits under which company

In the fixture records, each offer is stored under one of the two dropdown companies.

| Offer name | Stored under | In the dropdown |
|---|---|---|
| Harbour House | Harbour House (id 1) | yes, as a company |
| Ridge Hall | Harbour House (id 1) | no |
| Canal Loft | Quiet Court (id 2) | no |

Ridge Hall and Canal Loft are offers only. Quiet Court is an account only. Harbour House is both: the selected account, and one of the three offers.

The page never shows that link. The dropdown only chooses which account receives the brief. After "add the venue proposals", the grid lists all three offers by their own names, including Canal Loft, even while Harbour House stays selected. Company and venue look like the same kind of name, so a booker cannot tell them apart.

## Results

With Harbour House selected, the grid shows:

| Venue | Total | Gaps |
|---|---|---|
| Harbour House | 365.00 EUR | Clear |
| Ridge Hall | 950.00 SEK | foodAndBeverage |
| Canal Loft | 210.00 EUR | expired |

The amounts in a row add up. The page never says whether a figure is the whole booking, one person, or one day, and it never says why one row is EUR and another is SEK. Gap marks read "Clear", "foodAndBeverage", and "expired". On a phone the venue names and those gap words wrap inside the cells. Opening History covers the right side of the desktop page and cuts off the Expires column. The saved row is "Northwind offsite", "comparing · 3 venues", and a raw timestamp.

## Hold

Do not change the page on these notes until the design session. That pass is where more constraints, views, and taste land.
