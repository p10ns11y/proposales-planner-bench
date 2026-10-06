# Journey — findings and limitations

Short statements of what we learned and where our knowledge stops. Details live in [proposales-report.md](./proposales-report.md), terms in [ontology.md](./ontology.md), the build choice in [review.md](./review.md), and time in [worklog.md](./worklog.md).

## Findings

### The product
- Proposales sells to hotels. Every feature serves one hotel answering demand for groups, meetings, and events.
- Its core idea is that a proposal is structured data, not a PDF. Versioning, e-signature, PMS sync, and AI all follow from that.
- The buyer never needs an account. They view, toggle extras, and sign from a link.
- OPERA Cloud is the deepest integration: sending holds inventory, signing confirms it, and rejecting releases it.
- The Buyer Portal already covers the organiser's side of one event: rooming list, dietary needs, chat, and payments.
- Nothing serves a planner across several venues. There is no fan-out of one brief and no side-by-side comparison.
- No accounting or ERP connectors are listed. We confirmed this with a Firecrawl scrape of `/connect`.

### The API
- There are 14 endpoints. They read and manage content, create and edit drafts, read proposals, search, and file RFPs.
- The API stops at drafts. There is no endpoint to send, accept, or sign.
- Search returns at most 25 results with no pagination. Any history has to come from webhooks.
- `POST /v1/inbox/{token}` is public and needs no API key. Extra form fields are stored as metadata.
- `inbox_token` comes from `GET /v3/companies` and can be `null`, in which case the inbox endpoint returns 404.
- Webhooks run through a registered Connection, and Proposales calls your server. Registering one needs the Enterprise plan and activation by customer success.
- Money is in the smallest currency unit, and response shapes can gain keys without a version bump.

### The decision
- The brief: sign up free, use the profile API key, host on Vercel, with an LLM as a bonus.
- We chose the **planner bench**: one brief, several proposals, one comparison grid, with an LLM doing extraction and normalisation.
- A rubric and a blind second judge both picked it independently.
- The VAT invoice bridge is the hotel-side follow-up, not the submission.
- One real signup is enough. Use `+` aliases only if a second inbox is truly needed, and never disposable emails.

### The method
- Concordance needs a closed set of labels, two independent judges, a `p_dm` that is a real probability, and a `tau` set in advance.
- Share of rubric points is not a probability. With three options it rarely reaches 0.75, so our first check held for the wrong reason.
- Set `tau` from costs, \( \tau = 1 - H/L \). When a check takes minutes, `tau` is close to 1, so check rather than guess.

## Limitations

### What we did not verify
- Whether a free account has an `inbox_token`. The docs allow `null`, and the pricing page sells the inbox widget as an add-on.
- What the free key can call beyond the documented endpoints, and its rate limits.
- Whether the free signup is a trial and which plan it maps to.
- Whether the Workflows product or the Logic Layer already does things we listed as gaps. Both pages are vague.
- Whether the Buyer Portal or a connected S&C system already produces banquet event orders.

### How we researched
- Firecrawl login timed out at first. Most pages were read with the built-in fetcher and curl, and Firecrawl was used once its key worked.
- The marketing pages are thin, and several reuse the same placeholder blocks. Claims such as "75% conversion" are Proposales' own.
- No demo, no live account, and no API call has been made yet. Everything here comes from docs and the public site.

### How we decided
- My rubric scores are judgment calls, and so is the 0.75 `tau`.
- The concordance card ended on hold. That came from a flawed `p_dm` definition, not from the judges disagreeing.
- The blind judge used the same model family, so it is independent in context but not in model.

## Next
1. Sign up, call `GET /v3/companies`, and record whether `inbox_token` is set.
2. Build the planner bench with the path that matches the result: the inbox endpoint, or saving the brief as a draft.
