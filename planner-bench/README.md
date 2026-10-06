# Planner bench

An event planner files a brief and compares venue proposals on one grid.

Fixture mode is the default. It makes no network calls. Set `PROPOSALES_MODE=live` and `PROPOSALES_API_KEY` to use the Proposales HTTP API. With no `AI_GATEWAY_API_KEY`, the chat uses a scripted agent. Set `PLANNER_MODEL` only if you want a gateway model other than `openai/gpt-4.1-mini`.

In the chat, a line such as `Title Northwind offsite. Organisation Northwind. Email ada@northwind.example. Start 2026-11-12. End 2026-11-12. Attendees 40. Language en. City Stockholm. Meeting rooms 2. Food yes. Notes One plenary and dinner.` fills the brief. Then say `file the brief` and `add the venue proposals`.

Speech uses the browser Web Speech API when it exists. Typing always works.

Proposal pages are never scraped. Offers come from the Proposales API or from text the planner pastes.

Keys stay in server environment variables. Do not commit `.env` files.
