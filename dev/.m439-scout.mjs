// M439 scout. The two-armed signs, grouped by the FIELD each one tests.
//
// M426 left this open: "a census that charged every two-armed sign would either be a wall or a
// false red, so it has to know which is which - and the honest measure there is the FIELD the sign
// is about, not the shape." This scout reads every two-armed sign in the app (a comparison against
// zero with two outcomes) and groups them by the field the comparison tests.
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

// A comparison against zero whose result chooses between two things.
const SIGN = /([A-Za-z_$][\w$.]*)\s*(>=|<=|>|<)\s*0\s*\?/g;

const byField = new Map();
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  stripComments(readFileSync(f, "utf8")).split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(SIGN)) {
      const field = m[1].split(".").pop();
      const key = field;
      if (!byField.has(key)) byField.set(key, []);
      byField.get(key).push({ rel, line: i + 1, op: m[2], text: line.trim().slice(0, 110) });
    }
  });
}

console.log(`fields a two-armed sign tests: ${byField.size}`);
for (const [field, rows] of [...byField.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n=== ${field}  (${rows.length} site(s), ${new Set(rows.map((r) => r.rel)).size} file(s))`);
  for (const r of rows) console.log(`  ${r.rel}:${r.line}  [${r.op} 0]  ${r.text}`);
}
