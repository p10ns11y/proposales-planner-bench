import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginCommit = "31d93a0355838d8b24511966ae1ba0062c05f012";

function parseArgs(argv) {
  return argv.includes("--skip-mutation") || process.env.VERIFY_SKIP_MUTATION === "1";
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

function sanitize(text) {
  return text.replace(/\/(?:home|Users)\/\S+/g, "[path]").replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

function run(command, args, env) {
  const started = Date.now();
  const result = spawnSync(command, args, { cwd: root, env, encoding: "utf8" });
  return { result, durationMs: Date.now() - started };
}

function stepFrom(name, outcome) {
  const ok = outcome.result.status === 0;
  const step = { name, ok, durationMs: outcome.durationMs };
  const stdout = sanitize(outcome.result.stdout ?? "").trim();
  if (stdout.startsWith("{")) {
    try {
      step.result = JSON.parse(stdout);
    } catch {
      step.detail = stdout.slice(-800);
    }
  }
  if (!ok && step.detail === undefined) {
    const detail = sanitize(`${outcome.result.stdout ?? ""}\n${outcome.result.stderr ?? ""}`).trim();
    if (detail !== "") {
      step.detail = detail.slice(-800);
    }
  }
  return step;
}

function ensurePlugin(env) {
  if (env.LCV_ROOT) {
    return { root: env.LCV_ROOT, cleanup: null };
  }
  const dest = mkdtempSync(path.join(tmpdir(), "lcv-"));
  const clone = spawnSync(
    "git",
    ["clone", "--depth", "1", "--filter=blob:none", "--sparse", "https://github.com/p10ns11y/plugins.git", dest],
    { encoding: "utf8" },
  );
  if (clone.status !== 0) {
    rmSync(dest, { recursive: true, force: true });
    return { error: "layout plugin fetch failed" };
  }
  const checkout = spawnSync("git", ["-C", dest, "sparse-checkout", "set", "layout-content-view"], { encoding: "utf8" });
  const pin = spawnSync("git", ["-C", dest, "checkout", pluginCommit], { encoding: "utf8" });
  if (checkout.status !== 0 || pin.status !== 0) {
    rmSync(dest, { recursive: true, force: true });
    return { error: "layout plugin fetch failed" };
  }
  return {
    root: path.join(dest, "layout-content-view"),
    cleanup: () => rmSync(dest, { recursive: true, force: true }),
  };
}

function waitForApp(port) {
  const started = Date.now();
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      fetch(`http://127.0.0.1:${port}`)
        .then((response) => {
          if (!response.ok) {
            return;
          }
          clearInterval(timer);
          resolve(Date.now() - started);
        })
        .catch(() => undefined);
      if (Date.now() - started > 30_000) {
        clearInterval(timer);
        resolve(null);
      }
    }, 500);
  });
}

async function layoutStep(env) {
  const started = Date.now();
  const plugin = ensurePlugin(env);
  if (plugin.error) {
    return { name: "lcv", ok: false, durationMs: Date.now() - started, detail: plugin.error };
  }
  const server = spawn("pnpm", ["exec", "next", "start", "--hostname", "127.0.0.1", "--port", "3000"], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  server.stdout.on("data", (chunk) => {
    serverLog += String(chunk);
  });
  server.stderr.on("data", (chunk) => {
    serverLog += String(chunk);
  });
  const ready = await waitForApp(3000);
  if (ready === null) {
    server.kill("SIGTERM");
    plugin.cleanup?.();
    return { name: "lcv", ok: false, durationMs: Date.now() - started, detail: sanitize(serverLog).slice(-800) || "app did not become ready" };
  }
  const probe = spawnSync("node", ["e2e/run-probe.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: { ...env, LCV_ROOT: plugin.root, ORIGIN: "http://127.0.0.1:3000" },
  });
  server.kill("SIGTERM");
  plugin.cleanup?.();
  const step = { name: "lcv", ok: probe.status === 0, durationMs: Date.now() - started };
  if (!step.ok) {
    step.detail = sanitize(`${probe.stdout ?? ""}\n${probe.stderr ?? ""}`).trim().slice(-800) || "layout probe failed";
  }
  return step;
}

async function main() {
  const skipMutation = parseArgs(process.argv.slice(2));
  const env = fixtureEnv(process.env);
  const steps = [];
  const unit = stepFrom("unit", run("pnpm", ["exec", "vitest", "run", "--exclude", "tests/contract.test.ts"], env));
  steps.push(unit);
  const contract = stepFrom("contract", run("pnpm", ["exec", "vitest", "run", "tests/contract.test.ts"], env));
  steps.push(contract);
  const build = stepFrom("build", run("pnpm", ["build"], env));
  if (!build.ok) {
    steps.push({ name: "e2e", ok: false, durationMs: build.durationMs, detail: build.detail ?? "build failed" });
  } else {
    steps.push(
      stepFrom(
        "e2e",
        run(
          "pnpm",
          [
            "exec",
            "playwright",
            "test",
            "e2e/critical-path.spec.ts",
            "e2e/filing-email.spec.ts",
            "e2e/composer-mic.spec.ts",
            "e2e/add-details-fold.spec.ts",
            "e2e/run-through.spec.ts",
            "e2e/no-unprompted-file.spec.ts",
            "e2e/result-cards.spec.ts",
          ],
          env,
        ),
      ),
    );
  }
  if (steps.at(-1)?.ok) {
    steps.push(await layoutStep(env));
  } else {
    steps.push({ name: "lcv", ok: false, durationMs: 0, detail: "skipped after e2e" });
  }
  steps.push(stepFrom("crap", run("node", ["scripts/crap-score.mjs", "--json"], env)));
  if (skipMutation) {
    steps.push({ name: "mutation", ok: true, durationMs: 0, skipped: true });
  } else {
    steps.push(stepFrom("mutation", run("node", ["scripts/mutation-score.mjs", "--json"], env)));
  }
  const ok = steps.every((step) => step.ok);
  process.stdout.write(`${JSON.stringify({ ok, steps })}\n`);
  return ok ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exit(await main());
}
