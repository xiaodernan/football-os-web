// M448 check: every folded panel kept its class SET. Reads each changed file from git, rebuilds
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

// The palette's panel entries.
const paletteText = readFileSync(join(ROOT, "ui", "primitives.tsx"), "utf8");
const panelBody = paletteText.slice(paletteText.indexOf("export const PANEL_CLASS = {"));
const PANELS = new Map();
for (const m of panelBody.matchAll(/(\w+):\s*"([^"]+)"/g)) PANELS.set(m[1], m[2].split(/\s+/).filter(Boolean));

const files = execSync("git diff --name-only features/").toString().trim().split("\n").filter(Boolean);
let problems = 0;
let checked = 0;

for (const f of files) {
  const before = execSync(`git show HEAD:${f}`).toString();
  const after = readFileSync(join(ROOT, f), "utf8");
  // The strings the fold replaced, in order.
  const olds = [...before.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  const news = [...after.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  // Find the panel references in the new file and the class set each produced.
  for (const m of after.matchAll(/cn\("([^"]*)", PANEL_CLASS\.(\w+)\)|PANEL_CLASS\.(\w+)/g)) {
    const rest = m[1] ? m[1].split(/\s+/).filter(Boolean) : [];
    const entry = PANELS.get(m[2] ?? m[3]);
    if (!entry) { console.log(`NO ENTRY for ${m[2] ?? m[3]} in ${f}`); problems++; continue; }
    const produced = new Set([...rest, ...entry]);
    // The original string: find the one whose class set equals the produced set.
    const match = olds.find((o) => {
      const s = new Set(o.split(/\s+/).filter(Boolean));
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
console.log(`${checked} folded panel site(s) checked; ${problems} problem(s).`);
if (problems > 0) process.exit(1);
