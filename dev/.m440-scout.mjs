// M440 scout. The app's COLOUR classes: one vocabulary or several?
//
// M427 and M428 closed two colour MAPS (a difference's three classes, a tone's three). What is
// left is the vocabulary those maps are made of: the app's own class names. This scout reads
// every "text-*" class in the app and groups them by class, so a reader can see whether the same
// meaning wears the same class everywhere.
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

// A class that says something about a VALUE: text-success, text-destructive, text-muted-foreground.
const CLASS = /\b(text-(?:success|destructive|info|warning|primary|foreground|muted-foreground|muted))\b/g;

const byClass = new Map();
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  stripComments(readFileSync(f, "utf8")).split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(CLASS)) {
      const key = m[1];
      if (!byClass.has(key)) byClass.set(key, []);
      byClass.get(key).push(`${rel}:${i + 1}`);
    }
  });
}

console.log(`colour classes in the app: ${byClass.size}`);
for (const [cls, sites] of [...byClass.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const files = new Set(sites.map((s) => s.split(":")[0]));
  console.log(`\n=== ${cls}  (${sites.length} site(s), ${files.size} file(s))`);
  for (const s of sites.slice(0, 12)) console.log(`  ${s}`);
}
