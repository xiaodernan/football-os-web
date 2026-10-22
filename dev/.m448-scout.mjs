// M448 scout: what class strings does the app still spell out more than once?
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const APP_DIRS = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];

const css = readFileSync(join(ROOT, "src", "globals.css"), "utf8");
const themeColours = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));

const isColour = (cls) => {
  const base = cls.includes(":") ? cls.slice(cls.indexOf(":") + 1) : cls;
  const m = base.match(/^(border|bg|text|ring|fill|stroke|shadow|outline|decoration|from|via|to)-([a-z][a-z0-9-]*)(?:\/\d+)?$/);
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

const groups = new Map();
for (const d of APP_DIRS) {
  for (const f of walk(join(ROOT, d))) {
    const text = stripComments(readFileSync(f, "utf8"));
    text.split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/"([^"]*)"/g)) {
        const str = m[1];
        const tokens = str.split(/\s+/).filter(Boolean);
        if (tokens.length < 2) continue;
        if (!tokens.some(isColour)) continue;
        // Skip the palette's own file.
        const rel = f.slice(ROOT.length + 1).replace(/\\/g, "/");
        if (rel === "ui/primitives.tsx") continue;
        if (!groups.has(str)) groups.set(str, []);
        groups.get(str).push(`${rel}:${i + 1}`);
      }
    });
  }
}

const repeated = [...groups.entries()].filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);
console.log(`Class strings with a colour, written more than once: ${repeated.length}\n`);
for (const [str, sites] of repeated) {
  console.log(`[${sites.length}] ${JSON.stringify(str)}`);
  for (const s of sites) console.log(`      ${s}`);
}
