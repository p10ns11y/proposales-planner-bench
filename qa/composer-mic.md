# Composer microphone

The scenario in `e2e/features/composer-mic.feature` matches the test in `e2e/composer-mic.spec.ts` by title.

Speech results are list-like. A browser may expose the speech constructor and then throw on start. A recognition error returns Speak with a short status. Permission denied stays pressable and tries again. The page stub stands in for that browser. The procedure does not open a microphone.

## Procedure

1. From the repository root, install with `pnpm install --frozen-lockfile`.
2. Run `pnpm exec vitest run tests/speech-input.test.ts tests/speech-composer.test.tsx tests/composer-mic-titles.test.ts`.
3. Build with fixture mode and empty `PROPOSALES_API_KEY` and `XAI_API_KEY`, then run `pnpm exec playwright test e2e/composer-mic.spec.ts`.

The procedure passes when those commands exit 0.
