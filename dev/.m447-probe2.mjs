// M447 probe 2: the final rule set.
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const APP_DIRS = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];

const css = readFileSync(join(ROOT, "src", "globals.css"), "utf8");
const themeColours = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));

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
const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, (s) => s.replace(/[^\n]/g, " ")).replace(/\/\/[^\n]*/g, (s) => " ".repeat(s.length));

const strings = [];
for (const d of APP_DIRS) {
  for (const f of walk(join(ROOT, d))) {
    const text = stripComments(readFileSync(f, "utf8"));
    text.split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/"([^"]*)"/g)) strings.push({ file: f.slice(ROOT.length + 1).replace(/\\/g, "/"), line: i + 1, str: m[1] });
    });
  }
}

const NEUTRAL = new Set(["muted", "secondary"]);
const SURFACE = new Set(["background", "card", "popover", "sidebar", "accent", "border", "input", "ring"]);

const shapeOf = (str) => {
  const c = colourClasses(str).filter((x) => !x.variant);
  const border = c.find((x) => x.role === "border");
  const wash = c.find((x) => x.role === "bg");
  const word = c.find((x) => x.role === "text");
  if (border && wash && word && border.colour === word.colour && wash.colour === border.colour) return "tone";
  if (border && word && border.colour === "border" && word.colour === "muted-foreground") return "muted";
  if (!border && wash && word && NEUTRAL.has(wash.colour) && word.colour === "muted-foreground" && !SURFACE.has(wash.colour)) return "muted";
  if (border && word && border.colour === word.colour && !(wash && wash.colour === border.colour)) return "badge";
  if (!border && wash && word && wash.colour === word.colour) return "label";
  if (border && wash && !word && border.colour === wash.colour && border.opacity === null) return "mark";
  const hoverBorder = colourClasses(str).find((x) => x.variant && x.role === "border");
  if (!border && word && word.colour === "muted-foreground" && hoverBorder && hoverBorder.colour === "primary") return "rest";
  return null;
};

const report = (name, want) => {
  const groups = new Map();
  for (const s of strings) {
    if (shapeOf(s.str) !== want) continue;
    if (!groups.has(s.str)) groups.set(s.str, []);
    groups.get(s.str).push(`${s.file}:${s.line}`);
  }
  console.log(`\n=== ${name} (${want}) — ${groups.size} distinct, ${[...groups.values()].flat().length} site(s) ===`);
  for (const [k, v] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  [${v.length}] ${JSON.stringify(k)}`);
    for (const site of v) console.log(`        ${site}`);
  }
};

for (const s of ["tone", "muted", "badge", "rest", "label", "mark"]) report("shape", s);
report("shape", null);
