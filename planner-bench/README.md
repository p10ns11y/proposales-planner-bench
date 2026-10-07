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

Set `PROPOSALES_MODE=live` and `PROPOSALES_API_KEY`. Leave both unset to stay on the fixture. The key is added later, outside this repo.

## Model

With no gateway credential, every turn stays on the scripted extractor. A non-empty `AI_GATEWAY_API_KEY`, a `VERCEL_OIDC_TOKEN`, or `VERCEL=1` tries the model. Any gateway error falls back to the scripted extractor, so the screen still returns a brief and rows.

`PLANNER_MODEL` overrides the default `openai/gpt-4.1-mini`.

On Vercel, set the project root to `planner-bench`. Fixture mode needs no secrets. When the deployment can use Vercel OIDC, the gateway is treated as usable even without `AI_GATEWAY_API_KEY`.

Speech uses the browser speech API when the browser has it. Typing always works.

Keys stay in server environment variables. Do not commit `.env` files.
