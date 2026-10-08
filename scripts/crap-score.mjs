import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const scope = [
  { file: "src/domain/fitness.ts" },
  {
    file: "src/domain/compare-offers.ts",
    functions: [
      "rankComparisonRows",
      "compareRankedRows",
      "compareWithinCurrency",
      "currencyMatches",
      "normaliseCurrency",
      "orderText",
    ],
  },
  { file: "src/flow/brief-flow.ts" },
  { file: "src/domain/day-part.ts" },
  { file: "src/proposales/http-client.ts" },
  { file: "src/proposales/file-with-intent.ts" },
  { file: "src/flow/brief-language.ts" },
  { file: "src/flow/filing-guard.ts" },
  { file: "src/views/file-brief-state.ts" },
  { file: "src/views/speech-input.ts" },
  { file: "src/views/more-update.ts" },
  { file: "src/view-models/facts-line.ts" },
  { file: "src/flow/client-company.ts" },
  { file: "src/flow/planner-snapshot.ts", functions: ["emptySnapshot", "snapshotForClient"] },
];

const branchKinds = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CatchClause,
  ts.SyntaxKind.ConditionalExpression,
  ts.SyntaxKind.CaseClause,
]);

export function crap(comp, cov) {
  return comp ** 2 * (1 - cov) ** 3 + comp;
}

function isFunctionLike(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

function isNamed(node) {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)) {
    return true;
  }
  if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
    return true;
  }
  const parent = node.parent;
  return Boolean(
    parent &&
      (ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent)),
  );
}

function functionName(node, parentName) {
  if (ts.isConstructorDeclaration(node)) {
    return parentName ? `${parentName}.constructor` : "constructor";
  }
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  ) {
    const name = node.name ? node.name.getText() : "anonymous";
    return parentName ? `${parentName}.${name}` : name;
  }
  const parent = node.parent;
  if (parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parentName ? `${parentName}.${parent.name.text}` : parent.name.text;
  }
  if (parent && (ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent)) && parent.name) {
    const name = parent.name.getText();
    return parentName ? `${parentName}.${name}` : name;
  }
  return parentName ? `${parentName}.anonymous` : "anonymous";
}

export function cyclomatic(node) {
  let score = 1;
  function visit(current) {
    if (current !== node && isFunctionLike(current)) {
      return;
    }
    if (current !== node) {
      if (branchKinds.has(current.kind)) {
        score += 1;
      }
      if (ts.isBinaryExpression(current)) {
        const operator = current.operatorToken.kind;
        if (
          operator === ts.SyntaxKind.AmpersandAmpersandToken ||
          operator === ts.SyntaxKind.BarBarToken ||
          operator === ts.SyntaxKind.QuestionQuestionToken
        ) {
          score += 1;
        }
      }
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return score;
}

export function functionComplexity(sourceText, fileName = "sample.ts") {
  const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found = [];
  function walk(node, parentName) {
    if (isFunctionLike(node) && isNamed(node)) {
      const name = functionName(node, parentName);
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
      found.push({ name, comp: cyclomatic(node), start, end });
      ts.forEachChild(node, (child) => walk(child, name));
      return;
    }
    ts.forEachChild(node, (child) => walk(child, parentName));
  }
  walk(sourceFile, "");
  return found;
}

function shortName(name) {
  const parts = name.split(".");
  return parts[parts.length - 1] ?? name;
}

function loadSource(file) {
  const absolute = path.join(root, file);
  return functionComplexity(readFileSync(absolute, "utf8"), absolute);
}

function selectTargets() {
  const selected = [];
  for (const item of scope) {
    const functions = loadSource(item.file);
    const wanted = item.functions;
    if (!wanted) {
      for (const fn of functions) {
        selected.push({ ...fn, file: item.file });
      }
      continue;
    }
    for (const name of wanted) {
      const matches = functions.filter((fn) => fn.name === name || shortName(fn.name) === name);
      if (matches.length === 0) {
        throw new Error(`unknown function ${name} in ${item.file}`);
      }
      for (const fn of matches) {
        selected.push({ ...fn, file: item.file });
      }
    }
  }
  return selected;
}

function runCoverage() {
  const args = [
    "exec",
    "vitest",
    "run",
    "--coverage.enabled",
    "true",
    "--coverage.provider",
    "v8",
    "--coverage.reporter",
    "json",
    "--coverage.reportsDirectory",
    "coverage/crap",
  ];
  for (const item of scope) {
    args.push("--coverage.include", item.file);
  }
  return spawnSync("pnpm", args, { cwd: root, encoding: "utf8", env: process.env });
}

function statementOwner(functions, line) {
  const containers = functions.filter((fn) => line >= fn.start && line <= fn.end);
  containers.sort((left, right) => left.end - left.start - (right.end - right.start));
  return containers[0];
}

function coverageByFunction(report, functions) {
  const covered = new Map(functions.map((fn) => [`${fn.file}:${fn.name}:${fn.start}`, { hit: 0, total: 0 }]));
  for (const entry of Object.values(report)) {
    const file = scope
      .map((item) => item.file)
      .find((relative) => String(entry.path ?? "").endsWith(relative));
    if (!file) {
      continue;
    }
    const locals = functions.filter((fn) => fn.file === file);
    const statements = entry.statementMap ?? {};
    const hits = entry.s ?? {};
    for (const [id, span] of Object.entries(statements)) {
      const line = span?.start?.line;
      if (typeof line !== "number") {
        continue;
      }
      const owner = statementOwner(locals, line);
      if (!owner) {
        continue;
      }
      const bucket = covered.get(`${owner.file}:${owner.name}:${owner.start}`);
      if (!bucket) {
        continue;
      }
      bucket.total += 1;
      if ((hits[id] ?? 0) > 0) {
        bucket.hit += 1;
      }
    }
  }
  return covered;
}

function readReport() {
  const file = path.join(root, "coverage/crap/coverage-final.json");
  return JSON.parse(readFileSync(file, "utf8"));
}

function scoreFunctions(functions, covered) {
  return functions.map((fn) => {
    const bucket = covered.get(`${fn.file}:${fn.name}:${fn.start}`) ?? { hit: 0, total: 0 };
    const ratio = bucket.total === 0 ? 0 : bucket.hit / bucket.total;
    return {
      file: fn.file,
      name: fn.name,
      comp: fn.comp,
      cov: ratio,
      crap: crap(fn.comp, ratio),
    };
  });
}

function parseArgs(argv) {
  let max = 6;
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      json = true;
    } else if (arg === "--max") {
      max = Number(argv[index + 1]);
      index += 1;
    }
  }
  if (!Number.isFinite(max)) {
    throw new Error("invalid --max");
  }
  return { max, json };
}

function sanitize(text) {
  return text.replace(/\/(?:home|Users)\/\S+/g, "[path]").replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

export function scoreTree(report) {
  const functions = selectTargets();
  const rows = scoreFunctions(functions, coverageByFunction(report, functions));
  const worst = rows.reduce((best, row) => (row.crap > best.crap ? row : best), rows[0]);
  return { rows, worst };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let functions;
  try {
    functions = selectTargets();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "scope failed"}\n`);
    return 2;
  }
  const coverage = runCoverage();
  if (coverage.status !== 0) {
    process.stderr.write("coverage suite failed\n");
    const detail = sanitize(`${coverage.stdout ?? ""}\n${coverage.stderr ?? ""}`).trim();
    if (detail !== "") {
      process.stderr.write(`${detail.slice(-2000)}\n`);
    }
    return 2;
  }
  let report;
  try {
    report = readReport();
  } catch {
    process.stderr.write("coverage missing\n");
    return 2;
  }
  const rows = scoreFunctions(functions, coverageByFunction(report, functions));
  const worst = rows.reduce((best, row) => (row.crap > best.crap ? row : best), rows[0]);
  const names = [...new Set(rows.map((row) => shortName(row.name)))].sort();
  const payload = {
    ok: worst !== undefined && worst.crap <= args.max,
    threshold: args.max,
    worst: worst ? { file: worst.file, name: worst.name, crap: Number(worst.crap.toFixed(2)) } : null,
    functions: rows.map((row) => ({
      file: row.file,
      name: row.name,
      comp: row.comp,
      cov: Number(row.cov.toFixed(4)),
      crap: Number(row.crap.toFixed(2)),
    })),
  };
  if (args.json) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  } else {
    process.stdout.write(`scope=functions functions=${names.join(",")}\n`);
    for (const row of rows) {
      process.stdout.write(
        `${row.file} ${row.name}: comp=${row.comp} cov=${row.cov.toFixed(2)} crap=${row.crap.toFixed(2)}\n`,
      );
    }
    process.stdout.write(
      `worst=${worst ? `${worst.file} ${worst.name}` : ""} crap_max=${worst ? worst.crap.toFixed(2) : "0.00"} threshold=${args.max}\n`,
    );
  }
  return payload.ok ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exit(main());
}
