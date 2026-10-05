# Proposales ontology — acronyms and abbreviations

Shared vocabulary for the [Proposales report](./proposales-report.md) and any third-party build work in this repo.

---

## Core sales flow

| Term | Stands for | What it means here |
|---|---|---|
| **RFP** | Request for Proposal | A buyer asks a hotel for a quote for a group or event. In Proposales this is an inbound inquiry, often from email, a website form, or the Outlook add-in. |
| **eProposal** | Electronic proposal | The interactive web proposal the hotel sends back, instead of a PDF. |
| **Proposal** | — | The full offer: rooms, meeting space, food and beverage, prices, terms, and attachments. |
| **Inbox** | — | Proposales' screen where inbound RFPs land before someone turns them into a proposal. |

---

## Industry segments

| Term | Stands for | What it means here |
|---|---|---|
| **GME** | Groups, Meetings & Events | Proposales' main market: group bookings and event sales, not single-room leisure stays. |
| **MICE** | Meetings, Incentives, Conferences and Events | Same broad space as GME. "Incentives" means reward trips for staff or partners. |
| **B2B** | Business-to-business | Selling to companies and event planners, not individual holiday guests. |

---

## Hotel systems

| Term | Stands for | What it means here |
|---|---|---|
| **PMS** | Property Management System | The hotel's core system for rooms, reservations, and inventory. Examples: OPERA Cloud, Mews, Apaleo. |
| **S&C** | Sales and Catering | The module or system that manages events, function rooms, and catering. Often tied to the PMS. |
| **CRM** | Customer Relationship Management | Tracks deals, contacts, and pipeline stages. Examples: Salesforce, HubSpot. |
| **ERP** | Enterprise Resource Planning | Finance and accounting backbone. Examples: Fortnox, Visma, NetSuite. Proposales does not list direct ERP connectors. |
| **OPERA Cloud** | — | Oracle's cloud PMS. Proposales' deepest integration. |
| **OHIP** | Oracle Hospitality Integration Platform | Oracle's API layer for connecting OPERA Cloud to other tools. |
| **OSEM** | OPERA Sales Event Management | Oracle's sales-and-catering side inside OPERA. Handles event packages such as DDR. |
| **DDR** | Day Delegate Rate | A bundled day-meeting price, often room hire plus food and beverage per person. |

---

## OPERA block statuses (inventory holds)

When a proposal is sent, the hotel often holds rooms and event space in OPERA as a **block**:

| Status | Meaning |
|---|---|
| **INQ** | Inquiry. A soft hold while the deal is being discussed. |
| **TEN** | Tentative. A stronger hold, still not confirmed. |
| **DEF** | Definite. Confirmed after the buyer signs. |
| **LOS** | Lost. Inventory is released because the deal was rejected or withdrawn. |
| **OPT** | Option. Sometimes used as an initial status on some setups. |

---

## Product and tech terms

| Term | Stands for | What it means here |
|---|---|---|
| **API** | Application Programming Interface | Lets other software create drafts, search proposals, or submit RFPs programmatically. |
| **Webhook** | — | Proposales calls your server when something happens, for example when a proposal is accepted. |
| **Connection** | — | Proposales' name for a registered integration that receives those webhooks. |
| **MCP** | Model Context Protocol | A way to connect ChatGPT or Claude to Proposales data so you can ask questions in natural language. |
| **Operator** | — | Proposales' upcoming AI agent that can send proposals and update OPERA on its own. |
| **Buyer Portal** | — | A per-event page for the event organiser: chat, rooming list, dietary needs, payments. |
| **Booking Engine** | — | Self-serve online booking for smaller meetings, without a salesperson in the loop. |
| **Content library** | — | The hotel's catalogue of sellable items: rooms, spaces, packages, videos. |
| **Block** (in a proposal) | — | One line item in a proposal, such as "40 double rooms" or "Main ballroom." Not the same as an OPERA block. |
| **Package split** | — | How a line item is classified for tax, for example accommodation vs food vs meeting room. |
| **E-sign / e-signature** | Electronic signature | The buyer clicks to accept; Proposales records it as a legally binding contract. |
| **Collect** | — | Proposales feature that gathers invoicing details at signing. |
| **Logic Layer** | — | Enterprise rules engine for custom automation inside Proposales. |
| **SSO** | Single Sign-On | Log in with Microsoft Entra ID or Google instead of a separate password. |
| **Customer Success** | — | Proposales' team that turns on API access, Zapier, and custom Connections. |

---

## Business and marketing

| Term | Stands for | What it means here |
|---|---|---|
| **ROI** | Return on Investment | Whether the inbox widget pays for itself in won business. |
| **ROAS** | Return on Ad Spend | Whether paid marketing that drives RFPs is profitable. |
| **SLA** | Service Level Agreement | Enterprise uptime guarantee, for example 99.9%. |
| **DPA** | Data Processing Agreement | Legal terms for how customer data is handled. |

---

## API-specific shorthand

| Term | Meaning |
|---|---|
| **Draft** | A proposal that has not been sent yet. The API can create and edit these. |
| **Active** | Sent to the buyer and still valid before expiry. |
| **Accepted / Rejected / Withdrawn / Expired** | Final or in-progress states in the proposal lifecycle. |
| **Series / version** | One deal over time; each resend creates a new version with history kept. |
| **inbox_token** | A public token for `POST /v1/inbox/{token}` so websites can submit RFPs without an API key. |
| **company_id** | Which hotel property the API call applies to. |
