# Proposales — first-principles product report and third-party build map

Sources: proposales.com (home, pricing, MCP, Operator, product and connect pages), the full developer docs at docs.proposales.com (35 pages and `openapi.json` v2026.09.02). Raw captures live in `.firecrawl/`. Note: `tech-case.md` was empty when this was written, so the build ideas below are not tied to a specific brief.

**Terminology:** acronyms and abbreviations (RFP, PMS, MICE, OPERA block statuses, and the rest) are defined in [ontology.md](./ontology.md).

---

## 1. The problem, from first principles

A hotel has **perishable inventory**: rooms per night, meeting spaces per hour or day, and food and beverage capacity. Most of it is sold one guest at a time through booking engines and channel managers. Group, meeting, and event business ("GME" or "MICE") is different:

- **The order is a bundle.** For example: 40 rooms × 3 nights, one plenary room, two breakout rooms, coffee breaks, and a dinner.
- **The price is negotiated** and depends on dates, on who else wants that inventory (displacement), and on the client.
- **The deal is a contract**, so it needs versions, a signature, deposits, and invoicing details.
- **Inventory must be held while the deal is negotiated** (a tentative block in the property management system, or PMS) and released if the deal is lost.

Before tools like Proposales, this ran on email, Word or PDF quotes, manual re-keying into the PMS, and follow-ups from memory. Every hand-off was slow and error-prone, and buyers usually choose whoever answers fastest and most clearly.

**Proposales' thesis:** treat the proposal as **structured data (a JSON standard), not a document**. Once the offer is data, the system can:

1. render it as an attractive, interactive web page,
2. let the buyer act on it (toggle options, change quantities, sign),
3. version it as a contract,
4. sync it to every downstream system (PMS, sales and catering system, CRM, payments, analytics),
5. let AI read and write it.

Everything else in the product follows from that choice.

---

## 2. The core domain model (what the API actually exposes)

| Concept | What it is |
|---|---|
| **Company** | A hotel or property, the tenant. Users belong to companies. Enterprise plans group several properties together. |
| **Content library** | Sellable products (rooms, spaces, packages, food and beverage, videos), each with a *variation*: a unit (`night`, `person`, `h`, `day`, `sqm`…) and a *package split*, meaning its VAT category (`accommodation`, `food`, `meetingRoom`, `other`). |
| **Template** | An unsent proposal used as a starting point, maintained by admins to keep proposals on brand. |
| **Proposal** | Title, description (markdown with variables), hero image or video, **blocks**, attachments, recipient, currency, tax mode, expiry, a custom `data` object, and tracking. |
| **Block** | A product line or video. It can be `optional` (the buyer toggles it on or off) and can hold a **multi-product breakdown** (sub-rows such as a per-day split). |
| **Proposal series and versions** | Every send creates an immutable version. The buyer sees one proposal with a version picker; internally each version is a separate record. |
| **Status machine** | `draft` → `active` → `accepted`, `rejected`, `withdrawn`, or `expired`. An accepted version can later become `replaced` when a newer version is accepted. `template` is a separate state, and non-latest versions have status `null`. |
| **Signatures** | Name, date, IP address, and user agent of whoever accepted. The seller can also mark a proposal accepted. |
| **Invoicing** | A form the buyer fills in at signing (company name, address, organisation or VAT number, PO reference). |
| **Tracking** | Sent, first and last viewed, number of views, accepted (and whether on mobile), expired, and whether the proposal was created from an RFP or a template. |
| **Inbox / RFP** | An inbound request (contact details, dates, message, plus any extra form fields) that becomes the seed of a proposal. |

Money is always stored in the **smallest currency unit** (cents or öre).

---

## 3. Products and services, from simple flows to complex ones

### Level 1: A seller sends one proposal (the core loop)
1. The seller picks a **template** and adds products from the content library.
2. They press **Send**. The buyer gets a link to a branded, mobile-friendly proposal page; no buyer account is needed.
3. The buyer views it, toggles optional add-ons such as a spa treatment or wine pairing, and adjusts variable quantities. The total updates live.
4. The buyer **e-signs**, which turns the proposal into a legally binding contract. Status becomes `accepted`.
5. Automatic reminders and view tracking tell the seller when to follow up.

### Level 2: Negotiation and changes
- Editing a sent proposal creates a **new version**. Both sides keep the full history, which matters for contracts.
- "Continue after accept": a signed deal can be amended and re-signed. The old version becomes `replaced`.
- Withdrawal, expiry, rejection, and reject reasons are first-class states.

### Level 3: Inbound demand (getting the request in)
- **Inbox widget** (€49/month add-on): a website form that drops structured requests into Proposales with the proposal pre-filled. The Google Analytics integration attributes revenue to the marketing channel that produced the lead.
- **AI inbox widget**: a conversational version that qualifies the visitor in their own language.
- **Outlook add-in** (a **Salesforce add-in** also exists): turns an email request into a structured RFP so the seller can reply with a proposal within seconds. It extracts guest count, dates, company, and contact details, gives a star rating for how qualified the lead is, flags missing details and drafts the reply, and shows the sender's past bookings. Replies are sent from the seller's own email address ("human-assisted").
- **Public RFP endpoint**: `POST /v1/inbox/{token}` with **no authentication**. It accepts JSON or form posts, and any extra fields are stored as metadata.
- **Booking Engine**: guests book meeting rooms on the hotel's website, from small day meetings to multi-day events with accommodation, with no salesperson involved. Small deals skip the proposal step entirely.

### Level 4: Money and paperwork after the yes
- Collect invoicing details at signing (the "Collect" web form).
- Take deposits and payments through **Stripe**, **Adyen**, or **Planet**, and issue **pro-forma invoices**.
- A `proposal.invoiceUpdated` webhook sends the invoicing data to downstream systems.
- **Buyer Portal**: one web page per event for the organiser, with proposals, contracts, chat with the hotel team, documents, payments, a **rooming list** upload that creates reservations in OPERA Cloud, and **dietary preferences** synced as catering notes on the OPERA event. Proposales claims it saves 3–4 hours per booking.

### Level 5: Inventory and system sync (the integration layer)
- **PMS**: OPERA Cloud (the deepest integration), Mews, Apaleo, Shiji, Amadeus Delphi, Infor, and D-EDGE for live availability and pricing. With OPERA Cloud:
  - Sending a proposal creates or updates a block, with a tentative status such as `INQ` or `TEN`.
  - Signing moves the block to definite (`DEF`).
  - Rejection or withdrawal releases the inventory and sets it to lost (`LOS`) with the reason.
  - Rates come from OPERA's rate codes and occupancy, packages are respected, and translations are pulled per language.
  - It supports catering packages from OPERA's sales and event module (OSEM), such as the day delegate rate (DDR), plus price overrides shown as discounts.
  - Marketing claims: "30% sales time saved", "75% conversion on inbound RFPs", and "30% revenue increase for Groups & MICE".
- **Sales and catering / events systems**: Thynk, Event Temple, Cvent.
- **CRM**: Salesforce, HubSpot, Microsoft Dynamics 365, and SuperOffice update deal stages from proposal activity.
- **Glue**: Zapier, Google Tag Manager, Google Analytics, plus visualiser and virtual-tour partners. Zapier triggers on proposal status changes and needs a user API key plus activation by customer success, the same manual approval as the API.
- **Workflows**: "Autonomous workflows for event sales, detailing and delivery." The marketing page gives no specifics, so check in a demo.

### Level 6: Enterprise and multi-property
- Multi-property management with one-click template and module updates across hotels.
- A **logic layer** of custom rules, **corporate agreements** for recurring contracts, SSO (Microsoft Entra ID or Google), a 99.9% uptime SLA, custom data retention, Excel or CSV exports, a dedicated customer success manager, and **API and webhooks** (an Enterprise-tier feature).

### Level 7: AI and agentic selling
- **Agentic inquiry handling**: an agent reads the inquiry, qualifies it, checks availability, and prepares a ready-to-send draft. A human still sends it.
- **MCP server**: connect ChatGPT or Claude to ask questions about proposals and sales data in natural language.
- **Operator** (coming soon): an agent that sends proposals and keeps OPERA Cloud updated on its own.

> Pricing: two plans, **Premium** (proposal building, e-signature, upsell, Collect form, content management, insights, branding, PMS, sales and catering, and Outlook) and **Enterprise** (everything in Level 6, including API and webhooks). No list prices are published apart from the €49/month inbox widget. The site does offer a "Try for free" signup, so a trial account (tier not stated) can probably be used to explore the UI. API access is Enterprise-only.

---

## 4. The developer platform: what you can actually do

### 4.1 Endpoints you call (REST, `https://api.proposales.com`, Bearer token)

| Method | Path | What it does |
|---|---|---|
| GET | `/v3/companies` | Companies the token can access, including each company's `inbox_token` |
| GET | `/v3/companies/{id}/templates` | List templates |
| GET, POST, PUT, DELETE | `/v3/content` | Read and manage the content library; DELETE archives (bulk archive and restore also exist) |
| GET | `/v1/attachments` | List attachments |
| POST | `/v3/proposals` | Create a **draft** |
| GET | `/v3/proposals/{uuid}` | Full proposal JSON, including status, signatures, invoicing, and tracking |
| POST | `/v3/proposals/{uuid}` | Create a new version in the same series |
| PATCH | `/v3/proposals/{uuid}` | Update a draft in place (sending `blocks` replaces the whole list) |
| PATCH | `/v3/proposals/{uuid}/data` | Update the custom `data` object (variables and metadata) |
| GET | `/v3/proposal-search` | Filter on `data[...]` fields or recipient email. **At most 25 results, no pagination.** |
| POST | `/v1/inbox/{token}` | **Public**, no auth. Creates an RFP. |

### 4.2 Webhooks Proposales calls on your server (via a registered "Connection")

Here the integration framework is inverted: **you host the endpoints and Proposales queries them** while the user works.

| Event | What your server returns | What it enables |
|---|---|---|
| `integration.config` | Form fields for the hotel admin's setup screen | Self-serve configuration of your integration |
| `content.import` | Product list with stable `uniqueId`s | Sync an external catalogue into the library |
| `content.details` | Block behaviour, custom fields, quick-add sub-resources, fixed sub-rows | Rich, system-aware line items |
| `content.availability` | Available yes/no or a quantity, per row or per day | Live availability in the editor |
| recipients search | Contacts | Pick recipients from your CRM |
| `proposal.editorWidget` | Sidebar input fields that write to `proposal.data` | Custom controls inside the editor |
| `proposal.dataWidget` | Read-only fields and link buttons on sent proposals | Show external IDs and deep links |
| `proposal.statusChanged` | Optional `bookingId` and booking status, plus extra metadata | Create bookings and write the IDs back |
| `proposal.invoiceUpdated` | (no response needed) | Push invoicing data to finance systems |

### 4.3 Hard constraints that shape any third-party product
1. **Tokens are issued manually** by Proposales support and are tied to one user; company IDs also come from support. Onboarding cannot be fully self-serve.
2. **API and webhooks are on the Enterprise plan.** Building a Connection also needs a "connection development powerup" switched on by customer success.
3. **There is no send, accept, or sign endpoint.** The API stops at the draft. A human, or Proposales' own Operator, does the send. That is a deliberate human-in-the-loop moat.
4. **No bulk read.** Search returns at most 25 results with no pagination. For history, you must **build your own event log** from `statusChanged` webhooks.
5. **Response shapes can grow without a version bump**, so validate and pick only the keys you need.
6. **Only the public RFP endpoint works without a token**, and you still need the hotel's `inbox_token`. The hotel's admin can read it from `GET /v3/companies` and share it.

---

## 5. What Proposales is structurally *not* (where the gaps are)

Proposales is a **seller-side, single-tenant tool**. Every feature serves one hotel or group answering demand. Even the Buyer Portal is a per-hotel, per-event space that the hotel provides to its own client. It does not cover:

- **The buyer side across venues.** Event planners, agencies, and corporate travel managers who send one brief to many venues and must compare the answers.
- **Cross-venue anything.** No marketplace, no venue sourcing, no benchmarking across hotels that aren't in the same group.
- **Before the request**: venue discovery and demand generation beyond the hotel's own website widget.
- **After the signature, beyond the portal**: rooming lists, dietary requirements, chat, and payments are covered by the Buyer Portal. Banquet event orders and function sheets, run-of-show, and self-registration by attendees are not advertised; check this in a demo before building.
- **Finance and ERP**: no accounting connectors are listed (Fortnox, Visma, Xero, NetSuite, SAP). This was checked with a Firecrawl scrape of `/connect`, whose only categories are PMS and sales-and-catering, CRM, Payment, Virtual tours, and Analytics.
- **Long-term analytics**: Insights and MCP answer questions on the fly, but there is no exportable event history through the API, no forecasting, and no displacement or pricing optimisation.
- **Third-party suppliers**: activities, transfers, audiovisual equipment, or florists cannot be sold inside a proposal with live availability, except through a custom Connection.

---

## 6. What a third party can build

The ideas are ranked by how much they depend on a Proposales account. The "Not covered because" line says why this isn't overlap with Proposales.

### Tier A: No Proposales account needed (buyer side or public endpoint)

**A1. Multi-venue RFP fan-out ("one brief, many hotels")**
- Flow: a planner fills in one structured brief (dates, attendees, rooms, spaces, budget). The tool sends it to N venues:
  - Proposales hotels get `POST /v1/inbox/{token}`, with the full brief attached as extra form fields, which Proposales stores as metadata.
  - Other hotels get email, or their own forms.
- Not covered because: Proposales only receives requests one hotel at a time; it has no buyer-side sourcing.
- Needs: no Proposales account. You do need each hotel's inbox token, which hotels share willingly because it brings them leads. `is_test` and `silent_confirmation` make development safe.

**A2. Proposal comparison workspace for planners**
- Flow: the planner forwards proposal emails, links, or PDFs from several venues. The tool normalises them into one grid: cost per attendee per day, room nights, food and beverage spend, meeting space, optional extras, cancellation terms, and expiry dates. It flags missing items against the original brief from A1.
- Not covered because: Proposales renders each proposal on its own. Planners compare in spreadsheets.
- Needs: no account. Parse what the planner legitimately received, such as the PDF export. Don't scrape the hotels' proposal viewer in bulk; check the terms of service.

**A3. Buyer-side approval and procurement flow**
- Flow: before anyone signs, the planner's company routes the chosen proposal through a budget owner, procurement checks (preferred-supplier list, rate caps, duty of care), and an audit trail. Only then does the planner sign in Proposales.
- Not covered because: signing in Proposales is a single click by one person. Corporate buyers usually need internal approval first.

**A4. Any-channel intake that feeds the public RFP endpoint**
- WhatsApp, voice or phone AI, Instagram DMs, event-platform listings, or venue-finder SEO pages. Each channel turns the conversation into the RFP payload and enriches it with metadata: lead score, firmographics, estimated budget, and source attribution.
- Not covered because: Proposales' widgets live only on the hotel's website and in Outlook.
- Positioning: sell it as a lead-generation channel for hotels, not as a competing widget.

**A5. Developer tooling: contract mocks and a test harness**
- A mock server generated from the published `openapi.json`, plus simulators for every webhook (`content.import`, availability, status changes), so PMS, CRM, and ERP vendors can build and test Proposales Connections before getting a token.
- Not covered because: there is no public sandbox, and tokens are issued manually.
- Needs: no account at all. It removes the slowest step for everyone else in the ecosystem.

### Tier B: Built *with* a hotel's token or as a registered Connection (Enterprise customers)

**B1. Event-sourced revenue intelligence**
- Store every `statusChanged` webhook in your own warehouse, filling gaps with `GET /v3/proposals/{uuid}`. That gives win and loss by segment, lead source, and lead time; time-to-respond versus win rate; which optional add-ons get picked; and the effect of expiry dates.
- Add a **cross-hotel anonymised benchmark** for independent hotels that aren't in one group.
- Not covered because: the API has no bulk read (25 results, no pagination), and MCP answers ad-hoc questions without keeping history or benchmarks.

**B2. Group pricing and displacement advisor in the editor sidebar**
- An `editorWidget` shows a recommended group rate, minimum spend, and the displacement cost of the dates, using a transient-demand forecast from your revenue management data. The outcome comes back through the status webhook, so the model learns from results.
- Not covered because: Proposales pulls OPERA's rates but does not optimise them.

**B3. Finance and ERP Connection**
- On `invoiceUpdated` and `accepted`: create the customer, the deposit invoice, and VAT-correct lines in Fortnox, Visma, Xero, or NetSuite. The package split already carries the VAT category and rate per line.
- Return the ERP invoice ID through `statusChanged` → `data` and show a deep link in the `dataWidget`.
- Not covered because: no accounting connectors are listed.

**B4. Partner and supplier catalogue inside proposals**
- A Connection imports third-party products (destination-management activities, transfers, audiovisual, spa, golf) through `content.import`. It checks their live availability through `content.availability`, offers quick-add extras through `content.details` sub-resources, and confirms with the supplier on acceptance. Revenue share per booked add-on.
- Not covered because: the content library only contains the hotel's own inventory.

**B5. Banquet event orders and function sheets from accepted proposals (narrow; check first)**
- When a proposal is accepted, generate banquet event orders and function sheets for kitchen, audiovisual, and housekeeping from its structured JSON. Re-diff when a newer version is accepted (`replaced`) and send only the changes to the affected teams.
- Not covered because: the Buyer Portal handles the organiser's side (rooming list, dietary needs, chat, payments). The hotel's internal operations documents appear to be left to a sales and catering system. Confirm this before investing.

**B6. Connectors for systems not on Proposales' list**
- Smaller PMS vendors (for example Cloudbeds, Protel, Clock), restaurant and table systems, and regional CRMs. Use the full webhook set: import, availability, status → booking ID.
- Not covered because: integrations are prioritised for enterprise PMS vendors; the long tail is open.

### Where *not* to build (overlap or moat)
- Another proposal editor, e-signature, or website inbox widget. These are Proposales' core.
- Automated sending. The API deliberately stops at drafts, and Operator is Proposales' own play.
- Natural-language Q&A over one hotel's proposals. MCP already does this.
- An organiser portal for a single event (rooming list, dietary needs, chat, payments). The Buyer Portal already does this.
- Self-serve booking of small meetings. The Booking Engine already does this.

---

## 7. Recommended starting point

- **Best wedge without an account:** combine **A1, multi-venue fan-out**, with **A2, comparison**. It serves buyers that Proposales ignores, the only Proposales dependency is the public inbox endpoint, and hotels *gain* leads, so Proposales is more likely to welcome it than block it.
- **Best wedge with an account:** **B1, event-sourced intelligence**, or **B3, finance and ERP**. Both are clear gaps, both fit the documented webhooks exactly, and both are easy for a buyer to justify.
- **Build A5 (the mock harness) first either way.** It is roughly a day of work from `openapi.json`. It de-risks every Tier B idea before a token exists, and as a public repo it is good evidence of skill for a hiring loop.

**Key risk:** Tier B depends on manual token issuance and the Enterprise plan. Mitigate by targeting hotel groups that already use Proposales Enterprise, or by partnering through Proposales' partnership programme (`/partnerships`).
