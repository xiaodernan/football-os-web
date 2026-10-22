// M449 check: every folded solid kept its class SET. Reads each changed file from git, rebuilds
// the class set of the string it replaced, and compares it with the set the fold produced.
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const css = readFileSync(join(ROOT, "src", "globals.css"), "utf8");
const themeColours = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const isColour = (cls) => {
  const base = cls.includes(":") ? cls.slice(cls.indexOf(":") + 1) : cls;
  const m = base.match(/^(border|bg|text)-([a-z][a-z0-9-]*)(?:\/\d+)?$/);
  return !!m && themeColours.has(m[2]);
};

const paletteText = readFileSync(join(ROOT, "ui", "primitives.tsx"), "utf8");
const chipBody = paletteText.slice(paletteText.indexOf("export const CHIP_CLASS = {"));
const SOLIDS = new Map();
for (const m of chipBody.matchAll(/(\w+):\s*"([^"]+)"/g)) {
  if (!/^solid/.test(m[1])) continue;
  SOLIDS.set(m[1], m[2].split(/\s+/).filter(Boolean));
}
// Every palette entry as it stood in the COMMITTED file, so a reference in the committed file can
// be resolved to its classes: a rename (labelMuted -> solidMuted) carries the same two classes and
// must be checked as such.
const committedPalette = execSync("git show HEAD:ui/primitives.tsx").toString();
const ALL = new Map();
for (const m of committedPalette.matchAll(/(\w+):\s*"([^"]+)"/g)) ALL.set(m[1], m[2].split(/\s+/).filter(Boolean));

const files = execSync("git diff --name-only features/ components/").toString().trim().split("\n").filter(Boolean);
let problems = 0;
let checked = 0;

for (const f of files) {
  const before = execSync(`git show HEAD:${f}`).toString();
  const after = readFileSync(join(ROOT, f), "utf8");
  const olds = [...before.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  // The committed file's palette references, resolved to their classes.
  const oldRefs = [...before.matchAll(/CHIP_CLASS\.(\w+)/g)].map((m) => ALL.get(m[1]) ?? null);
  for (const m of after.matchAll(/cn\("([^"]*)", CHIP_CLASS\.(solid\w+)\)|CHIP_CLASS\.(solid\w+)/g)) {
    const rest = m[1] ? m[1].split(/\s+/).filter(Boolean) : [];
    const entry = SOLIDS.get(m[2] ?? m[3]);
    if (!entry) { console.log(`NO ENTRY for ${m[2] ?? m[3]} in ${f}`); problems++; continue; }
    const produced = new Set([...rest, ...entry]);
    const match = olds.find((o) => {
      const s = new Set(o.split(/\s+/).filter(Boolean));
      return s.size === produced.size && [...s].every((c) => produced.has(c));
    }) ?? oldRefs.find((o) => {
      if (!o) return false;
      const s = new Set(o);
      return s.size === produced.size && [...s].every((c) => produced.has(c));
    });
    if (!match) {
      console.log(`NO MATCHING ORIGINAL in ${f}: ${JSON.stringify([...rest, ...entry])}`);
      problems++;
      continue;
    }
    checked++;
  }
}
console.log(`${checked} folded solid site(s) checked; ${problems} problem(s).`);
if (problems > 0) process.exit(1);
