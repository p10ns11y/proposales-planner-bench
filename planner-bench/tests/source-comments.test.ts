import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const sourceRoot = path.resolve(import.meta.dirname, "../src");

function collectTypeScriptFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const filePaths: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      filePaths.push(...collectTypeScriptFiles(fullPath));
      continue;
    }
    if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      filePaths.push(fullPath);
    }
  }
  return filePaths;
}

function commentSnippets(sourceText: string, fileName: string): string[] {
  const scriptKind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const snippets: string[] = [];
  const seenStarts = new Set<number>();

  function record(ranges: readonly ts.CommentRange[] | undefined) {
    if (!ranges) {
      return;
    }
    for (const range of ranges) {
      if (seenStarts.has(range.pos)) {
        continue;
      }
      seenStarts.add(range.pos);
      snippets.push(sourceText.slice(range.pos, range.end));
    }
  }

  function visit(node: ts.Node) {
    record(ts.getLeadingCommentRanges(sourceText, node.getFullStart()));
    record(ts.getTrailingCommentRanges(sourceText, node.getEnd()));
    ts.forEachChild(node, visit);
  }

  record(ts.getLeadingCommentRanges(sourceText, sourceFile.getFullStart()));
  visit(sourceFile);
  return snippets;
}

describe("source comments", () => {
  it("finds no comments in src TypeScript files", () => {
    const offenders = collectTypeScriptFiles(sourceRoot).flatMap((filePath) => {
      const sourceText = readFileSync(filePath, "utf8");
      const snippets = commentSnippets(sourceText, filePath);
      return snippets.map((snippet) => `${path.relative(sourceRoot, filePath)}: ${snippet}`);
    });
    expect(offenders).toEqual([]);
  });

  it("ignores comment-like text inside strings", () => {
    const sourceText = 'const documentationUrl = "https://example.com/docs";\n';
    expect(commentSnippets(sourceText, "sample.ts")).toEqual([]);
  });
});
