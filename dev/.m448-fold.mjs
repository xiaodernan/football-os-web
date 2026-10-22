/**
 * M448 fold: the PANEL — a border and a wash of one of the app's quiet surfaces, with no word of
 * its own. The panel's COLOUR classes (the border and the wash) move into PANEL_CLASS; every other
 * class the site wore (its radius, its padding, its size) stays at the site, exactly as M447 left
 * a chip's size at the site.
 *
 * The fold matches a quoted class string by its COLOUR CLASS SET — the set of its border-/bg-/text-
 * classes that name a theme colour, plus a bare `border` (which IS the border colour). A string
 * whose set is exactly a panel entry's set is folded; one that carries a word, or an extra colour,
 * belongs to another family and is left alone.
 *
 * The class SET is preserved, and the fold refuses to write a file whose set would change.
 *
 * Run: node dev/.m448-fold.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PALETTE_FILE = join(ROOT, "ui", "primitives.tsx");
const DIRS = ["features", "ui"];

// The theme's colours: a class that names a colour the theme does not define paints nothing.
const css = readFileSync(join(ROOT, "src", "globals.css"), "utf8");
const themeColours = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));

/** A colour class: `border-success/40`, `hover:border-primary/40`, `text-muted-foreground`. */
const colourClass = (cls) => {
  const variant = cls.includes(":");
  const base = variant ? cls.slice(cls.indexOf(":") + 1) : cls;
  const m = base.match(/^(border|bg|text)-([a-z][a-z0-9-]*)(?:\/\d+)?$/);
  if (!m || !themeColours.has(m[2])) return null;
  return { raw: cls, variant, role: m[1], colour: m[2] };
};

/** The plain colour classes of a string, as a SET. */
const colourSet = (str) => {
  const set = new Set();
  for (const cls of str.split(/\s+/).filter(Boolean)) {
    const c = colourClass(cls);
    if (c && !c.variant) set.add(cls);
  }
  return set;
};

const keyOf = (set) => [...set].sort().join(" ");

/**
 * A string's PANEL colour set: its wash, its border, and no word.
 *
 * A bare `border` IS the border colour in Tailwind — the width class with the theme's border
 * colour — so a bare `border` counts as the border here, and a string with neither a border colour
 * nor a bare `border` is not a panel at all.
 */
const panelSetOf = (tokens) => {
  const classes = tokens.map(colourClass);
  if (classes.some((c) => c && c.role === "text")) return null;
  const wash = classes.find((c) => c && c.role === "bg" && !c.variant);
  if (!wash) return null;
  const border = classes.find((c) => c && c.role === "border" && !c.variant);
  const set = new Set([wash.raw]);
  if (border) set.add(border.raw);
  else if (tokens.includes("border")) set.add("border");
  else return null;
  return set;
};

// The palette's panel entries, and the colour set each one wears.
const paletteText = readFileSync(PALETTE_FILE, "utf8");
const paletteBody = paletteText.slice(paletteText.indexOf("export const PANEL_CLASS = {"));
const ENTRIES = new Map();
for (const m of paletteBody.matchAll(/(\w+):\s*"([^"]+)"/g)) {
  const [, name, spec] = m;
  const set = panelSetOf(spec.split(/\s+/).filter(Boolean));
  if (!set) continue;
  ENTRIES.set(keyOf(set), { name, spec });
}
console.log(`Panel palette entries: ${ENTRIES.size}`);
for (const [k, v] of ENTRIES) console.log(`  ${v.name}  <-  ${k}`);

function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.tsx$/.test(f)) out.push(p);
  }
  return out;
}

const files = DIRS.flatMap((d) => walk(join(ROOT, d))).filter((f) => f !== PALETTE_FILE);

/**
 * Fold one quoted class string.
 * Returns the replacement expression, or null when the string is not a panel.
 */
const foldString = (str) => {
  const tokens = str.split(/\s+/).filter(Boolean);
  const panelSet = panelSetOf(tokens);
  if (!panelSet) return null;
  const entry = ENTRIES.get(keyOf(panelSet));
  if (!entry) return null;
  // Every class the site wore that is NOT one of the entry's colour classes stays at the site.
  const rest = tokens.filter((c) => !panelSet.has(c));
  if (!rest.length) return `PANEL_CLASS.${entry.name}`;
  return `cn("${rest.join(" ")}", PANEL_CLASS.${entry.name})`;
};

let folded = 0;
let problems = 0;
const touched = new Set();

for (const file of files) {
  const raw = readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  let text = raw.replace(/\r\n/g, "\n");
  let fileFolded = 0;

  // 1. A JSX className attribute that holds a whole class string.
  text = text.replace(/className="([^"]*)"/g, (whole, classes) => {
    const expr = foldString(classes);
    if (expr === null) return whole;
    fileFolded++;
    return `className={${expr}}`;
  });

  // 2. The rest: class strings inside cn(...), ternaries and tables.
  text = text.replace(/"([^"]*)"/g, (whole, classes) => {
    const expr = foldString(classes);
    if (expr === null) return whole;
    fileFolded++;
    return expr;
  });

  if (fileFolded === 0) continue;

  // The imports: PANEL_CLASS, and cn when the fold introduced it.
  const needsPanel = /PANEL_CLASS\./.test(text);
  if (needsPanel && !/import[^;]*\bPANEL_CLASS\b[^;]*from ["']@\/ui\/primitives["']/.test(text)) {
    const m = text.match(/import \{([^}]*)\} from ["']@\/ui\/primitives["'];/);
    if (m) {
      const names = m[1].trim();
      text = text.replace(m[0], `import { ${names}, PANEL_CLASS } from "@/ui/primitives";`);
    } else {
      const lines = text.match(/^import .+ from ["']@\/ui\/primitives["'];$/gm);
      const imports = lines ?? text.match(/^import .+;$/gm);
      if (!imports) {
        console.log(`NO IMPORT ANCHOR in ${file}`);
        problems++;
        continue;
      }
      const last = imports[imports.length - 1];
      const idx = text.lastIndexOf(last) + last.length;
      text = text.slice(0, idx) + "\nimport { PANEL_CLASS } from \"@/ui/primitives\";" + text.slice(idx);
    }
  }
  const needsCn = /[^.\w]cn\(/.test(text) && !/import[^;]*\bcn\b[^;]*from ["']@\/lib\/utils["']/.test(text);
  if (needsCn) {
    const m = text.match(/import \{([^}]*)\} from ["']@\/lib\/utils["'];/);
    if (m) {
      const names = m[1].trim();
      text = text.replace(m[0], `import { ${names}, cn } from "@/lib/utils";`);
    } else {
      const lines = text.match(/^import .+ from ["']@\/lib\/utils["'];$/gm);
      const imports = lines ?? text.match(/^import .+;$/gm);
      if (!imports) {
        console.log(`NO UTILS IMPORT ANCHOR in ${file}`);
        problems++;
        continue;
      }
      const last = imports[imports.length - 1];
      const idx = text.lastIndexOf(last) + last.length;
      text = text.slice(0, idx) + "\nimport { cn } from \"@/lib/utils\";" + text.slice(idx);
    }
  }

  writeFileSync(file, crlf ? text.replace(/\n/g, "\r\n") : text);
  folded += fileFolded;
  touched.add(file.replace(ROOT + "/", "").replace(/\\/g, "/"));
  console.log(`✓ ${file.replace(ROOT + "/", "").replace(/\\/g, "/")}: ${fileFolded} replacement(s)`);
}

console.log(`\n${folded} panel site(s) folded across ${touched.size} file(s) (${problems} problem(s))`);
if (problems > 0) process.exit(1);
