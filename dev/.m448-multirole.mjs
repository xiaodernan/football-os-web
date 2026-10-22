// M448 probe 3: the remaining MULTI-ROLE shapes outside the palette, with their sites.
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

// The palette's own colour sets: what the chip family already owns.
const paletteText = readFileSync(join(ROOT, "ui", "primitives.tsx"), "utf8");
const paletteSets = new Set();
for (const m of paletteText.matchAll(/(\w+):\s*"([^"]+)"/g)) {
  const set = m[2].split(/\s+/).filter((c) => roleOf(c) && !roleOf(c).variant).sort().join(" ");
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
        const plain = tokens.map(roleOf).filter(Boolean).filter((r) => !r.variant);
        const roles = [...new Set(plain.map((r) => r.role))].sort();
        if (roles.length < 2) continue;
        const set = plain.map((r) => r.raw).sort().join(" ");
        if (paletteSets.has(set)) continue;
        if (!groups.has(set)) groups.set(set, { sites: [], example: str });
        groups.get(set).sites.push(`${rel}:${i + 1}`);
      }
    });
  }
}

const repeated = [...groups.entries()].filter(([, g]) => g.sites.length > 1).sort((a, b) => b[1].sites.length - a[1].sites.length);
console.log(`Multi-role colour shapes outside the palette, written more than once: ${repeated.length}\n`);
for (const [set, g] of repeated) {
  console.log(`[${g.sites.length}] ${JSON.stringify(set)}`);
  for (const s of g.sites) console.log(`      ${s}`);
}
