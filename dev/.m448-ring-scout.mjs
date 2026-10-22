// M448 scout: the FOURTH colour role. The chip census reads border-, bg- and text-. A class can
// also carry a colour in a role the census does not see: ring-, shadow-, from-, to-, via-, fill-,
// stroke-, outline-, decoration-. This measures how many such strings the app writes out.
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const APP_DIRS = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];

const css = readFileSync(join(ROOT, "src", "globals.css"), "utf8");
const themeColours = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));

// The roles the chip census already reads.
const SEEN = new Set(["border", "bg", "text"]);
// The roles it does not.
const OTHER = ["ring", "shadow", "from", "via", "to", "fill", "stroke", "outline", "decoration", "accent", "caret", "divide"];

const roleOf = (cls) => {
  const base = cls.includes(":") ? cls.slice(cls.indexOf(":") + 1) : cls;
  const m = base.match(/^([a-z]+)-([a-z][a-z0-9-]*)(?:\/\d+)?$/);
  if (!m) return null;
  return { role: m[1], colour: m[2], base };
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
    const text = stripComments(readFileSync(f, "utf8"));
    text.split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/"([^"]*)"/g)) {
        const str = m[1];
        const tokens = str.split(/\s+/).filter(Boolean);
        const other = tokens.map(roleOf).filter(Boolean).filter((r) => OTHER.includes(r.role) && themeColours.has(r.colour));
        if (!other.length) continue;
        if (!groups.has(str)) groups.set(str, { sites: [], roles: [...new Set(other.map((r) => r.role))] });
        groups.get(str).sites.push(`${rel}:${i + 1}`);
      }
    });
  }
}

const repeated = [...groups.entries()].filter(([, g]) => g.sites.length > 1).sort((a, b) => b[1].sites.length - a[1].sites.length);
console.log(`Strings carrying a colour in an UNREAD role, written more than once: ${repeated.length}\n`);
for (const [str, g] of repeated) {
  console.log(`[${g.sites.length}] (${g.roles.join(",")}) ${JSON.stringify(str)}`);
  for (const s of g.sites) console.log(`      ${s}`);
}
const singles = [...groups.entries()].filter(([, g]) => g.sites.length === 1);
console.log(`\nWritten once: ${singles.length} string(s)`);
for (const [str, g] of singles.slice(0, 12)) console.log(`  (${g.roles.join(",")}) ${JSON.stringify(str)}`);
