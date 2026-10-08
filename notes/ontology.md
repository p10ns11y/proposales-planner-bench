# Ontology

Shared words for the [Proposales report](./proposales-report.md) and builds in this repo.

| Term | Stands for | Here |
| --- | --- | --- |
| RFP | Request for Proposal | A buyer asks a hotel for a group or event quote |
| eProposal | Electronic proposal | The web proposal, instead of a PDF |
| Proposal | — | Rooms, space, food, prices, terms, attachments |
| Inbox | — | Where inbound RFPs land before they become a proposal |
| GME | Groups, Meetings and Events | Group and event sales, not leisure stays |
| MICE | Meetings, Incentives, Conferences, Events | The same space. Incentives are reward trips |
| B2B | Business-to-business | Companies and planners, not holiday guests |
| PMS | Property Management System | Rooms and inventory. OPERA Cloud, Mews, Apaleo |
| S&C | Sales and Catering | Events, function rooms, catering |
| CRM | Customer Relationship Management | Deals and contacts. Salesforce, HubSpot |
| ERP | Enterprise Resource Planning | Finance. Fortnox, Visma, NetSuite. No direct Proposales connectors are listed |
| OPERA Cloud | — | Oracle's cloud PMS. The deepest integration |
| OHIP | Oracle Hospitality Integration Platform | Oracle's API layer for OPERA |
| OSEM | OPERA Sales Event Management | Event packages such as DDR |
| DDR | Day Delegate Rate | A bundled day-meeting price |
| INQ | Inquiry | Soft inventory hold |
| TEN | Tentative | Stronger hold, still unconfirmed |
| DEF | Definite | Confirmed after the buyer signs |
| LOS | Lost | Inventory released |
| OPT | Option | An initial status on some setups |
| API | Application Programming Interface | Create drafts, search proposals, submit RFPs |
| Webhook | — | Proposales calls your server, for example on accept |
| Connection | — | A registered integration that receives webhooks |
| MCP | Model Context Protocol | Ask a connected model about Proposales data |
| Operator | — | Proposales' coming agent that sends proposals and updates OPERA |
| Buyer Portal | — | One event page: chat, rooming list, diet, payments |
| Booking Engine | — | Self-serve small meetings |
| Content library | — | Rooms, spaces, packages, videos |
| Block | — | One proposal line. Not the same as an OPERA block |
| Package split | — | Tax class: accommodation, food, meeting room, other |
| E-sign | Electronic signature | The buyer accepts. Proposales records the contract |
| Collect | — | Invoicing details gathered at signing |
| Logic Layer | — | Enterprise rules inside Proposales |
| SSO | Single sign-on | Microsoft Entra ID or Google |
| Customer Success | — | Turns on API access, Zapier, and Connections |
| SLA | Service level agreement | Enterprise uptime, for example 99.9% |
| DPA | Data processing agreement | How customer data is handled |
| Draft | — | Unsent. The API can create and edit these |
| Active | — | Sent, and still before expiry |
| Accepted, rejected, withdrawn, expired | — | Lifecycle states |
| Series / version | — | Each resend is a new version. History stays |
| inbox_token | — | Public token for `POST /v1/inbox/{token}` |
| company_id | — | Which property the call applies to |
