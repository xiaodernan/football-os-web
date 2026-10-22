// M448 probe 5: the panel's COLOUR set (the border and the wash), with the full strings and sites.
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const APP_DIRS = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];

const css = readFileSync(join(ROOT, "src", "globals.css"), "utf8");
const themeColours = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const SURFACES = new Set(["background", "card", "popover", "sidebar", "accent", "secondary"]);

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

const colourSets = new Map(); // colour set -> { full strings -> sites }
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
        const bareBorder = tokens.includes("border");
        if ((!border && !bareBorder) || !wash || word) continue;
        if (!SURFACES.has(wash.colour)) continue;
        // The panel's colour set: the wash, plus the border if the border was a colour.
        const set = [wash.raw, border ? border.raw : "border"].sort().join(" ");
        if (!colourSets.has(set)) colourSets.set(set, new Map());
        const byString = colourSets.get(set);
        if (!byString.has(str)) byString.set(str, []);
        byString.get(str).push(`${rel}:${i + 1}`);
      }
    });
  }
}

console.log("=== panel colour sets ===");
for (const [set, byString] of [...colourSets].sort((a, b) =>
  [...b[1].values()].reduce((s, v) => s + v.length, 0) - [...a[1].values()].reduce((s, v) => s + v.length, 0))) {
  const total = [...byString.values()].reduce((s, v) => s + v.length, 0);
  console.log(`\n${JSON.stringify(set)} — ${byString.size} string(s), ${total} site(s)`);
  for (const [str, sites] of [...byString].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   [${sites.length}] ${JSON.stringify(str)}`);
    for (const s of sites) console.log(`         ${s}`);
  }
}
