// M440 scout #3. The CHIP family, after the fold: what class strings still carry a chip?
//
// A chip is a class string that carries a border class and a text class naming theme colours,
// where the border and the text name the SAME colour (a tone chip) or are the muted pair
// (border + muted-foreground). The tone chip also carries a wash; the muted chip need not.
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

// The classes of a string, with the variant prefix and the opacity suffix taken off.
const classesOf = (str) => str.split(/\s+/).filter(Boolean).map((c) => {
  const base = c.includes(":") ? c.slice(c.indexOf(":") + 1) : c;
  const m = base.match(/^(border|bg|text)-([a-z][a-z0-9-]*)(?:\/\d+)?$/);
  return m ? { role: m[1], colour: m[2] } : null;
}).filter(Boolean);

const isChip = (str) => {
  const cs = classesOf(str);
  const border = cs.find((c) => c.role === "border");
  const text = cs.find((c) => c.role === "text");
  if (!border || !text) return false;
  const same = border.colour === text.colour && theme.has(border.colour);
  const muted = border.colour === "border" && text.colour === "muted-foreground";
  if (!same && !muted) return false;
  if (muted) return true;
  return cs.some((c) => c.role === "bg" && c.colour === border.colour);
};

const byString = new Map();
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  const src = strip(readFileSync(f, "utf8"));
  src.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(/"([^"]*)"/g)) {
      const str = m[1];
      if (!str.includes("border-") || !str.includes("text-")) continue;
      if (!isChip(str)) continue;
      if (!byString.has(str)) byString.set(str, []);
      byString.get(str).push(`${rel}:${i + 1}`);
    }
  });
}

console.log(`chip strings: ${byString.size}`);
for (const [str, sites] of [...byString.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n=== "${str}"  (${sites.length} site(s))`);
  for (const s of sites) console.log(`  ${s}`);
}
