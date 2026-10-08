# UX findings

Walked 2026-10-06 on the dev server in Chromium, as a person who only wants to book a place. A numeric address paints the shell and then freezes. Notes for the later design session. The page was left unchanged. Related: [journey.md](./journey.md), [ontology.md](./ontology.md), [planner-product.md](./planner-product.md).

## Verdict

A booker cannot get through the page. The first screen assumes they know brief, company, inbox, and grid. After they speak, the next action is a sentence they have to type.

## First look

| On screen | Text |
| --- | --- |
| Subtitle | One brief, the offers you received, one grid. |
| Company | Harbour House (inbox), Quiet Court (draft) |
| Stage | collecting |
| Question | What should we call this event? |
| Results | Offers show up here after you add venue proposals. |
| History | Filed briefs show up here. |

The Company menu should not be the first control.

## What they type

A normal sentence is dropped. "Hi, I need a place in Stockholm for 40 people on 12 November, with dinner and a meeting room." City, date, headcount, dinner, and meeting room disappear, and the same question returns.

The only message that fills the form is a labelled dump: title, organisation, email, start, end, attendees, language, city, meeting rooms, food, notes. Nothing on the page shows that shape.

The assistant then coaches "Say file the brief" and "Say add the venue proposals". A shorter reply has to work. "file" must count. Those two phrases do file and then show the grid. History goes to 1.

## Names

| Name | In the fixture |
| --- | --- |
| Company | The account that receives the brief. Harbour House (id 1) has an inbox. Quiet Court (id 2) saves a draft. |
| Venue | A priced row: Harbour House, Ridge Hall, Canal Loft. |
| Organisation | The planner's client. Northwind is neither a company nor a venue. |

| Offer | Stored under | In the company menu |
| --- | --- | --- |
| Harbour House | Harbour House | yes |
| Ridge Hall | Harbour House | no |
| Canal Loft | Quiet Court | no |

The grid lists all three offers while Harbour House stays selected. The page never shows that link.

## Results

| Venue | Total | Gap shown |
| --- | --- | --- |
| Harbour House | 365.00 EUR | Clear |
| Ridge Hall | 950.00 SEK | foodAndBeverage |
| Canal Loft | 210.00 EUR | expired |

The page never says whether a figure is the booking, one person, or one day, or why one row is EUR and another is SEK. On a phone the names and gap words wrap. History covers the right side and cuts off Expires.

## Hold

Leave the page until the design session.
