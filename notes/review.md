# Review — what to build on the Proposales API

Sources: [tech-case.md](tech-case.md) (the application brief) and [proposales-report.md](proposales-report.md) (product and API map). The report was written when [tech-case.md](tech-case.md) was empty, so it ranks gaps. The definition that followed the vote is [planner-product.md](planner-product.md). This review ranks gaps that a free account can demonstrate and that can be charged for without a Proposales partnership.

## The brief

Sign up free, take the API key from the profile settings, build anything useful with the API, host it on Vercel, and share the link. An LLM or the Vercel AI SDK is a bonus. Thought process matters more than polish.

The free key can create and read drafts and can call the public inbox. It does not register a Connection or prove webhooks. The submission has to stand on endpoints the key can actually call.

## Vote

Build the **planner bench** for the submission. Keep the **VAT invoice bridge** as the hotel-side product to turn on after the process.

## 1. Planner bench (compare first, fan-out second)

A planner pastes one brief and the proposals they already received. The app normalizes them into one grid: cost per attendee per day, room nights, food and beverage, space, optional extras, cancellation, expiry, and what is missing against the brief.

This is report items A2 and A1, shipped as one product. Comparison is the thing a planner pays for. Fan-out is how the next brief reaches hotels.

| | |
|---|---|
| Who pays | Independent planners, agencies, in-house event teams |
| Price | Per brief, or a seat. Comparison is worth paying for before many hotels are connected |
| Case slice | Vercel app. An LLM extracts the brief. `POST /v1/inbox/{token}` files it. `GET /v3/proposals/{uuid}` fills one live row. A second row is a pasted proposal. The grid shows the gaps |
| After submission | Send the same brief to more hotels, email the ones without a token, then add internal approval before anyone signs |

This can take money without an Enterprise plan or a webhook. The buyer already has the proposals. Proposales only receives leads, through the public inbox, so the product sits beside their seller tool.

Use proposals the account itself created, or documents the planner already received. Do not scrape the hotel proposal viewer.

## 2. VAT invoice bridge (after the process)

On accept, map each block's package split (`accommodation`, `food`, `meetingRoom`, `other`) into VAT-correct lines and push the customer, deposit, and invoice into Fortnox, Visma, or Xero. Write the invoice id back and show it on the proposal.

This is report item B3.

| | |
|---|---|
| Who pays | A hotel's finance owner, or their bookkeeper |
| Price | Setup plus a monthly fee per property |
| Case slice | Leave this out of the submission. The free key can `GET` a proposal and preview the lines. It cannot register a Connection |
| After submission | Register the Connection, catch `proposal.invoiceUpdated` and `accepted`, and ship one ledger |

Charge this once one Enterprise hotel can turn a Connection on. The mapping is the part worth keeping from a demo.

## Left for later

| Idea | Why it waits |
|---|---|
| Revenue warehouse and benchmarks (B1) | Needs a webhook history the free key will not give you. Strong later, weak as a first invoice |
| Displacement advisor (B2) | Needs the hotel's rate data and a sidebar Connection |
| Supplier catalogue (B4) | Two cold starts: the hotel and the supplier |
| WhatsApp or voice intake (A4) | Sits next to their inbox widget. Awkward inside this process |
| Mock API server (A5) | Useful as a private test tool. It is not the business |
| Another editor, e-sign, auto-send, or organiser portal | Already the Proposales product |

## What to ship

One link for the case: the planner bench. In the write-up, one short note on the invoice bridge shows the hotel-side gap and records the choice to skip a Connection the free key cannot enable.
