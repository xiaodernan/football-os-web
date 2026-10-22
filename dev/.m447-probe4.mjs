// M447 probe 4: the FINAL rule set.
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const APP_DIRS = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];

const css = readFileSync(join(ROOT, "src", "globals.css"), "utf8");
const themeColours = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const SEMANTIC = new Set(["primary", "success", "warning", "info", "destructive", "muted", "secondary", "sidebar-primary"]);

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

const labelOf = (str) => {
  const c = colourClasses(str).filter((x) => !x.variant);
  const border = c.find((x) => x.role === "border");
  const wash = c.find((x) => x.role === "bg");
  const word = c.find((x) => x.role === "text");
  if (border || !wash || !word) return null;
  if (!SEMANTIC.has(wash.colour)) return null;
  if (word.colour !== wash.colour && word.colour !== "muted-foreground" && word.colour !== "foreground") return null;
  return true;
};
const markOf = (str) => {
  const c = colourClasses(str).filter((x) => !x.variant);
  const border = c.find((x) => x.role === "border");
  const wash = c.find((x) => x.role === "bg");
  const word = c.find((x) => x.role === "text");
  if (!border || !wash || word) return null;
  if (border.colour !== wash.colour) return null;
  if (border.opacity !== null) return null;
  if (!SEMANTIC.has(border.colour)) return null;
  return true;
};

const report = (name, pred) => {
  const groups = new Map();
  for (const s of strings) {
    if (!pred(s.str)) continue;
    if (!groups.has(s.str)) groups.set(s.str, []);
    groups.get(s.str).push(`${s.file}:${s.line}`);
  }
  console.log(`\n=== ${name} — ${groups.size} distinct, ${[...groups.values()].flat().length} site(s) ===`);
  for (const [k, v] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  [${v.length}] ${JSON.stringify(k)}`);
    for (const site of v) console.log(`        ${site}`);
  }
};
report("LABEL", labelOf);
report("MARK", markOf);
