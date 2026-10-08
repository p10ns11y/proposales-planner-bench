# Filing and email

Scenarios in `e2e/features/filing-email.feature` match tests in `e2e/filing-email.spec.ts` one to one, by title.

A missing email, end date, or end time is an input with Save and Skip. File with no email shows the email input, and Save on that card files. Another filing gap keeps File off. Yes does not file.

## Procedure

1. From the repository root, install with `pnpm install --frozen-lockfile`.
2. Run `pnpm exec playwright test e2e/filing-email.spec.ts`.
3. Run `pnpm exec vitest run tests/filing-guard.test.ts tests/filing.test.ts tests/filing-paths.test.ts`.

The browser scenarios run at 390×844 and 1280×800. The path test uses a counting client and expects one filing call in total.

The procedure passes when those commands exit 0.
