# Planner bench

An event planner files a brief and compares venue proposals on one grid.

Fixture mode is the default. It makes no network calls. Set `PROPOSALES_MODE=live` and `PROPOSALES_API_KEY` to use the Proposales HTTP API. With no model key, the agent route uses a scripted agent that calls the same tools.

Proposal pages are never scraped. Offers come from the Proposales API or from text the planner pastes.

Keys stay in server environment variables. Do not commit `.env` files.
