import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { skipReason } from "../scripts/lib/appTree.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NOT_APP = ["node_modules", "dist", "football-os", "test-results", "vendor", "tests"];
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? (skipReason(e.name, join(d, e.name), NOT_APP) ? [] : walk(join(d, e.name))) : [join(d, e.name)]);
const JS_EXT = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const files = walk(root).map((f) => f.slice(root.length + 1).split("\\").join("/")).filter((f) => JS_EXT.has(extname(f).toLowerCase()));

for (const rel of files) {
  const text = readFileSync(join(root, rel), "utf8");
  const kind = rel.endsWith(".tsx") ? ts.ScriptKind.TSX : rel.endsWith(".jsx") ? ts.ScriptKind.JSX
    : /\.[mc]?ts$/.test(rel) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind);
  const d = sf.parseDiagnostics ?? [];
  if (d.length) {
    for (const x of d) {
      const { line, character } = sf.getLineAndCharacterOfPosition(x.start);
      console.log(`${rel}:${line + 1}:${character + 1} ${ts.flattenDiagnosticMessageText(x.messageText, " ")}`);
    }
  }
}
