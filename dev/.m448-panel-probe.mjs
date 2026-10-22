// M448 probe: the PANEL — a border and a wash of a SURFACE colour, with no word of its own.
// M447's rule says a wash of a surface colour is a panel, not a label. This measures the panels.
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const APP_DIRS = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];

const css = readFileSync(join(ROOT, "src", "globals.css"), "utf8");
const themeColours = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const SURFACES = new Set(["background", "card", "popover", "sidebar", "accent"]);

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
        const plain = tokens.map(roleOf).filter(Boolean).filter((r) => !r.variant);
        const border = plain.find((r) => r.role === "border");
        const wash = plain.find((r) => r.role === "bg");
        const word = plain.find((r) => r.role === "text");
        if (!border || !wash || word) continue;
        if (!SURFACES.has(wash.colour)) continue;
        if (!groups.has(str)) groups.set(str, []);
        groups.get(str).push(`${rel}:${i + 1}`);
      }
    });
  }
}

const repeated = [...groups.entries()].filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);
console.log(`PANEL strings (a border + a surface wash, no word) written more than once: ${repeated.length}\n`);
for (const [str, sites] of repeated) {
  console.log(`[${sites.length}] ${JSON.stringify(str)}`);
  for (const s of sites) console.log(`      ${s}`);
}
const total = repeated.reduce((s, x) => s + x[1].length, 0);
console.log(`\n${total} site(s) across ${repeated.length} distinct panel string(s).`);
const singles = [...groups.entries()].filter(([, v]) => v.length === 1);
console.log(`Written once: ${singles.length} string(s).`);
for (const [str] of singles.slice(0, 10)) console.log(`  ${JSON.stringify(str)}`);
