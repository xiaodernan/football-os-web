// M448 probe 2: the app's QUIET SURFACES. A panel is a border (the plain `border` class, or a
// colour) and a wash of a SURFACE colour, with no word of its own. The census has no name for
// these yet — M447's rule says a wash of a surface colour is a panel, not a label — and the app
// writes them out. This measures the panels AND the strengths they wear.
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

const groups = new Map();
const strengths = new Map(); // surface colour -> strength -> sites
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
        const hasBorder = border || tokens.includes("border");
        if (!hasBorder || !wash || word) continue;
        if (!SURFACES.has(wash.colour)) continue;
        if (!groups.has(str)) groups.set(str, []);
        groups.get(str).push(`${rel}:${i + 1}`);
        if (!strengths.has(wash.colour)) strengths.set(wash.colour, new Map());
        const st = wash.strength ?? 100;
        if (!strengths.get(wash.colour).has(st)) strengths.get(wash.colour).set(st, []);
        strengths.get(wash.colour).get(st).push(`${rel}:${i + 1}`);
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

console.log("\n=== the strengths each surface wears ===");
for (const [colour, st] of strengths) {
  const entries = [...st.entries()].sort((a, b) => a[0] - b[0]);
  console.log(`  ${colour}: ${entries.map(([s, v]) => `${s}%×${v.length}`).join(", ")}`);
}
