// M429 scout. A union of string literals, declared more than once.
//
// M427 and M428 closed the app's COLOUR vocabularies. The words themselves are a different
// thing: a set of string literals that means one kind of thing - a tone ("good" | "mixed" |
// "bad"), a direction, a kind - declared as a TYPE in more than one place. This scout extracts
// every union of string literals in the app, groups them by their literals, and prints the groups
// that appear more than once.
//
// It is a scout, not a proof.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const ROOTS = ["domain", "data", "lib", "store", "features", "components", "ui", "src", "i18n", "functions"];
const appFiles = ROOTS.flatMap((r) => walk(join(root, r))).filter((f) => /\.(ts|tsx)$/.test(f));

// A union of string literals: `"a" | "b"` (at least two). The literals may be separated by `|`
// with newlines between them.
const UNION = /"[^"\n]+"(?:\s*\|\s*"[^"\n]+")+/g;

const groups = new Map();
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  const lines = readFileSync(f, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(UNION)) {
      const lits = (m[0].match(/"[^"\n]+"/g) || []).map((s) => s.slice(1, -1)).sort();
      const key = lits.join("|");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ rel, line: i + 1, text: line.trim().slice(0, 120) });
    }
  });
}

const multi = [...groups.entries()].filter(([, rows]) => rows.length > 1).sort((a, b) => b[1].length - a[1].length);
console.log(`unions found: ${groups.size}; declared more than once: ${multi.length}`);
for (const [key, rows] of multi) {
  console.log(`\n=== [${key}]  (${rows.length} declarations, ${new Set(rows.map((r) => r.rel)).size} files)`);
  for (const r of rows) console.log(`  ${r.rel}:${r.line}  ${r.text}`);
}
// How many of the single-site groups are a NAMED type and how many are an inline union?
const NAMED = /(?:export\s+)?type\s+[A-Za-z_$][\w$]*\s*=/;
let named = 0, inline = 0;
for (const [, rows] of groups) {
  if (rows.length !== 1) continue;
  if (NAMED.test(rows[0].text)) named++; else inline++;
}
console.log(`\nsingle-site groups: ${named} are a named type, ${inline} are an inline union`);

