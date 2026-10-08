import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = dirname(here);
const pluginRoot = process.env.LCV_ROOT;
if (!pluginRoot) {
  throw new Error("Set LCV_ROOT to the layout-content-view directory");
}

const require = createRequire(join(appRoot, "package.json"));
const chromiumPath = require("@playwright/test").chromium.executablePath();
const outDir = join(here, "lcv-out");
const rawOut = join(outDir, "raw.json");
mkdirSync(outDir, { recursive: true });

const child = spawn(process.execPath, [join(pluginRoot, "scripts", "probe-web.mjs")], {
  cwd: appRoot,
  env: {
    ...process.env,
    FEATURES_DIR: join(here, "features"),
    ORIGIN: process.env.ORIGIN || "http://localhost:3000",
    LCV_STRESS: "1",
    LCV_OUT: rawOut,
    BRAVE_BETA_PATH: process.env.BRAVE_BETA_PATH || chromiumPath,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stdout.on("data", () => undefined);
child.stderr.on("data", (chunk) => {
  stderr += String(chunk);
});

const exitCode = await new Promise((resolve) => {
  child.on("close", resolve);
});

const report = JSON.parse(readFileSync(rawOut, "utf8"));
rmSync(rawOut);
const sanitized = sanitize(report);
writeFileSync(join(outDir, "summary.json"), `${JSON.stringify(sanitized, null, 2)}\n`);

const paths = Array.isArray(sanitized.paths) ? sanitized.paths : [];
const viewports = Array.isArray(sanitized.viewports) ? sanitized.viewports : [];
const findings = Array.isArray(sanitized.findings) ? sanitized.findings : [];
const errors = Array.isArray(sanitized.errors) ? sanitized.errors : [];

for (const path of paths) {
  for (const viewport of viewports) {
    const rows = findings.filter((row) => row.path === path && viewportId(row) === viewport);
    const problems = errors.filter((row) => row.path === path && row.viewport === viewport);
    const file = join(outDir, `${slug(path)}__${slug(viewport)}.json`);
    writeFileSync(
      file,
      `${JSON.stringify(
        {
          path,
          viewport,
          fails: rows.filter((row) => row.fail).length,
          findings: rows,
          errors: problems,
        },
        null,
        2,
      )}\n`,
    );
  }
}

const failed = findings.filter((row) => row.fail);
const lines = ["path | viewport | fails | kinds"];
for (const path of paths) {
  for (const viewport of viewports) {
    const rows = findings.filter((row) => row.path === path && viewportId(row) === viewport && row.fail);
    const kinds = [...new Set(rows.map((row) => row.kind))].join(", ") || "none";
    lines.push(`${path} | ${viewport} | ${rows.length} | ${kinds}`);
  }
}
writeFileSync(join(outDir, "table.md"), `${lines.join("\n")}\n`);
process.stdout.write(`${lines.join("\n")}\n`);

if (stderr.trim() !== "") {
  process.stderr.write(`${sanitizeText(stderr)}\n`);
}
if (exitCode !== 0 || failed.length > 0 || errors.length > 0) {
  process.exitCode = exitCode === 0 ? 1 : exitCode;
}

function viewportId(row) {
  const viewport = row.viewport;
  if (viewport && typeof viewport === "object" && typeof viewport.id === "string") {
    return viewport.id;
  }
  return typeof viewport === "string" ? viewport : "";
}

function slug(value) {
  return String(value).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root";
}

function sanitize(value) {
  if (typeof value === "string") {
    return sanitizeText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item));
  }
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === "plugin") {
        next[key] = "layout-content-view";
        continue;
      }
      next[key] = sanitize(item);
    }
    return next;
  }
  return value;
}

function sanitizeText(value) {
  return value.replace(/\/(?:home|Users)\/\S+/g, "[path]");
}
