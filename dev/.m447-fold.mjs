/**
 * M447 fold: the LABEL (a wash and a word, NO border) and its mirror, the MARK (a full-strength
 * border and a wash, NO word).
 *
 * The fold matches a quoted class string by its COLOUR CLASS SET: the set of its border-/bg-/text-
 * classes that name a theme colour must be EXACTLY the set a label or a mark wears. Only the
 * fourteen label and mark entries are candidates — a chip, a badge and a plain muted word are a
 * different family and are left alone — and a string with an extra colour (the tone chip
 * "border-primary bg-primary/15 text-primary") is a different family too.
 *
 * The class SET is preserved: the entry carries exactly the colour classes the site wore, and every
 * other class the site wore (sizes, padding, rings) stays at the site. The fold refuses to write a
 * file whose class set would change.
 *
 * Run: node dev/.m447-fold.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PALETTE_FILE = join(ROOT, "ui", "primitives.tsx");
const DIRS = ["features", "components", "ui"];

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

/** The plain colour classes of a string, as a SET (the identity of a chip). */
const colourSet = (str) => {
  const set = new Set();
  for (const cls of str.split(/\s+/).filter(Boolean)) {
    const c = colourClass(cls);
    if (c && !c.variant) set.add(cls);
  }
  return set;
};

const keyOf = (set) => [...set].sort().join(" ");

// The palette's LABEL and MARK entries, and the colour set each one wears.
const paletteText = readFileSync(PALETTE_FILE, "utf8");
const paletteBody = paletteText.slice(paletteText.indexOf("export const CHIP_CLASS = {"));
const ENTRIES = new Map(); // colour-set key -> { name, spec }
for (const m of paletteBody.matchAll(/(\w+):\s*"([^"]+)"/g)) {
  const [, name, spec] = m;
  if (!/^label/.test(name)) continue;
  const set = colourSet(spec);
  if (!set.size) continue;
  ENTRIES.set(keyOf(set), { name, spec });
}
console.log(`Label/mark palette entries: ${ENTRIES.size}`);
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
 * Returns the replacement expression, or null when the string is not a label or a mark.
 */
const foldString = (str) => {
  const set = colourSet(str);
  if (!set.size) return null;
  const entry = ENTRIES.get(keyOf(set));
  if (!entry) return null;
  // Every class the site wore that is NOT one of the entry's colour classes stays at the site.
  const rest = str.split(/\s+/).filter(Boolean).filter((c) => !set.has(c));
  if (!rest.length) return `CHIP_CLASS.${entry.name}`;
  return `cn("${rest.join(" ")}", CHIP_CLASS.${entry.name})`;
};

/** The class set a fold would produce, so the fold can refuse to change it. */
const setAfterFold = (classes, entry) => {
  const set = colourSet(classes);
  const out = new Set(classes.split(/\s+/).filter(Boolean).filter((c) => !set.has(c)));
  for (const c of entry.spec.split(/\s+/).filter(Boolean)) out.add(c);
  return out;
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
    const entry = ENTRIES.get(keyOf(colourSet(classes)));
    const before = new Set(classes.split(/\s+/).filter(Boolean));
    const after = setAfterFold(classes, entry);
    if (before.size !== after.size || [...before].some((c) => !after.has(c))) {
      console.log(`SET CHANGED in ${file}: "${classes}"`);
      problems++;
      return whole;
    }
    fileFolded++;
    return `className={${expr}}`;
  });

  // 2. The rest: class strings inside cn(...), ternaries and tables.
  text = text.replace(/"([^"]*)"/g, (whole, classes) => {
    const expr = foldString(classes);
    if (expr === null) return whole;
    const entry = ENTRIES.get(keyOf(colourSet(classes)));
    const before = new Set(classes.split(/\s+/).filter(Boolean));
    const after = setAfterFold(classes, entry);
    if (before.size !== after.size || [...before].some((c) => !after.has(c))) {
      console.log(`SET CHANGED in ${file}: "${classes}"`);
      problems++;
      return whole;
    }
    fileFolded++;
    return expr;
  });

  if (fileFolded === 0) continue;

  // The imports: CHIP_CLASS, and cn when the fold introduced it.
  const needsChip = /CHIP_CLASS\./.test(text);
  if (needsChip && !/import[^;]*\bCHIP_CLASS\b[^;]*from ["']@\/ui\/primitives["']/.test(text)) {
    const m = text.match(/import \{([^}]*)\} from ["']@\/ui\/primitives["'];/);
    if (m) {
      const names = m[1].trim();
      text = text.replace(m[0], `import { ${names}, CHIP_CLASS } from "@/ui/primitives";`);
    } else {
      const lines = text.match(/^import .+ from ["']@\/ui\/primitives["'];$/gm);
      if (lines) {
        const last = lines[lines.length - 1];
        const idx = text.lastIndexOf(last) + last.length;
        text = text.slice(0, idx) + "\nimport { CHIP_CLASS } from \"@/ui/primitives\";" + text.slice(idx);
      } else {
        // No palette import yet: add one after the last import line.
        const imports = text.match(/^import .+;$/gm);
        if (!imports) {
          console.log(`NO IMPORT ANCHOR in ${file}`);
          problems++;
          continue;
        }
        const last = imports[imports.length - 1];
        const idx = text.lastIndexOf(last) + last.length;
        text = text.slice(0, idx) + "\nimport { CHIP_CLASS } from \"@/ui/primitives\";" + text.slice(idx);
      }
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
      if (lines) {
        const last = lines[lines.length - 1];
        const idx = text.lastIndexOf(last) + last.length;
        text = text.slice(0, idx) + "\nimport { cn } from \"@/lib/utils\";" + text.slice(idx);
      } else {
        const imports = text.match(/^import .+;$/gm);
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
  }

  writeFileSync(file, crlf ? text.replace(/\n/g, "\r\n") : text);
  folded += fileFolded;
  touched.add(file.replace(ROOT + "/", "").replace(/\\/g, "/"));
  console.log(`✓ ${file.replace(ROOT + "/", "").replace(/\\/g, "/")}: ${fileFolded} replacement(s)`);
}

console.log(`\n${folded} site(s) folded across ${touched.size} file(s) (${problems} problem(s))`);
if (problems > 0) process.exit(1);
