// M427. The app's COLOURS for a difference: one table, and the screens that spelled the edge tones.
//
// The defect, measured before it was fixed. The app had three classes for a difference — green for
// a gain, red for a loss, grey for a figure that did not move — and they were spelled in three
// files:
//
//   · features/football/Details.tsx, for a category difference;
//   · features/scouting/ScoutingPanel.tsx, for a player's best edge and worst edge;
//   · features/watchlist/WatchlistBoard.tsx, for the same two edges, in the same words.
//
// So the app could have shown the same figure in green on one screen and in grey on another, and a
// change to the palette would have had to be made in three places. It is the third door in the
// family M424 and M425 opened: the SIGN of a difference (M426) is the question, and this is what
// the app does with the answer.
//
// What this gate reads. A COLOUR CHOSEN BY A COMPARISON is a comparison against zero whose arms
// name a colour class — the shape a screen uses when it decides a difference's colour by asking
// whether the figure is above or below zero. Two near shapes are refused, each because it is a
// different contract: a comparison against a VARIABLE is some other decision, and a comparison
// against a STRING (a tone, a code) is a different question again. What survives must live in the
// shared vocabulary, where the table and the two edge tones are.
//
// Run: node scripts/proof-deltacolor.mjs
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
// A comparison against ZERO whose arms name a colour class.
const COLOUR_BY_COMPARISON = /[<>] *0 *\?[^;]*"text-/;
const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split(/\r?\n/)
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");

/** Every place a screen chooses a colour by comparing a figure with zero. */
const readColourChoices = (text) => {
  const out = [];
  stripComments(text).split(/\r?\n/).forEach((line, i) => {
    if (COLOUR_BY_COMPARISON.test(line)) out.push({ line: i + 1, text: line.trim() });
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
  for (const c of readColourChoices(readFileSync(f, "utf8"))) choices.push({ ...c, file: rel });
}

// The reader is armed: a planted difference colour is charged, and the two near shapes are not.
const pColour = readColourChoices(`<span className={d > 0 ? "text-success" : "text-muted-foreground"} />`).length;
const pVar = readColourChoices(`<span className={d > limit ? "text-success" : "text-muted-foreground"} />`).length;
const pTone = readColourChoices(`<span className={tone === "good" ? "text-success" : "text-destructive"} />`).length;
const pPlain = readColourChoices(`<span className="text-muted-foreground" />`).length;
ok(`the reader is armed and the two near shapes are refused (a planted difference colour reads ${pColour}, a comparison against a variable reads ${pVar}, a comparison against a string reads ${pTone}, and a plain class reads ${pPlain})`,
  pColour === 1 && pVar === 0 && pTone === 0 && pPlain === 0);

// --- 2 · the census: no screen chooses a difference's colour by comparing with zero ------------------
ok(`no screen chooses a difference's colour by comparing the figure with zero (${choices.length} site(s)${choices.length ? `: ${choices.map((c) => `${c.file}:${c.line}`).join(", ")}` : ""})`,
  choices.length === 0,
  `carriers: ${choices.map((c) => `${c.file}:${c.line}`).join(", ")}`);

// --- 3 · the shared vocabulary ---------------------------------------------------------------------
const HOME = "ui/primitives.tsx";
const src = Object.fromEntries(appFiles.map((f) => [f.slice(root.length + 1).replace(/\\/g, "/"), readFileSync(f, "utf8")]));
const DECL_TABLE = /\nexport const DELTA_CLASS\b/g;
const DECL_EDGE = /\nexport const (bestEdgeTone|worstEdgeTone)[ \t]*=/g;
const declTable = Object.entries(src).filter(([, t]) => (t.match(DECL_TABLE) || []).length > 0).map(([f]) => f);
const declEdge = Object.entries(src).filter(([, t]) => (t.match(DECL_EDGE) || []).length > 0).map(([f]) => f);
const FORMER = ["features/football/Details.tsx", "features/scouting/ScoutingPanel.tsx", "features/watchlist/WatchlistBoard.tsx"];
const imports = FORMER.map((f) => [f, /from ["']@\/ui\/primitives["']/.test(src[f] ?? "")]);
const uses = FORMER.map((f) => [f, (src[f]?.match(/\b(?:DELTA_CLASS|bestEdgeTone|worstEdgeTone)\b/g) || []).length]);
ok(`the table and the two edge tones are declared once, in the shared vocabulary, and every former site imports them (table in ${declTable.join(",") || "nowhere"}; edges in ${declEdge.join(",") || "nowhere"}; imports ${imports.map(([, v]) => (v ? "yes" : "NO")).join(",")}; uses ${uses.map(([, n]) => n).join(",")})`,
  declTable.length === 1 && declTable[0] === HOME && declEdge.length === 1 && declEdge[0] === HOME
    && imports.every(([, v]) => v) && uses.every(([, n]) => n >= 1),
  `table in ${declTable.join(",")}; edges in ${declEdge.join(",")}`);

// --- 4 · the doors answer exactly what the inline forms answered -------------------------------------
const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { DELTA_CLASS, bestEdgeTone, worstEdgeTone } = await server.ssrLoadModule("/ui/primitives.tsx");
const bestOld = (d) => (d > 0 ? "text-success" : "text-muted-foreground");
const worstOld = (d) => (d < 0 ? "text-destructive" : "text-muted-foreground");
const VALUES = [0, -0, 1, -1, 0.5, -0.5, 1e-9, -1e-9, 99, -99];
const bestSame = VALUES.every((d) => bestEdgeTone(d) === bestOld(d));
const worstSame = VALUES.every((d) => worstEdgeTone(d) === worstOld(d));
const classSame = DELTA_CLASS.up === "text-success" && DELTA_CLASS.down === "text-destructive" && DELTA_CLASS.flat === "text-muted-foreground";
ok(`the shared vocabulary answers exactly what the inline forms answered (the best edge over ${VALUES.length} values: ${bestSame}; the worst edge: ${worstSame}; the three classes: ${classSame})`,
  bestSame && worstSame && classSame && VALUES.length >= 8);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
