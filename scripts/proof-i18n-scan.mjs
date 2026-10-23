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

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

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

for (const r of rows) console.log(`  UNKEYED ${r.file}:${r.line} [${r.kind}] ${r.snippet}`);
ok(`the raw-string scan reads the feature tree and finds no unkeyed copy (${files.length} feature files, ${rows.length} candidate(s))`,
  rows.length === 0 && files.length >= 20);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
