// M424 scout #2. A number that MEANS something is written in one place.
//
// Every door the project has converged on covers a DECISION: a window, a ladder, a threshold, a
// window of form. A threshold is the smallest of them and the easiest to spell twice: `overall > 80`
// in one module and `overall >= 80` in another is one rule with two answers, and the two answers
// differ by exactly one point.
//
// This scout reads every comparison in the tree that holds a NUMERIC LITERAL, groups them by the
// literal, and prints the groups that appear more than once - so a human can see whether the same
// number is one rule or two.
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

// A comparison against a numeric literal: `x > 80`, `x >= 80`, `x < 12.5`, `x === 0`.
const CMP = /([A-Za-z_$][\w$.]*)\s*(>=|<=|>|<|===|!==|==|!=)\s*(\d+(?:\.\d+)?)\b/g;

const groups = new Map();
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  const src = readFileSync(f, "utf8").split(/\r?\n/);
  src.forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, "");
    for (const m of code.matchAll(CMP)) {
      const [, lhs, op, num] = m;
      const key = `${num}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ rel, line: i + 1, lhs, op, text: line.trim().slice(0, 120) });
    }
  });
}

const multi = [...groups.entries()].filter(([, rows]) => rows.length > 1).sort((a, b) => b[1].length - a[1].length);
console.log(`numeric literals compared against: ${groups.size}; with more than one site: ${multi.length}`);
for (const [num, rows] of multi) {
  const ops = new Set(rows.map((r) => r.op));
  const files = new Set(rows.map((r) => r.rel));
  console.log(`\n=== ${num}  (${rows.length} sites, ${files.size} files, ops: ${[...ops].join(" ")})`);
  for (const r of rows.slice(0, 12)) console.log(`  ${r.rel}:${r.line}  ${r.text}`);
}
