// M440 scout. The same NUMBER, used as a FACTOR in two places.
//
// The threshold census (scripts/proof-thresholds.mjs) reads COMPARISONS against a numeric literal.
// A number the app MULTIPLIES by is not a comparison, so it is invisible to that gate — and a
// factor spelled twice is the same drift risk as a bound spelled twice: a "10% above the asking
// price" rule in one screen and "1.1x" in another.
//
// This scout reads every numeric literal in the app and reports the values that appear in more
// than one file, so a human can judge which of them are one decision.
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

// A number in the code, not in a string.
const NUMBER = /(?<![\w.$])(\d+(?:\.\d+)?)(?![\w.])/g;

const byValue = new Map();
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  const src = stripComments(readFileSync(f, "utf8"));
  src.split(/\r?\n/).forEach((line, i) => {
    // A number inside a string is copy, not a number the app computes with.
    const code = line.replace(/"[^"]*"/g, '""');
    for (const m of code.matchAll(NUMBER)) {
      const value = String(Number(m[1]));
      if (value === "0" || value === "1" || value === "2") continue;
      if (!byValue.has(value)) byValue.set(value, []);
      byValue.get(value).push({ rel, line: i + 1, text: line.trim().slice(0, 110) });
    }
  });
}

const multi = [...byValue.entries()].filter(([, rows]) => new Set(rows.map((r) => r.rel)).size > 1)
  .sort((a, b) => b[1].length - a[1].length);
console.log(`numbers the app computes with, in more than one file: ${multi.length}`);
for (const [value, rows] of multi) {
  console.log(`\n=== ${value}  (${rows.length} site(s), ${new Set(rows.map((r) => r.rel)).size} file(s))`);
  for (const r of rows.slice(0, 10)) console.log(`  ${r.rel}:${r.line}  ${r.text}`);
}
