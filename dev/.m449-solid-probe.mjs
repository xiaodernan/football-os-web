// M449 probe: the SOLID — a wash and the word that reads on it (the wash's own "-foreground"
// companion). The label is a wash and a word of its OWN colour; the solid is a wash and the word
// that is readable ON it. The census reads a colour only if the theme names it, so a solid whose
// word is `text-white` is invisible to it.
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
  const m = base.match(/^(border|bg|text)-([a-z][a-z0-9-]*)(?:\/\d+)?$/);
  if (!m) return null;
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
const unnamed = [];
for (const d of APP_DIRS) {
  for (const f of walk(join(ROOT, d))) {
    const rel = f.slice(ROOT.length + 1).replace(/\\/g, "/");
    const text = stripComments(readFileSync(f, "utf8"));
    text.split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/"([^"]*)"/g)) {
        const str = m[1];
        const tokens = str.split(/\s+/).filter(Boolean);
        const plain = tokens.map(roleOf).filter(Boolean).filter((c) => !c.variant);
        const wash = plain.find((c) => c.role === "bg");
        const word = plain.find((c) => c.role === "text");
        const border = plain.find((c) => c.role === "border") || (tokens.includes("border") ? { raw: "border", colour: "border" } : null);
        if (!wash || !word || border) continue;
        // The companion: the wash's own "-foreground" partner.
        const companion = `${wash.colour}-foreground`;
        if (word.colour === companion) {
          if (!groups.has(str)) groups.set(str, []);
          groups.get(str).push(`${rel}:${i + 1}`);
        } else if (!themeColours.has(word.colour) && word.raw === "text-white" && themeColours.has(wash.colour)) {
          // A solid whose word the theme does not name: the reader cannot see it.
          unnamed.push(`${rel}:${i + 1}  ${JSON.stringify(str)}`);
        }
      }
    });
  }
}

console.log("=== solids the theme can name ===");
for (const [str, sites] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  [${sites.length}] ${JSON.stringify(str)}`);
  for (const s of sites) console.log(`        ${s}`);
}
const total = [...groups.values()].reduce((s, v) => s + v.length, 0);
console.log(`→ ${total} site(s) across ${groups.size} distinct string(s)`);
console.log("\n=== solids whose word the theme does NOT name (invisible to the reader) ===");
for (const u of unnamed) console.log(`  ${u}`);
