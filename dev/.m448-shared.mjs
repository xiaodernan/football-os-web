// M448: which group is still "shared" (written more than once) in the census?
import { readFileSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { walkApp } from "../scripts/lib/appTree.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const APP_DIRS = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];

const css = readFileSync(join(ROOT, "src", "globals.css"), "utf8");
const themeColours = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const SURFACES = new Set(["background", "card", "popover", "sidebar", "accent"]);
const QUIET = new Set(["card", "secondary"]);

const colourClass = (cls) => {
  const variant = cls.includes(":");
  const base = variant ? cls.slice(cls.indexOf(":") + 1) : cls;
  const m = base.match(/^(border|bg|text)-([a-z][a-z0-9-]*)(?:\/(\d+))?$/);
  if (!m || !themeColours.has(m[2])) return null;
  return { raw: cls, variant, role: m[1], colour: m[2], softened: /\/\d+$/.test(base) };
};
const colourClasses = (str) => str.split(/\s+/).filter(Boolean).map(colourClass).filter(Boolean);

const shapeOf = (str) => {
  const classes = colourClasses(str);
  const plain = classes.filter((c) => !c.variant);
  const border = plain.find((c) => c.role === "border");
  const wash = plain.find((c) => c.role === "bg");
  const word = plain.find((c) => c.role === "text");
  if (border && wash && word && border.colour === word.colour && wash.colour === border.colour) return "tone";
  if (border && word && border.colour === "border" && word.colour === "muted-foreground") return "muted";
  if (border && word && border.colour === word.colour && !(wash && wash.colour === border.colour)) return "badge";
  if (!border && wash && word && !SURFACES.has(wash.colour) &&
      (word.colour === wash.colour || word.colour === "muted-foreground" || word.colour === "foreground")) return "label";
  if (border && wash && !word && border.colour === wash.colour && !border.softened) return "mark";
  if (wash && QUIET.has(wash.colour) && !classes.some((c) => c.role === "text")) {
    const hasBorder = border || str.split(/\s+/).includes("border");
    if (hasBorder) return "panel";
  }
  const hoverBorder = classes.find((c) => c.variant && c.role === "border");
  if (!border && word && word.colour === "muted-foreground" && hoverBorder && hoverBorder.colour === "primary") return "rest";
  return null;
};

const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, (s) => s.replace(/[^\n]/g, " ")).replace(/\/\/[^\n]*/g, (s) => " ".repeat(s.length));

const files = APP_DIRS.flatMap((d) => walkApp(join(ROOT, d), { exts: [".ts", ".tsx"] }));
const groups = new Map();
for (const f of files) {
  const rel = f.slice(ROOT.length + 1).replace(/\\/g, "/");
  const text = stripComments(readFileSync(f, "utf8"));
  text.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(/"([^"]*)"/g)) {
      const str = m[1];
      if (!str.includes("border-") && !str.includes("text-") && !str.includes("bg-")) continue;
      const shape = shapeOf(str);
      if (!shape) continue;
      const id = colourClasses(str).map((c) => c.raw).sort().join(" ");
      if (!groups.has(id)) groups.set(id, { shape, sites: [] });
      groups.get(id).sites.push(`${rel}:${i + 1}`);
    }
  });
}

for (const [id, g] of groups) {
  if (g.sites.length > 1) {
    console.log(`[${g.sites.length}] ${g.shape}  ${JSON.stringify(id)}`);
    for (const s of g.sites) console.log(`      ${s}`);
  }
}
