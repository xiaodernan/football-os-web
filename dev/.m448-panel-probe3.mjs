// M448 probe 4: which SURFACE set gives a clean, thick PANEL family?
// A panel is a border (a bare `border` class, or a border colour) and a wash of a surface colour,
// with no word of its own. The bare `border` class IS the border colour, so the reader must see it.
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
  const m = base.match(/^(border|bg|text)-([a-z][a-z0-9-]*)(?:\/(\d+))?$/);
  if (!m || !themeColours.has(m[2])) return null;
  return { raw: cls, role: m[1], colour: m[2], strength: m[3] ? Number(m[3]) : null, variant: cls.includes(":") };
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

const CANDIDATES = {
  "card-only": new Set(["card"]),
  "card+bg": new Set(["card", "background"]),
  "card+bg+popover+sidebar": new Set(["card", "background", "popover", "sidebar"]),
  "card+bg+popover+sidebar+accent": new Set(["card", "background", "popover", "sidebar", "accent"]),
  "card+bg+popover+sidebar+accent+secondary": new Set(["card", "background", "popover", "sidebar", "accent", "secondary"]),
  "card+bg+popover+sidebar+accent+secondary+muted": new Set(["card", "background", "popover", "sidebar", "accent", "secondary", "muted"]),
};

const all = [];
for (const d of APP_DIRS) {
  for (const f of walk(join(ROOT, d))) {
    const rel = f.slice(ROOT.length + 1).replace(/\\/g, "/");
    if (rel === "ui/primitives.tsx") continue;
    const text = stripComments(readFileSync(f, "utf8"));
    text.split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/"([^"]*)"/g)) {
        const str = m[1];
        const tokens = str.split(/\s+/).filter(Boolean);
        const plain = tokens.map(roleOf).filter(Boolean).filter((r) => !r.variant);
        const border = plain.find((r) => r.role === "border");
        const wash = plain.find((r) => r.role === "bg");
        const word = plain.find((r) => r.role === "text");
        const hasBorder = !!border || tokens.includes("border");
        all.push({ str, tokens, border, wash, word, hasBorder, site: `${rel}:${i + 1}` });
      }
    });
  }
}

for (const [name, surfaces] of Object.entries(CANDIDATES)) {
  const groups = new Map();
  for (const s of all) {
    if (!s.hasBorder || !s.wash || s.word) continue;
    if (!surfaces.has(s.wash.colour)) continue;
    if (!groups.has(s.str)) groups.set(s.str, []);
    groups.get(s.str).push(s.site);
  }
  const repeated = [...groups.entries()].filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);
  const total = repeated.reduce((s, x) => s + x[1].length, 0);
  console.log(`\n=== ${name} — ${repeated.length} distinct string(s), ${total} site(s) ===`);
  for (const [str, sites] of repeated.slice(0, 8)) console.log(`  [${sites.length}] ${JSON.stringify(str)}`);
}
