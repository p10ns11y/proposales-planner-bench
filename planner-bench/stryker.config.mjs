const strykerConfig = {
  testRunner: "command",
  commandRunner: {
    command:
      "./node_modules/.bin/vitest run --bail=1 --reporter=dot tests/fitness.test.ts tests/day-part.test.ts tests/brief-flow.test.ts tests/compare-offers.test.ts tests/http-readers.test.ts tests/crap-score.test.ts tests/critical-path-titles.test.ts tests/filing-guard.test.ts tests/speech-input.test.ts tests/more-update.test.ts tests/facts-line.test.ts tests/client-snapshot.test.ts",
  },
  mutate: [
    "src/domain/fitness.ts",
    "src/domain/compare-offers.ts",
    "src/flow/brief-flow.ts",
    "src/domain/day-part.ts",
    "src/proposales/http-client.ts",
    "src/flow/brief-language.ts",
    "src/flow/filing-guard.ts",
    "src/views/file-brief-state.ts",
    "src/views/speech-input.ts",
    "src/views/more-update.ts",
    "src/view-models/facts-line.ts",
    "src/flow/client-company.ts",
  ],
  coverageAnalysis: "off",
  reporters: ["json", "clear-text"],
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  thresholds: { high: 95, low: 95, break: null },
  concurrency: 4,
  timeoutMS: 60_000,
  dryRunTimeoutMinutes: 2,
  ignorePatterns: [
    ".next",
    "coverage",
    "reports",
    "e2e/lcv-out",
    "test-results",
    "playwright-report",
    "blob-report",
    ".stryker-tmp",
  ],
  tempDirName: ".stryker-tmp",
  cleanTempDir: true,
  symlinkNodeModules: true,
};

export default strykerConfig;
