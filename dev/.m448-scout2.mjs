// M448 scout 2: a summary of the repeated colour strings, grouped by shape.
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
  const m = base.match(/^(border|bg|text|ring)-([a-z][a-z0-9-]*)(?:\/\d+)?$/);
  if (!m || !themeColours.has(m[2])) return null;
  return { role: m[1], colour: m[2], variant: cls.includes(":") };
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
        if (tokens.length < 2) continue;
        const roles = tokens.map(roleOf).filter(Boolean).filter((r) => !r.variant);
        if (!roles.length) continue;
        const kinds = [...new Set(roles.map((r) => r.role))].sort().join("+");
        if (!groups.has(str)) groups.set(str, { sites: [], kinds });
        groups.get(str).sites.push(`${rel}:${i + 1}`);
      }
    });
  }
}

const byKind = new Map();
for (const [str, g] of groups) {
  if (g.sites.length < 2) continue;
  if (!byKind.has(g.kinds)) byKind.set(g.kinds, []);
  byKind.get(g.kinds).push([str, g.sites]);
}

for (const [kinds, list] of [...byKind].sort((a, b) =>
  b[1].reduce((s, x) => s + x[1].length, 0) - a[1].reduce((s, x) => s + x[1].length, 0))) {
  const total = list.reduce((s, x) => s + x[1].length, 0);
  console.log(`\n=== ${kinds} — ${list.length} distinct string(s), ${total} site(s) ===`);
  for (const [str, sites] of list.sort((a, b) => b[1].length - a[1].length).slice(0, 12)) {
    console.log(`  [${sites.length}] ${JSON.stringify(str)}`);
  }
  if (list.length > 12) console.log(`  …and ${list.length - 12} more`);
}
