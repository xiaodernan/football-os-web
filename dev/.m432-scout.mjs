// M432 scout. A vocabulary written as a TYPE and as a LIST.
//
// M431 named the vocabularies; the census it wrote reads a union of string literals. But a set of
// words can also be written as an ARRAY, and the app does both for the same set: a type and a
// list, spelling the same words twice. This scout finds every array of string literals, groups
// them by their words, and prints the groups that also appear as a union.
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

const UNION = /"[^"\n]+"(?:\s*\|\s*"[^"\n]+")+/g;
// An array of string literals: ["a", "b", "c"]
const ARRAY = /\[\s*"[^"\n]+"(?:\s*,\s*"[^"\n]+")*\s*\]/g;

const unions = new Map();
const arrays = new Map();
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  const lines = stripComments(readFileSync(f, "utf8")).split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(UNION)) {
      const lits = (m[0].match(/"[^"\n]+"/g) || []).map((s) => s.slice(1, -1)).sort();
      const key = lits.join("|");
      if (!unions.has(key)) unions.set(key, []);
      unions.get(key).push(`${rel}:${i + 1}`);
    }
    for (const m of line.matchAll(ARRAY)) {
      const lits = (m[0].match(/"[^"\n]+"/g) || []).map((s) => s.slice(1, -1)).sort();
      const key = lits.join("|");
      if (!arrays.has(key)) arrays.set(key, []);
      arrays.get(key).push(`${rel}:${i + 1}`);
    }
  });
}

const both = [...unions.keys()].filter((k) => arrays.has(k));
console.log(`unions: ${unions.size}; arrays: ${arrays.size}; the same words as BOTH: ${both.length}`);
for (const k of both) {
  console.log(`\n=== [${k}]`);
  console.log(`  as a union: ${unions.get(k).join(", ")}`);
  console.log(`  as a list:  ${arrays.get(k).join(", ")}`);
}
console.log(`\narrays whose words are written nowhere else: ${[...arrays.keys()].filter((k) => !unions.has(k)).length}`);
const multiArrays = [...arrays.entries()].filter(([, rows]) => rows.length > 1);
console.log(`\narray groups written more than once: ${multiArrays.length}`);
for (const [k, rows] of multiArrays) {
  console.log(`  [${k}]  ${rows.join(", ")}`);
}
