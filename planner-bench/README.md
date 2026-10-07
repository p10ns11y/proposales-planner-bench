# Planner bench

One line names a city, a date and time, and how many people. The bench confirms those facts, then ranks venues. More stays closed until it is opened. The fields inside it edit the rest of the brief.

## Fixture mode

This is the default. It needs no keys and makes no network calls. The ranked rows come from the fixture.

```bash
cd planner-bench
pnpm install
pnpm dev
```

Open the app at localhost port 3000. The address 127.0.0.1 does not hydrate.

A line such as this reaches confirm, then the match:

`I need a place in Stockholm for 40 people on 12 November 2026, from 09:00 to 17:00, with dinner and a meeting room.`

Say yes, then skip favorites. Three ranked rows appear. Filing still needs an email. Add it under More, then say `file`.

## Live Proposales

Copy `.env.example` to `.env.local` in `planner-bench/` and set the values there. Leave the mode unset to stay on the fixture.

```
PROPOSALES_MODE=live
PROPOSALES_API_KEY=
```

Put the API key in `PROPOSALES_API_KEY`. Do not commit `.env.local`.

Restart `pnpm dev`, then open localhost port 3000. Use the same Stockholm line, confirm, and skip favorites. Company lookup and filing use the live API. When the account has proposals, those rows are live Proposales data and the screen says `Live offers`. A title that ends with ` (demo venue)` is shown without that suffix, and the total is the sum of each block's package split times its quantity. The account company name is not used as a venue name. If the search is empty or the live load fails, the rows are sample offers and the screen says `Sample offers`. If company lookup fails, ranking still runs and the screen says `Filing is unavailable right now.` A failed filing stays on that sentence and does not say a draft was created. Under More, set Email and Language, save, and say `file`. Leave Event name empty to title the draft with the city and date, or set Event name to use that instead. The screen says `A draft was created in Proposales.`

Leave `XAI_API_KEY` and `PLANNER_MODEL` empty to keep the scripted extractor.

## API contract

The committed spec is `src/contract/openapi.json`. Contract tests turn that file into Zod schemas with `@adaptate/utils`. Those schemas stay in the tests. At runtime, `src/proposales/http-client.ts` checks responses with tolerant readers, because real responses carry nulls and loose URLs or emails.

## Model

Grok runs through xAI only when `XAI_API_KEY` is set on the server. The default model id is `grok-4.7`. `PLANNER_MODEL` overrides that id. A missing key, a model error, or a timeout falls back to the scripted extractor within about 40 seconds. Brief extraction requests low reasoning effort. A Vercel deploy without `XAI_API_KEY` stays scripted.

On Vercel, set the project root to `planner-bench`. Fixture mode needs no secrets.

Speech uses the browser speech API when the browser has it. Typing always works.

Keys stay in server environment variables. Do not commit `.env` files.

## References

- Grok Bot desktop app screenshots supplied for this redesign (the chat column, the card inside a reply, and the right-panel header). These are the primary visual source.
- Vercel AI Elements: https://ai-sdk.dev/elements (Conversation, Tool, Artifact, Prompt Input, Shimmer, Suggestion), captured 2026-10-07.
- shadcn/ui: https://ui.shadcn.com/docs/components/sheet, /dialog, and /skeleton, captured 2026-10-07.
- grok.com public logged-out landing, captured 2026-10-07.
- Instrument Sans: https://fonts.google.com/specimen/Instrument+Sans (OFL).
- Method notes live with the reference pack in `docs/design-refs/REFERENCE-PACK.md`.
- Refero and Mobbin were connected but paywalled at the time of writing; no content from them is included.
- No brand is copied wholesale. Coral and greys are adapted roles, and no Grok or xAI logo or wordmark is used in the app.
