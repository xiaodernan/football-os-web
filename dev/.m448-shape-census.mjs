// M448 census: the app's remaining colour SHAPES, by the set of colour classes they carry.
// A shape is what the chip census charges: a set of colour classes, order-insensitive. The chip
// family is folded; this asks what is left, and how thick each shape is.
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const APP_DIRS = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];

const css = readFileSync(join(ROOT, "src", "globals.css"), "utf8");
const themeColours = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));

const roleOf = (cls) => {
  const base = cls.includes(":") ? cls.slice(cls.indexOf(":") + 1) : cls;
  const m = base.match(/^(border|bg|text)-([a-z][a-z0-9-]*)(?:\/\d+)?$/);
  if (!m || !themeColours.has(m[2])) return null;
  return { raw: cls, role: m[1], colour: m[2], variant: cls.includes(":") };
};

function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}
const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, (s) => s.replace(/[^\n]/g, " ")).replace(/\/\/[^\n]*/g, (s) => " ".repeat(s.length));

// The palette's own colour sets: what the chip family already owns.
const paletteText = readFileSync(join(ROOT, "ui", "primitives.tsx"), "utf8");
const paletteSets = new Set();
for (const m of paletteText.matchAll(/(\w+):\s*"([^"]+)"/g)) {
  const set = m[2].split(/\s+/).filter((c) => roleOf(c) && !roleOf(c).variant).map((c) => c).sort().join(" ");
  if (set) paletteSets.add(set);
}

const groups = new Map();
for (const d of APP_DIRS) {
  for (const f of walk(join(ROOT, d))) {
    const rel = f.slice(ROOT.length + 1).replace(/\\/g, "/");
    if (rel === "ui/primitives.tsx") continue;
    const text = stripComments(readFileSync(f, "utf8"));
    text.split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/"([^"]*)"/g)) {
        const str = m[1];
        const tokens = str.split(/\s+/).filter(Boolean);
        const set = tokens.filter((c) => roleOf(c) && !roleOf(c).variant).sort().join(" ");
        if (!set) continue;
        if (!groups.has(set)) groups.set(set, { sites: [], example: str });
        groups.get(set).sites.push(`${rel}:${i + 1}`);
      }
    });
  }
}

const rows = [...groups.entries()]
  .map(([set, g]) => ({ set, n: g.sites.length, inPalette: paletteSets.has(set), sites: g.sites }))
  .filter((r) => r.n > 1)
  .sort((a, b) => b.n - a.n);

console.log(`Repeated colour shapes outside the palette: ${rows.length}\n`);
for (const r of rows) {
  const roles = r.set.split(" ").map((c) => c.split("-")[0]).filter((v, i, a) => a.indexOf(v) === i).sort().join("+");
  console.log(`[${r.n}] ${r.inPalette ? "IN-PALETTE" : "outside   "} (${roles}) ${JSON.stringify(r.set)}`);
}
const total = rows.reduce((s, r) => s + r.n, 0);
console.log(`\n${total} site(s) across ${rows.length} repeated shape(s).`);
const outside = rows.filter((r) => !r.inPalette);
console.log(`${outside.length} shape(s) are outside the palette, holding ${outside.reduce((s, r) => s + r.n, 0)} site(s).`);
