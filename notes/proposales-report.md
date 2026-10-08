# Proposales — product and API map

Sources: proposales.com (home, pricing, MCP, Operator, product, connect) and docs.proposales.com (35 pages, `openapi.json` v2026.09.02). Captures live in `.firecrawl/`. [tech-case.md](tech-case.md) was empty when this was written. The later choice is [review.md](review.md). Terms: [ontology.md](./ontology.md).

## The problem

A hotel sells perishable inventory: rooms per night, meeting space, and food. A group order is a bundle, for example rooms for three nights, a plenary, two breakouts, and dinner. The price is negotiated, the deal is a contract with versions and a signature, and the rooms are held in the PMS until the deal is won or lost. Before this, it ran on email and PDF quotes, then someone re-keyed the PMS. The thesis: the proposal is structured data. From that, the product renders a page, lets the buyer change quantities and sign, versions the contract, and syncs the PMS, sales and catering, CRM, and payments. A model can read and write the same object.

Money is stored in the smallest currency unit.

## Domain

| Concept | What it is |
| --- | --- |
| Company | A hotel. Enterprise plans group several properties |
| Content library | Rooms, spaces, packages, food, videos. A variation has a unit (`night`, `person`, `h`, `day`, `sqm`) and a package split (`accommodation`, `food`, `meetingRoom`, `other`) |
| Template | An unsent starting point |
| Proposal | Title, markdown description, hero, blocks, attachments, recipient, currency, tax mode, expiry, custom `data`, tracking |
| Block | A line or a video. Optional lines toggle. A block can hold sub-rows |
| Series | Each send is an immutable version. The buyer sees one proposal and a version picker |
| Status | `draft` to `active`, then `accepted`, `rejected`, `withdrawn`, or `expired`. A newer accept marks the old one `replaced`. `template` is separate. Older versions are `null` |
| Signatures | Name, date, client address, user agent. The seller can also mark accepted |
| Invoicing | Company, address, organisation or VAT number, PO reference, collected at signing |
| Tracking | Sent, views, accepted, expired, and whether it came from an RFP or a template |
| Inbox / RFP | Contact, dates, message, and extra form fields. The seed of a proposal |

## Products

| Level | What it does |
| --- | --- |
| 1 Send | Template plus library, then Send. The buyer opens a link, toggles extras, and e-signs. Status becomes `accepted`. No buyer account |
| 2 Change | An edit of a sent proposal is a new version. A signed deal can be amended. The old version becomes `replaced` |
| 3 Demand | Inbox widget (€49/month) and a conversational version. Outlook and Salesforce add-ins turn an email into an RFP. `POST /v1/inbox/{token}` is public. The Booking Engine sells small meetings with no salesperson |
| 4 After yes | Collect, deposits via Stripe, Adyen, or Planet, pro-forma invoices, `proposal.invoiceUpdated`. Buyer Portal: chat, documents, payments, rooming list into OPERA, diet as catering notes |
| 5 Sync | OPERA Cloud (deepest), Mews, Apaleo, Shiji, Delphi, Infor, D-EDGE. Send holds `INQ` or `TEN`. Sign sets `DEF`. Reject or withdraw sets `LOS`. Thynk, Event Temple, Cvent. Salesforce, HubSpot, Dynamics, SuperOffice. Zapier needs a user key and customer success. Marketing claims ("30% sales time saved", "75% conversion", "30% revenue increase") are Proposales' own. Workflows: the page gives no specifics |
| 6 Enterprise | Multi-property, logic layer, corporate agreements, SSO, 99.9% SLA, API and webhooks |
| 7 Agents | An agent prepares a draft a human still sends. MCP connects a model to one hotel's data. Operator, coming, sends and updates OPERA |

Premium is proposal building through Outlook. Enterprise adds level 6. No list prices except the €49 inbox widget. "Try for free" exists. The trial tier is unstated. API access is Enterprise-only.

## Endpoints

REST at `https://api.proposales.com`, bearer token, except the inbox.

| Method | Path | Does |
| --- | --- | --- |
| GET | `/v3/companies` | Companies, including each `inbox_token` |
| GET | `/v3/companies/{id}/templates` | Templates |
| GET, POST, PUT, DELETE | `/v3/content` | Content library. DELETE archives |
| GET | `/v1/attachments` | Attachments |
| POST | `/v3/proposals` | Create a draft |
| GET | `/v3/proposals/{uuid}` | Full proposal |
| POST | `/v3/proposals/{uuid}` | New version in the series |
| PATCH | `/v3/proposals/{uuid}` | Update a draft. `blocks` replaces the list |
| PATCH | `/v3/proposals/{uuid}/data` | Custom `data` |
| GET | `/v3/proposal-search` | Filter on `data[...]` or recipient. At most 25, no pagination |
| POST | `/v1/inbox/{token}` | Public. Creates an RFP |

Webhooks: you host the endpoints. Proposales calls them.

| Event | Your server returns |
| --- | --- |
| `integration.config` | Setup fields |
| `content.import` | Products with stable `uniqueId`s |
| `content.details` | Block behaviour and sub-rows |
| `content.availability` | Yes, no, or a quantity |
| recipients search | Contacts |
| `proposal.editorWidget` | Sidebar fields that write `proposal.data` |
| `proposal.dataWidget` | Read-only fields and links on a sent proposal |
| `proposal.statusChanged` | Optional `bookingId` and status |
| `proposal.invoiceUpdated` | Nothing. Push invoicing onward |

## Constraints

1. Tokens are issued by support and tied to one user.
2. API and webhooks are Enterprise. A Connection also needs a powerup from customer success.
3. There is no send, accept, or sign endpoint. The API stops at the draft.
4. Search returns at most 25 rows. History has to come from `statusChanged`.
5. Response shapes can grow without a version bump.
6. Only the inbox works without a token, and it still needs the hotel's `inbox_token`.

## Gaps

Proposales is a seller-side tool for one hotel. It does not cover a planner across venues, venue discovery beyond the hotel's widget, banquet event orders, accounting connectors, an exportable event history, or third-party suppliers with live availability. `/connect` lists PMS and sales-and-catering, CRM, payment, virtual tours, and analytics.

## What a third party can build

| Id | Idea | Needs |
| --- | --- | --- |
| A1 | One brief to many hotels, via inbox or email | Each hotel's `inbox_token`. `is_test` and `silent_confirmation` |
| A2 | One comparison grid from proposals the planner received | No account. Do not scrape the proposal viewer |
| A3 | Internal approval before anyone signs | No account |
| A4 | Intake from other channels into the public inbox | Sell it as lead generation |
| A5 | A mock server from `openapi.json` | No account |
| B1 | A warehouse of `statusChanged`, plus benchmarks | A hotel token |
| B2 | A rate and displacement sidebar | `editorWidget` and hotel rate data |
| B3 | VAT lines into Fortnox, Visma, Xero, or NetSuite | `invoiceUpdated` and `accepted` |
| B4 | Supplier products inside proposals | `content.import` and `content.availability` |
| B5 | Banquet event orders from accepted JSON | Check first. The Buyer Portal covers the organiser |
| B6 | Connectors for PMS and CRM systems not on the list | The webhook set |

Leave alone: another editor, e-sign, or inbox widget; automated sending; natural-language questions over one hotel (MCP); an organiser portal; self-serve small meetings. Those are the product's own jobs. A third party adds a planner across hotels, or a record of what the webhooks already emit. The mock server in A5 is the way to try Tier B before an issued hotel token exists.

## Start

A1 plus A2 needs only the public inbox and serves buyers Proposales does not. Hotels gain leads, so the product sits beside the seller tool. B1 or B3 is the account wedge: both match documented webhooks, and a hotel can explain the spend. A5 comes first either way. A mock from `openapi.json` lets every Tier B idea be tested before a token exists, and a public mock is evidence of the work. Tier B still depends on manual token issuance and the Enterprise plan. The mitigation is a hotel group already on that plan, or the partnership programme at `/partnerships`.
