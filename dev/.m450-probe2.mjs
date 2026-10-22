// M450 probe 2: the distinct FILL washes the app's own code wears (the vendor's components/ui
// is the starter's, and it is measured apart).
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

const app = new Map();
const vendor = new Map();
for (const d of APP_DIRS) {
  for (const f of walk(join(ROOT, d))) {
    const rel = f.slice(ROOT.length + 1).replace(/\\/g, "/");
    if (rel === "ui/primitives.tsx") continue;
    const bucket = rel.startsWith("components/") ? vendor : app;
    const text = stripComments(readFileSync(f, "utf8"));
    text.split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/"([^"]*)"/g)) {
        const str = m[1];
        const tokens = str.split(/\s+/).filter(Boolean);
        const plain = tokens.map(roleOf).filter(Boolean).filter((c) => !c.variant);
        if (plain.length !== 1 || plain[0].role !== "bg") continue;
        if (tokens.includes("border") || plain.some((c) => c.role === "border")) continue;
        const wash = plain[0].raw;
        if (!bucket.has(wash)) bucket.set(wash, []);
        bucket.get(wash).push(`${rel}:${i + 1}`);
      }
    });
  }
}

console.log("=== the app's own fills ===");
for (const [wash, sites] of [...app].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  [${sites.length}] ${wash}`);
}
console.log(`→ ${app.size} distinct wash(es), ${[...app.values()].reduce((s, v) => s + v.length, 0)} site(s)`);
console.log("\n=== the starter's own fills ===");
for (const [wash, sites] of [...vendor].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  [${sites.length}] ${wash}  (${sites.slice(0, 2).join(", ")}${sites.length > 2 ? ", …" : ""})`);
}
console.log(`→ ${vendor.size} distinct wash(es), ${[...vendor.values()].reduce((s, v) => s + v.length, 0)} site(s)`);
