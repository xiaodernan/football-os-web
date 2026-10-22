// M442 scout. The BADGE family: a border and a word of one colour, with no wash.
//
// The chip (M441) is a border, a wash and a word. A badge is a border and a word, with NO wash of
// its own - and the app spells those out too: the same amber badge in seven places, the same green
// badge in five.
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
const dirs = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];
const files = dirs.flatMap((d) => walk(join(root, d))).filter((f) => /\.(ts|tsx)$/.test(f));

const colour = (cls) => {
  const base = cls.includes(":") ? cls.slice(cls.indexOf(":") + 1) : cls;
  const m = base.match(/^(border|bg|text)-([a-z][a-z0-9-]*)(?:\/\d+)?$/);
  return m && theme.has(m[2]) ? { role: m[1], colour: m[2], raw: cls } : null;
};

const groups = new Map();
for (const f of files) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  const text = readFileSync(f, "utf8");
  text.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(/"([^"]*)"/g)) {
      const str = m[1];
      if (!str.includes("border-") || !str.includes("text-")) continue;
      const cs = str.split(/\s+/).filter(Boolean).map(colour).filter(Boolean);
      const plain = cs.filter((c) => !c.raw.includes(":"));
      const border = plain.find((c) => c.role === "border");
      const word = plain.find((c) => c.role === "text");
      const wash = plain.find((c) => c.role === "bg");
      if (!border || !word) continue;
      if (border.colour !== word.colour) continue;      // the same colour, or it is not this family
      if (wash && wash.colour === border.colour) continue; // that is the chip (M441)
      const id = cs.map((c) => c.raw).sort().join(" ");
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(`${rel}:${i + 1}`);
    }
  });
}

console.log(`badge sets: ${groups.size}`);
for (const [id, sites] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n=== "${id}"  (${sites.length} site(s))`);
  for (const s of sites) console.log(`  ${s}`);
}
