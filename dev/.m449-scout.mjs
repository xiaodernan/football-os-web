// M449 scout: the app's PROGRESS BAR — a groove and a fill. M448's note named it the next family:
// the groove is the same groove in three washes, and the fill wears a colour that MEANS something
// (success = mastered, info = confidence, warning = low).
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

// A GROOVE is a wash on a bar-shaped element: a class string with a height class (h-1.5, h-2),
// a rounded shape and a wash. A FILL is a wash on a full-height child of one.
const isBarHeight = (tok) => /^h-(0\.5|1|1\.5|2|2\.5|3)$/.test(tok);
const isBarWidth = (tok) => /^(w-|flex-1|absolute|relative|inset-y-0)/.test(tok);

const grooves = new Map();
const fills = new Map();
for (const d of APP_DIRS) {
  for (const f of walk(join(ROOT, d))) {
    const rel = f.slice(ROOT.length + 1).replace(/\\/g, "/");
    if (rel === "ui/primitives.tsx") continue;
    const text = stripComments(readFileSync(f, "utf8"));
    text.split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/"([^"]*)"/g)) {
        const str = m[1];
        const tokens = str.split(/\s+/).filter(Boolean);
        const classes = tokens.map(roleOf).filter(Boolean).filter((c) => !c.variant);
        const wash = classes.find((c) => c.role === "bg");
        if (!wash) continue;
        const hasHeight = tokens.some(isBarHeight);
        const hasFull = tokens.includes("h-full");
        if (!hasHeight && !hasFull) continue;
        const bucket = hasFull ? fills : grooves;
        if (!bucket.has(str)) bucket.set(str, []);
        bucket.get(str).push(`${rel}:${i + 1}`);
      }
    });
  }
}

const report = (name, bucket) => {
  const repeated = [...bucket.entries()].filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);
  console.log(`\n=== ${name} — ${repeated.length} string(s) written more than once ===`);
  for (const [str, sites] of repeated) {
    console.log(`  [${sites.length}] ${JSON.stringify(str)}`);
    for (const s of sites) console.log(`        ${s}`);
  }
  const total = repeated.reduce((s, x) => s + x[1].length, 0);
  console.log(`  → ${total} site(s)`);
};
report("GROOVE", grooves);
report("FILL", fills);
