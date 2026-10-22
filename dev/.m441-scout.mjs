// M441 scout. A threshold with TWO names.
//
// The threshold census (scripts/proof-thresholds.mjs) reads comparisons against a NUMERIC LITERAL.
// A comparison against a NAMED constant is invisible to it — and a named constant is the app's
// best practice, because a threshold that lives in one constant cannot drift. But two constants
// with the same value are two names for one threshold, and those drift apart silently.
//
// This scout reads the app's numeric constants, groups them by value, and reports the values that
// carry more than one name.
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

const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split(/\r?\n/)
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");

// A constant whose value is a number: `const NAME = 5;` or `export const NAME = 0.6;`
const CONST = /(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?=\s*(-?\d+(?:\.\d+)?)\s*;/g;

const byValue = new Map();
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  const src = stripComments(readFileSync(f, "utf8"));
  src.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(CONST)) {
      const [, name, value] = m;
      const key = String(Number(value));
      if (!byValue.has(key)) byValue.set(key, []);
      byValue.get(key).push({ name, rel, line: i + 1 });
    }
  });
}

const multi = [...byValue.entries()].filter(([, rows]) => rows.length > 1).sort((a, b) => b[1].length - a[1].length);
console.log(`numeric constants: ${[...byValue.values()].reduce((s, r) => s + r.length, 0)} over ${byValue.size} values; ${multi.length} values carry more than one name:`);
for (const [value, rows] of multi) {
  console.log(`\n=== ${value}  (${rows.length} names)`);
  for (const r of rows) console.log(`  ${r.name}  ${r.rel}:${r.line}`);
}
