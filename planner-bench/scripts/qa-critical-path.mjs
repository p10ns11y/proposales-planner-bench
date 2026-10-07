import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function criticalPathTitles(appRoot = root) {
  const feature = readFileSync(path.join(appRoot, "e2e/features/critical-path.feature"), "utf8");
  const spec = readFileSync(path.join(appRoot, "e2e/critical-path.spec.ts"), "utf8");
  const scenarios = [...feature.matchAll(/^\s*Scenario:\s*(.+?)\s*$/gm)].map((match) => match[1] ?? "");
  const tests = [...spec.matchAll(/^test\(\s*"([^"]+)"/gm)].map((match) => match[1] ?? "");
  const ok = scenarios.length > 0 && scenarios.join("\n") === tests.join("\n");
  return { scenarios, tests, ok };
}

function fixtureEnv(base) {
  return {
    ...base,
    CI: "true",
    PROPOSALES_MODE: "fixture",
    PROPOSALES_API_KEY: "",
    XAI_API_KEY: "",
  };
}

function run(command, args, env) {
  return spawnSync(command, args, { cwd: root, env, encoding: "utf8" });
}

function main() {
  const paired = criticalPathTitles(root);
  if (!paired.ok) {
    process.stderr.write("critical path titles do not match\n");
    return 1;
  }
  const env = fixtureEnv(process.env);
  const build = run("pnpm", ["build"], env);
  if (build.status !== 0) {
    process.stderr.write("build failed\n");
    return build.status ?? 1;
  }
  const e2e = run("pnpm", ["exec", "playwright", "test", "e2e/critical-path.spec.ts"], env);
  if (e2e.status !== 0) {
    process.stderr.write(e2e.stdout ?? "");
    process.stderr.write(e2e.stderr ?? "");
    return e2e.status ?? 1;
  }
  process.stdout.write("critical path passed\n");
  return 0;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exit(main());
}
