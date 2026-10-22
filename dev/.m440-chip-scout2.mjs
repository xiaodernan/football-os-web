// M440 scout #2. The same CHIP classes, written twice — without the identifier-key requirement.
//
// The app's colour MAPS (a review kind's classes, a transfer stance's classes, a scout bucket's
// classes) each name a class string, and a class string inside a ternary is just as much a
// spelling as one inside a map. This scout reads every quoted class string and groups them.
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

// A quoted class string of two or more classes.
const ENTRY = /"((?:[a-z0-9:/.\[\]-]+ )+[a-z0-9:/.\[\]-]+)"/g;

const byString = new Map();
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  const src = stripComments(readFileSync(f, "utf8"));
  src.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(ENTRY)) {
      const key = m[1].replace(/\s+/g, " ").trim();
      if (!key.startsWith("border-") && !key.startsWith("bg-") && !key.startsWith("text-")) continue;
      if (!byString.has(key)) byString.set(key, []);
      byString.get(key).push(`${rel}:${i + 1}`);
    }
  });
}

const multi = [...byString.entries()].filter(([, rows]) => rows.length > 1).sort((a, b) => b[1].length - a[1].length);
console.log(`class strings: ${byString.size}; written more than once: ${multi.length}`);
for (const [str, rows] of multi) {
  console.log(`\n=== "${str}"  (${rows.length} site(s))`);
  for (const r of rows) console.log(`  ${r}`);
}
