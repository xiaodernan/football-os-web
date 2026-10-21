// M430. The app's colours for a TONE: one mapping, and the screen that spelled it twice.
//
// The defect, measured before it was fixed. The domain judges how a league position sits with a
// tone — "good", "mixed" or "bad" — and the app has three classes for those: green for good, blue
// for mixed, red for bad. The mapping was spelled TWICE in features/manager/ManagerOS.tsx, with
// the same three words in the same order: once for the season summary's honour and once for the
// outlook's zone. A third, two-armed copy sat in the screen's own metric component.
//
// So the app could have shown a mid-table club in blue on one card and in red on another, and a
// change to the palette would have had to be made in two places. It is the sibling of M427's
// difference colours: the sign is one question, the tone is another, and each has its own door.
//
// What this gate reads. A COLOUR CHOSEN BY A TONE is a comparison against one of the tone words
// whose arms name a colour class. Two near shapes are refused, each because it is a different
// contract: a comparison against some OTHER string is not a tone, and the tile's own
// "up" | "down" | "neutral" vocabulary is the tile's, not the domain's.
//
// Run: node scripts/proof-toneclass.mjs
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? ` — ${detail}` : "")); }
};

// --- 1 · the reader -------------------------------------------------------------------------------
// A comparison against one of the DOMAIN's tone words, whose arms name a colour class.
const TONE_WORDS = "(?:good|mixed|bad)";
const COLOUR_BY_TONE = new RegExp(`=== *"${TONE_WORDS}"[^;]*"text-`);
const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split(/\r?\n/)
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");

/** Every place a screen chooses a colour by comparing a tone with its word. */
const readToneChoices = (text) => {
  const out = [];
  stripComments(text).split(/\r?\n/).forEach((line, i) => {
    if (COLOUR_BY_TONE.test(line)) out.push({ line: i + 1, text: line.trim() });
  });
  return out;
};

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const ROOTS = ["domain", "data", "lib", "store", "features", "components", "ui", "src", "i18n", "functions"];
const appFiles = ROOTS.flatMap((r) => walk(join(root, r))).filter((f) => /\.(ts|tsx)$/.test(f));

const choices = [];
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  for (const c of readToneChoices(readFileSync(f, "utf8"))) choices.push({ ...c, file: rel });
}

// The reader is armed: a planted tone colour is charged, and the three near shapes are not.
const pTone = readToneChoices(`const tone = t === "good" ? "text-success" : t === "bad" ? "text-destructive" : "text-info";`).length;
const pOther = readToneChoices(`const tone = t === "up" ? "text-success" : "text-destructive";`).length;
const pNotColour = readToneChoices(`const x = t === "good" ? "a" : "b";`).length;
const pPlain = readToneChoices(`<span className="text-muted-foreground" />`).length;
ok(`the reader is armed and the near shapes are refused (a planted tone colour reads ${pTone}, a comparison against the tile's own word reads ${pOther}, a tone comparison with no colour reads ${pNotColour}, and a plain class reads ${pPlain})`,
  pTone === 1 && pOther === 0 && pNotColour === 0 && pPlain === 0);

// --- 2 · the census: no screen chooses a tone's colour by comparing with the tone's word ---------------
ok(`no screen chooses a tone's colour by comparing the tone with its word (${choices.length} site(s)${choices.length ? `: ${choices.map((c) => `${c.file}:${c.line}`).join(", ")}` : ""})`,
  choices.length === 0,
  `carriers: ${choices.map((c) => `${c.file}:${c.line}`).join(", ")}`);

// --- 3 · the shared mapping ------------------------------------------------------------------------
const HOME = "ui/primitives.tsx";
const src = Object.fromEntries(appFiles.map((f) => [f.slice(root.length + 1).replace(/\\/g, "/"), readFileSync(f, "utf8")]));
const DECL = /\nexport const TONE_CLASS\b/g;
const declFiles = Object.entries(src).filter(([, t]) => (t.match(DECL) || []).length > 0).map(([f]) => f);
const SCREEN = "features/manager/ManagerOS.tsx";
const screenUses = (src[SCREEN]?.match(/\bTONE_CLASS\b/g) || []).length;
const screenImports = /import[^;]*\bTONE_CLASS\b[^;]*from ["']@\/ui\/primitives["']/.test(src[SCREEN] ?? "");
ok(`the mapping is declared once, in the shared vocabulary, and the manager screen reads it (declared in ${declFiles.join(",") || "nowhere"}; the screen uses it ${screenUses} time(s); it imports it: ${screenImports ? "yes" : "NO"})`,
  declFiles.length === 1 && declFiles[0] === HOME && screenUses >= 3 && screenImports,
  `declared in ${declFiles.join(",")}; uses ${screenUses}`);

// --- 4 · the mapping is the one the app wore -------------------------------------------------------
const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { TONE_CLASS } = await server.ssrLoadModule("/ui/primitives.tsx");
const old = (t) => (t === "good" ? "text-success" : t === "bad" ? "text-destructive" : "text-info");
const TONES = ["good", "mixed", "bad"];
const same = TONES.every((t) => TONE_CLASS[t] === old(t));
ok(`the mapping answers exactly what the inline forms answered, for all three tones (${TONES.map((t) => `${t}→${TONE_CLASS[t]}`).join(", ")})`,
  same && TONES.length === 3 && TONE_CLASS.good === "text-success" && TONE_CLASS.mixed === "text-info" && TONE_CLASS.bad === "text-destructive");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
