// M447 probe: what strings does each candidate rule catch, and where?
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const APP_DIRS = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];

const css = readFileSync(join(ROOT, "src", "globals.css"), "utf8");
const themeColours = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
console.log("theme colours:", [...themeColours].join(", "));

const colourClass = (cls) => {
  const variant = cls.includes(":");
  const base = variant ? cls.slice(cls.indexOf(":") + 1) : cls;
  const m = base.match(/^(border|bg|text)-([a-z][a-z0-9-]*)(?:\/(\d+))?$/);
  if (!m || !themeColours.has(m[2])) return null;
  return { raw: cls, variant, role: m[1], colour: m[2], opacity: m[3] ? Number(m[3]) : null };
};
const colourClasses = (str) => str.split(/\s+/).filter(Boolean).map(colourClass).filter(Boolean);

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

const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, (s) => s.replace(/[^\n]/g, " ")).replace(/\/\/[^\n]*/g, (s) => " ".repeat(s.length));

const strings = [];
for (const d of APP_DIRS) {
  for (const f of walk(join(ROOT, d))) {
    const text = stripComments(readFileSync(f, "utf8"));
    text.split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/"([^"]*)"/g)) strings.push({ file: f.slice(ROOT.length + 1).replace(/\\/g, "/"), line: i + 1, str: m[1] });
    });
  }
}

const report = (name, pred) => {
  const hits = strings.filter((s) => pred(s.str));
  const groups = new Map();
  for (const h of hits) {
    const key = h.str;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(`${h.file}:${h.line}`);
  }
  console.log(`\n=== ${name} — ${groups.size} distinct string(s), ${hits.length} site(s) ===`);
  for (const [k, v] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  [${v.length}] ${JSON.stringify(k)}`);
    for (const site of v) console.log(`        ${site}`);
  }
};

// RULE A: wash + word, no border (any colours)
report("A · wash + word, no border", (str) => {
  const c = colourClasses(str).filter((x) => !x.variant);
  const border = c.find((x) => x.role === "border");
  const wash = c.find((x) => x.role === "bg");
  const word = c.find((x) => x.role === "text");
  return !border && wash && word;
});

// RULE B: wash + word, no border, wash and word the SAME colour
report("B · wash + word, no border, same colour", (str) => {
  const c = colourClasses(str).filter((x) => !x.variant);
  const border = c.find((x) => x.role === "border");
  const wash = c.find((x) => x.role === "bg");
  const word = c.find((x) => x.role === "text");
  return !border && wash && word && wash.colour === word.colour;
});

// RULE C: full-strength border + wash of that colour, no word
report("C · full-strength border + wash, no word", (str) => {
  const c = colourClasses(str).filter((x) => !x.variant);
  const border = c.find((x) => x.role === "border");
  const wash = c.find((x) => x.role === "bg");
  const word = c.find((x) => x.role === "text");
  return border && wash && !word && border.colour === wash.colour && border.opacity === null;
});

// RULE D: any border + wash of that colour, no word
report("D · any border + wash, no word", (str) => {
  const c = colourClasses(str).filter((x) => !x.variant);
  const border = c.find((x) => x.role === "border");
  const wash = c.find((x) => x.role === "bg");
  const word = c.find((x) => x.role === "text");
  return border && wash && !word && border.colour === wash.colour;
});
