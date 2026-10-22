// M451: proof gate — scan features/ for raw user-visible English strings not wrapped in t()
// Every new screen must add its visible strings to i18n/dictionaries.ts via t().
// Run standalone: node scripts/proof-i18n-scan.mjs
// Also picked up by scripts/run-proofs.mjs as part of `npm run proof`.
import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".");
const TARGET = join(ROOT, "features");
const TSX = /\.tsx?$/;

const skipAttrs = new Set([
  "className", "class", "style", "href", "src", "id", "name", "value", "type",
  "onClick", "onChange", "onSubmit", "data-testid", "onKeyDown",
]);

const attrRe = /(placeholder|title|alt|aria-label)\s*=\s*"([^"]*)"/g;
const textRe = />([^<]{4,})</g;
// JS expression hints: a JSX text node holding these is code, not user-visible copy.
const codeHint = /=>|==|!=|<=|>=|&&|\|\||\?\s*\w|\.\s*(map|filter|find|reduce|forEach|some|every)\s*\(|["'`].*["'`]|\([^)]{0,40}\)|^\s*[A-Za-z_$][\w$.]*\s*$|\w+\s*:\s*\w+/;

let failures = 0;

function walk(dir, out) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (TSX.test(f)) out.push(p);
  }
  return out;
}

const files = walk(TARGET, []);
const rows = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(textRe)) {
      const snippet = m[1].trim();
      if (codeHint.test(snippet)) continue;
      if (/[a-zA-Z]/.test(snippet) && !snippet.includes("{") && !snippet.includes("}")) {
        rows.push({ file: file.slice(ROOT.length + 1), line: i + 1, kind: "text", snippet: snippet.slice(0, 100) });
      }
    }
    for (const m of line.matchAll(attrRe)) {
      const [, attr, val] = m;
      if (skipAttrs.has(attr)) continue;
      if (codeHint.test(val)) continue;
      if (/[a-zA-Z]/.test(val)) {
        rows.push({ file: file.slice(ROOT.length + 1), line: i + 1, kind: `attr:${attr}`, snippet: val.slice(0, 100) });
      }
    }
  });
}

console.log(`i18n-scan: scanned ${files.length} feature files, ${rows.length} raw-string candidates`);
for (const r of rows) {
  failures += 1;
  console.log(`  UNKEYED ${r.file}:${r.line} [${r.kind}] ${r.snippet}`);
}
if (failures === 0) {
  console.log("i18n-scan: PROVEN — no raw user-visible English strings outside t()");
  process.exit(0);
}
console.log(`i18n-scan: FAIL — ${failures} candidate(s) need t() keys`);
process.exit(1);
