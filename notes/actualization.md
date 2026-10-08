# Actualization: from case build to a real planner

What it takes for the planner to be real. What is built is in [control-card-productize.md](control-card-productize.md). Terms are in [ontology.md](ontology.md).

## 1. Who it serves

![Brief card on production, made-up brief](../docs/media/actualization-brief.png)

![The brief is filed, filed in sample mode](../docs/media/actualization-filed.png)

Proposales customers are hotels selling group and event business. The planner asks in one line instead of a form. The hotel gets a structured request instead of an email thread. Top: production, made-up brief. Bottom: filed in sample mode. Here the model only extracts the brief. Ranking and filing are plain code, so results repeat and nothing is filed by guesswork.

```mermaid
flowchart LR
  offers[Offers for a brief] --> q{"Simple arithmetic? gaps, price, expiry, capacity"}
  q -->|yes| sort[Plain sort]
  q -->|"no, a trade-off"| dm["Decision model: JEV or CLEF"]
  dm -.->|"until they exist"| llm[LLM stands in]
  llm --> check{Code checks the output}
  check -->|valid| ranked[Ranked venues]
  check -->|invalid| sort
  sort --> ranked
```

Ranking rule: simple arithmetic goes to the plain sort, trade-offs to a decision model. Until decision models such as JEV or CLEF exist, an LLM stands in, and code checks its output and falls back to the plain sort. Today every case uses the plain sort.

## 2. Data map

```mermaid
flowchart LR
  planner([Planner]) -->|writes| brief[Brief]
  brief -->|for| org["Organisation: the planner's client"]
  brief -->|filed to| inbox["Inbox, via inbox_token"]
  brief -->|or filed as| draft["Draft, via API key"]
  inbox --> company["Company: hotel account, company_id"]
  draft --> company
  company -->|owns| proposal["Proposal: status, version, series"]
  proposal -->|holds| blocks["Blocks: accommodation, meetingRoom, food, quantity, price, currency"]
  library["Content library"] -->|fills| blocks
```

`inbox_token` is public by design, for website forms. The API key stays on the server.

## 3. What the API offers

| Group | Endpoints |
|---|---|
| Companies and templates | `GET /v3/companies`, `GET /v3/companies/{companyId}/templates` |
| Content library | `GET` `POST` `PUT` `DELETE /v3/content`, `GET /v1/attachments` |
| Proposals | `POST /v3/proposals`, `GET` `POST` `PATCH /v3/proposals/{uuid}`, `PATCH /v3/proposals/{uuid}/data`, `GET /v3/proposal-search` |
| Inbox | `POST /v1/inbox/{token}`, no key |

Fourteen endpoints, seller-side, scoped to the key's companies. No shared hotel directory, partner list or marketplace. No webhooks in the committed spec.

## 4. After filing

```mermaid
sequenceDiagram
  participant P as Planner
  participant H as Hotel
  participant X as Proposales
  P->>X: brief lands in the Inbox, or as a draft
  H->>X: picks it up
  H->>H: checks space, may hold it in the PMS
  H->>X: fills blocks from the content library, prices them
  X->>P: draft becomes active, web proposal link
  P->>H: asks for a change
  H->>X: new version in the same series
  alt planner decides
    X->>H: accepted or rejected
  else time runs out
    X->>H: expired
  else hotel pulls it
    H->>X: withdrawn
  end
  H->>H: books in its own systems
```

The spec's statuses also include replaced and template.

## 5. Gaps to close, in order

```mermaid
flowchart TD
  a["a. Poll GET /v3/proposals/{uuid} and show status and the hotel's link in chat"] --> b
  b["b. Send one brief to several hotels' inboxes: needs a shared directory, or per-hotel access and tokens"] --> c
  c["c. Planner sign-in and a list of filed briefs"] --> d
  d["d. Consent that the email goes to the hotel. Keep only what is needed."]
```

No webhook, so (a) polls. The web link is `url` in proposal-search results. An inbox filing returns only an id. Today history lives in one browser.
