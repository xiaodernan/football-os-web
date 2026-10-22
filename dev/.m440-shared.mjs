// M440 helper: which chip does the census find written twice?
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { walkApp } from "../scripts/lib/appTree.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src", "globals.css"), "utf8");
const theme = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const colourClass = (cls) => {
  const variant = cls.includes(":");
  const base = variant ? cls.slice(cls.indexOf(":") + 1) : cls;
  const m = base.match(/^(border|bg|text)-([a-z][a-z0-9-]*)(?:\/\d+)?$/);
  if (!m || !theme.has(m[2])) return null;
  return { raw: cls, variant, role: m[1], colour: m[2] };
};
const cc = (s) => s.split(/\s+/).filter(Boolean).map(colourClass).filter(Boolean);
const shapeOf = (str) => {
  const classes = cc(str);
  const plain = classes.filter((c) => !c.variant);
  const b = plain.find((c) => c.role === "border");
  const w = plain.find((c) => c.role === "bg");
  const d = plain.find((c) => c.role === "text");
  if (b && w && d && b.colour === d.colour && w.colour === b.colour) return "tone";
  if (b && d && b.colour === "border" && d.colour === "muted-foreground") return "muted";
  const hb = classes.find((c) => c.variant && c.role === "border");
  if (!b && d && d.colour === "muted-foreground" && hb && hb.colour === "primary") return "rest";
  return null;
};
const dirs = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];
const groups = new Map();
for (const d of dirs) {
  for (const f of walkApp(join(root, d), { exts: [".ts", ".tsx"] })) {
    const rel = f.slice(root.length + 1).replace(/\\/g, "/");
    const text = readFileSync(f, "utf8");
    text.split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/"([^"]*)"/g)) {
        const str = m[1];
        if (!str.includes("border-") && !str.includes("text-")) continue;
        if (!shapeOf(str)) continue;
        const id = cc(str).map((c) => c.raw).sort().join(" ");
        if (!groups.has(id)) groups.set(id, []);
        groups.get(id).push(`${rel}:${i + 1}`);
      }
    });
  }
}
for (const [id, sites] of groups) if (sites.length > 1) console.log(sites.length, "|", id, "|", sites.join(", "));
