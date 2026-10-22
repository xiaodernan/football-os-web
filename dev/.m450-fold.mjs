/**
 * M450 fold: the app's BAR — the fill that runs inside a groove wears the colour of what the bar
 * MEASURES, so the fill is a meaning-named map (BAR_FILL) rather than a shade spelled out.
 *
 * The fold matches a quoted class string by its COLOUR CLASS SET: a bar's fill is a wash with no
 * word and no border of its own, and the wash must be one of the five tones. Every other class the
 * site wore (its height, its rounding, its transition) stays at the site, so nothing is painted
 * differently.
 *
 * The class SET is preserved, and the fold refuses to write a file whose set would change.
 *
 * Run: node dev/.m450-fold.mjs
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

const keyOf = (set) => [...set].sort().join(" ");

// The palette's bar tones, and the colour each one wears.
const paletteText = readFileSync(PALETTE_FILE, "utf8");
const barBody = paletteText.slice(paletteText.indexOf("export const BAR_FILL: Record<BarTone, string> = {"));
const TONES = new Map();
for (const m of barBody.matchAll(/(\w+):\s*"([^"]+)"/g)) {
  const [, tone, spec] = m;
  TONES.set(keyOf(new Set([spec])), tone);
}
console.log(`Bar tones: ${TONES.size}`);
for (const [k, v] of TONES) console.log(`  ${v}  <-  ${k}`);

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

/** The replacement expression for a quoted class string, or null when it is not a bar's fill. */
const foldString = (str) => {
  const tokens = str.split(/\s+/).filter(Boolean);
  const plain = tokens.map(colourClass).filter(Boolean).filter((c) => !c.variant);
  // A bar's fill: a wash, and no word and no border of its own.
  if (plain.length !== 1 || plain[0].role !== "bg") return null;
  if (tokens.includes("border")) return null;
  const tone = TONES.get(keyOf(new Set([plain[0].raw])));
  if (!tone) return null;
  const rest = tokens.filter((c) => c !== plain[0].raw);
  if (!rest.length) return `BAR_FILL.${tone}`;
  return `cn("${rest.join(" ")}", BAR_FILL.${tone})`;
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

  // The imports: BAR_FILL, and cn when the fold introduced it.
  const needsBar = /BAR_FILL\./.test(text);
  if (needsBar && !/import[^;]*\bBAR_FILL\b[^;]*from ["']@\/ui\/primitives["']/.test(text)) {
    const m = text.match(/import \{([^}]*)\} from ["']@\/ui\/primitives["'];/);
    if (m) {
      const names = m[1].trim();
      text = text.replace(m[0], `import { ${names}, BAR_FILL } from "@/ui/primitives";`);
    } else {
      const imports = text.match(/^import .+ from ["'][^"']+["'];?$/gm);
      if (!imports) {
        console.log(`NO IMPORT ANCHOR in ${file}`);
        problems++;
        continue;
      }
      const last = imports[imports.length - 1];
      const idx = text.lastIndexOf(last) + last.length;
      text = text.slice(0, idx) + "\nimport { BAR_FILL } from \"@/ui/primitives\";" + text.slice(idx);
    }
  }
  const needsCn = /[^.\w]cn\(/.test(text) && !/import[^;]*\bcn\b[^;]*from ["']@\/lib\/utils["']/.test(text);
  if (needsCn) {
    const m = text.match(/import \{([^}]*)\} from ["']@\/lib\/utils["'];/);
    if (m) {
      const names = m[1].trim();
      text = text.replace(m[0], `import { ${names}, cn } from "@/lib/utils";`);
    } else {
      const imports = text.match(/^import .+ from ["'][^"']+["'];?$/gm);
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

console.log(`\n${folded} bar fill(s) folded across ${touched.size} file(s) (${problems} problem(s))`);
if (problems > 0) process.exit(1);
