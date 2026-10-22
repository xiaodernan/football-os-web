// M449 probe: can the app's QUIET WORD (text-muted-foreground, 448 sites) be folded through cn()
// without changing what is painted? cn() runs tailwind-merge, which RESOLVES conflicts between
// classes — so folding a string through cn() is only safe if the merged result equals the original.
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const APP_DIRS = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];

const css = readFileSync(join(ROOT, "src", "globals.css"), "utf8");
const themeColours = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));

const isColour = (cls) => {
  const base = cls.includes(":") ? cls.slice(cls.indexOf(":") + 1) : cls;
  const m = base.match(/^(border|bg|text)-([a-z][a-z0-9-]*)(?:\/\d+)?$/);
  return !!m && themeColours.has(m[2]);
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

const cn = (...a) => twMerge(clsx(a));

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
        // The quiet word: the plain, unsoftened muted word, with no other plain colour class.
        const plain = tokens.filter((c) => isColour(c) && !c.includes(":"));
        if (plain.length !== 1 || plain[0] !== "text-muted-foreground") continue;
        if (!groups.has(str)) groups.set(str, []);
        groups.get(str).push(`${rel}:${i + 1}`);
      }
    });
  }
}

let total = 0;
let changed = 0;
const examples = [];
for (const [str, sites] of groups) {
  total += sites.length;
  const tokens = str.split(/\s+/).filter(Boolean);
  const rest = tokens.filter((c) => c !== "text-muted-foreground");
  const merged = cn(...rest, "text-muted-foreground");
  if (merged !== str) {
    changed += sites.length;
    if (examples.length < 12) examples.push({ str, merged, n: sites.length });
  }
}
console.log(`Strings carrying the quiet word alone: ${groups.size} distinct, ${total} site(s).`);
console.log(`Sites whose class string cn() would CHANGE: ${changed}`);
for (const e of examples) console.log(`  [${e.n}] ${JSON.stringify(e.str)}\n     -> ${JSON.stringify(e.merged)}`);

// The quiet word NEXT TO another plain colour class: those are not a lone word, and the census
// does not see them as one.
const withOther = new Map();
for (const d of APP_DIRS) {
  for (const f of walk(join(ROOT, d))) {
    const rel = f.slice(ROOT.length + 1).replace(/\\/g, "/");
    if (rel === "ui/primitives.tsx") continue;
    const text = stripComments(readFileSync(f, "utf8"));
    text.split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/"([^"]*)"/g)) {
        const str = m[1];
        const tokens = str.split(/\s+/).filter(Boolean);
        const plain = tokens.filter((c) => isColour(c) && !c.includes(":"));
        if (!plain.includes("text-muted-foreground")) continue;
        if (plain.length === 1) continue;
        if (!withOther.has(str)) withOther.set(str, []);
        withOther.get(str).push(`${rel}:${i + 1}`);
      }
    });
  }
}
const otherTotal = [...withOther.values()].reduce((s, v) => s + v.length, 0);
console.log(`\nStrings carrying the quiet word NEXT TO another colour: ${withOther.size} distinct, ${otherTotal} site(s).`);
for (const [str, sites] of [...withOther].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  [${sites.length}] ${JSON.stringify(str)}`);
}
