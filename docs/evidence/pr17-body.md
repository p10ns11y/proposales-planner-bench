The app lives at the repository root and now includes main at db1324d.

The drawer is named Add details.

- Merged the filing, speech, drawer, header, currency, and session fixes onto the root.
- The walkthrough opens on ranked venues and stops with Add details visible.
- The README drops the operator lines. References stay credits.
- Evidence: [docs/evidence.md](docs/evidence.md)

Lychee reports 0 errors. CI is the verify job. The Vercel preview fails until cutover.

Risk: production stays on the old root until that setting is cleared.

1. Set the Vercel Root Directory to empty.
2. Merge, wait for the prod deploy, then smoke prod.
3. Rollback: set the Root Directory back to planner-bench and promote the previous deploy.
