// M440 scout #4. The CHIP family, by class SET: every class string that names a border colour
// and a word colour, wherever it sits.
//
// A chip names a border colour and a word colour (a tone chip also names a wash). The census
// compares SETS, not strings, because the order of the classes in an attribute does not change
// what is painted.
//
// It is a scout, not a proof.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const css = readFileSync(join(root, "src", "globals.css"), "utf8");
const theme = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const ROOTS = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];
const appFiles = ROOTS.flatMap((r) => walk(join(root, r))).filter((f) => /\.(ts|tsx)$/.test(f));

const strip = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split(/\r?\n/).map((l) => l.replace(/\/\/.*$/, "")).join("\n");

/** The colour a class names: `hover:border-primary/40` names `primary`, `text-xs` names nothing. */
const colourOf = (cls) => {
  const base = cls.includes(":") ? cls.slice(cls.indexOf(":") + 1) : cls;
  const m = base.match(/^(?:border|bg|text)-([a-z][a-z0-9-]*)(?:\/\d+)?$/);
  return m && theme.has(m[1]) ? m[1] : null;
};

const chipOf = (str) => {
  const tokens = str.split(/\s+/).filter(Boolean);
  let border = null, word = null, wash = null;
  for (const t of tokens) {
    const base = t.includes(":") ? t.slice(t.indexOf(":") + 1) : t;
    const c = colourOf(t);
    if (!c) continue;
    if (base.startsWith("border-") && !border) border = c;
    else if (base.startsWith("text-") && !word) word = c;
    else if (base.startsWith("bg-") && !wash) wash = c;
  }
  if (!border || !word) return null;
  const roles = { border, word, wash: wash ?? null };
  const key = [...tokens].sort().join(" ");
  return { key, roles };
};

const bySet = new Map();
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  const src = strip(readFileSync(f, "utf8"));
  src.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(/"([^"]*)"/g)) {
      const str = m[1];
      if (!str.includes("border-") || !str.includes("text-")) continue;
      const chip = chipOf(str);
      if (!chip) continue;
      if (!bySet.has(chip.key)) bySet.set(chip.key, { roles: chip.roles, sites: [] });
      bySet.get(chip.key).sites.push(`${rel}:${i + 1}`);
    }
  });
}

console.log(`chip sets: ${bySet.size}`);
for (const [key, { roles, sites }] of [...bySet.entries()].sort((a, b) => b[1].sites.length - a[1].sites.length)) {
  console.log(`\n=== "${key}"  (${sites.length} site(s))  border=${roles.border} word=${roles.word} wash=${roles.wash}`);
  for (const s of sites.slice(0, 20)) console.log(`  ${s}`);
}
