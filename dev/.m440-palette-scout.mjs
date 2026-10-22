// M440 scout. The app's PALETTE: does every colour class it wears exist in the theme?
//
// A Tailwind class the theme does not define is an INVISIBLE class: the rule is never emitted, so
// the element renders unstyled and nothing says so. This scout reads the theme's colour names out
// of src/globals.css and the app's colour classes out of the source, and reports the ones the
// theme does not define.
//
// It is a scout, not a proof.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The theme's colours: the --color-<name> definitions.
const css = readFileSync(join(root, "src", "globals.css"), "utf8");
const themeColours = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
console.log(`theme colours: ${themeColours.size} — ${[...themeColours].sort().join(", ")}`);

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const ROOTS = ["domain", "data", "lib", "store", "features", "components", "ui", "src", "i18n", "functions"];
const appFiles = ROOTS.flatMap((r) => walk(join(root, r))).filter((f) => /\.(ts|tsx)$/.test(f));

// A colour class: a Tailwind utility whose colour name is a theme name. The utility prefixes the
// app uses for colour are text-, bg-, border-, from-, to-, via-, ring-, fill-, stroke-, shadow-.
const UTIL = /\b(?:text|bg|border|from|to|via|ring|fill|stroke|shadow|outline|divide|accent|caret|decoration)-([a-z][a-z0-9-]*)/g;

const used = new Map();
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  const src = readFileSync(f, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split(/\r?\n/)
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");
  for (const m of src.matchAll(UTIL)) {
    const name = m[1];
    // A class with a modifier keeps only the part before the slash; a size or a fraction is not a
    // colour ("text-[10px]", "bg-primary/10" -> "primary", "border-t" -> "t").
    const base = name.split("/")[0];
    if (!used.has(base)) used.set(base, []);
    used.get(base).push(`${rel}:${src.slice(0, m.index).split("\n").length}`);
  }
}

const unknown = [...used.entries()].filter(([name]) => !themeColours.has(name)).sort();
console.log(`\ncolour names the app uses: ${used.size}; of those, ${unknown.length} the theme does not define:`);
for (const [name, sites] of unknown) {
  console.log(`  ${name}  (${sites.length} site(s)): ${sites.slice(0, 4).join(", ")}`);
}
