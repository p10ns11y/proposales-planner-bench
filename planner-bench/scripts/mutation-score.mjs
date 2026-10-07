import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "src/domain/fitness.ts",
  "src/domain/compare-offers.ts",
  "src/flow/brief-flow.ts",
  "src/domain/day-part.ts",
  "src/proposales/http-client.ts",
  "src/flow/brief-language.ts",
  "src/flow/filing-guard.ts",
  "src/views/file-brief-state.ts",
  "src/view-models/facts-line.ts",
];
const detected = new Set(["Killed", "Timeout", "RuntimeError"]);
const counted = new Set(["Killed", "Timeout", "RuntimeError", "Survived", "NoCoverage"]);
const minimum = 0.95;

function parseArgs(argv) {
  return { json: argv.includes("--json"), min: minimum };
}

function sanitize(text) {
  return text.replace(/\/(?:home|Users)\/\S+/g, "[path]").replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

function fileRows(report) {
  const entries = report.files ?? {};
  return files.map((file) => {
    const key = Object.keys(entries).find((item) => item.endsWith(file));
    const mutants = key === undefined ? [] : (entries[key].mutants ?? []);
    let killed = 0;
    let total = 0;
    for (const mutant of mutants) {
      if (!counted.has(mutant.status)) {
        continue;
      }
      total += 1;
      if (detected.has(mutant.status)) {
        killed += 1;
      }
    }
    return {
      file,
      killed,
      total,
      score: total === 0 ? null : killed / total,
    };
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const run = spawnSync("pnpm", ["exec", "stryker", "run", "stryker.config.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  if (run.error) {
    process.stderr.write("stryker missing\n");
    return 2;
  }
  let report;
  try {
    report = JSON.parse(readFileSync(path.join(root, "reports/mutation/mutation.json"), "utf8"));
  } catch {
    process.stderr.write("mutation report missing\n");
    const detail = sanitize(`${run.stdout ?? ""}\n${run.stderr ?? ""}`).trim();
    if (detail !== "") {
      process.stderr.write(`${detail.slice(-2000)}\n`);
    }
    return 2;
  }
  const rows = fileRows(report);
  if (rows.some((row) => row.total === 0)) {
    process.stderr.write("no mutants\n");
    return 2;
  }
  const payload = {
    ok: rows.every((row) => row.score !== null && row.score >= args.min),
    threshold: args.min,
    files: rows.map((row) => ({
      file: row.file,
      score: Number((row.score ?? 0).toFixed(4)),
      killed: row.killed,
      mutants: row.total,
    })),
  };
  if (args.json) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  } else {
    for (const row of payload.files) {
      process.stdout.write(
        `${row.file}: mutation_score=${row.score.toFixed(2)} mutants=${row.mutants} killed=${row.killed}\n`,
      );
    }
    const killed = rows.reduce((sum, row) => sum + row.killed, 0);
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    process.stdout.write(
      `mutation_score=${(killed / total).toFixed(2)} mutants=${total} killed=${killed} threshold=${args.min}\n`,
    );
  }
  return payload.ok ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exit(main());
}
