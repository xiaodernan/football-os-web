// Proof for the capRound door — the round-then-bound primitive `clamp(Math.round(value), lo, hi)`.
// The pair was spelled about ten times across career (careerArc), scouting, transfers, training (×3),
// worldEngine (×2) and a feature (TacticalStudio): each one rounded a real figure and then clamped it
// to a band. That is exactly what clamp already does once you round first, so it is a door now (M383).
// capRound is declared ONCE, in domain/attributes.ts, and its body calls the single clamp door — it does
// NOT reimplement `Math.max(lo, Math.min(hi, v))`, which would be a second clamp and is rejected by
// proof-clamp's "declared once" + "no consumer inlines a clamp shape" clauses.
//
// The census charges the PURE round-then-clamp form `clamp(Math.round(EXPR), lo, hi)` — the outer clamp's
// first argument is exactly one Math.round call whose close is immediately followed by the clamp's
// first-arg comma. worldEngine's lines 100–101 `clamp(Math.round(x) + rngInt(...), lo, hi)` are EXCLUDED:
// there the round is followed by ` + rngInt`, so after the inner Math.round close comes ` +`, not `,` — a
// round-then-nudge-then-bound contract that is genuinely different and must stay inline. worldEngine's
// line 102 has no nudge and rides this door. The scan is keyed on the comma adjacency, not on a literal,
// so it does not mistake the rng form, and plants prove the zero is measured.
// Run: node scripts/proof-capround.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Own an isolated optimizer cache so a concurrent writer build / dev server churn on the shared
// .vite/deps never stalls ssrLoadModule at the runner's 60s transport timeout (same defense as
// proof-clamp-feature.mjs).
const server = await createServer({
  cacheDir: join(tmpdir(), `proof-capround-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { capRound } = await server.ssrLoadModule("/domain/attributes.ts");
const { clamp } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/attributes.ts";
const READERS = [
  "domain/careerArc.ts", "domain/newsImpact.ts", "domain/scouting.ts", "domain/training.ts",
  "domain/transfers.ts", "domain/worldEngine.ts", "features/tactical/TacticalStudio.tsx",
];

// Walk the shipped source roots (scripts/ is excluded so the plants below arm scans without inflating
// the census population).
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui", "app"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// --- Index of the ')' matching the '(' at `open`, or -1 if it runs off unbalanced. ------------------
const matchParen = (text, open) => {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (depth === 0) return i; }
  }
  return -1;
};

// Strip comments so doc text mentioning the pattern doesn't inflate the count.
const stripComments = (text) => {
  let out = "", i = 0, mode = null;
  while (i < text.length) {
    const c = text[i];
    if (mode === "line") { if (c === "\n") { mode = null; out += c; } else out += " "; i++; continue; }
    if (mode === "block") { if (c === "*" && text[i+1] === "/") { mode = null; out += "  "; i += 2; } else { out += c === "\n" ? "\n" : " "; i++; } continue; }
    if (c === "/" && text[i+1] === "/") { mode = "line"; out += "  "; i += 2; continue; }
    if (c === "/" && text[i+1] === "*") { mode = "block"; out += "  "; i += 2; continue; }
    out += c; i++;
  }
  return out;
};

// Count PURE round-then-clamp sites: `clamp(Math.round(EXPR), lo, hi)` where the outer clamp's first
// argument is exactly the Math.round call (its close is immediately followed by the clamp's comma).
const ROUND = "clamp(Math.round(";
const roundClampSites = (text) => {
  const code = stripComments(text);
  let n = 0, from = 0, idx;
  while ((idx = code.indexOf(ROUND, from)) !== -1) {
    from = idx + 1;
    const innerOpen = idx + ROUND.length - 1;
    const innerClose = matchParen(code, innerOpen);
    if (innerClose === -1) continue;
    if (code[innerClose + 1] === ",") n++;
  }
  return n;
};

// --- Plants: arm the pure-round scanner so a "zero leftovers" verdict is a measurement. --------------
const plantPure = roundClampSites("const x = clamp(Math.round(v), 0, 4);");
const plantRng = roundClampSites("const x = clamp(Math.round(v) + 1, 0, 4);");
const plantDeep = roundClampSites("const x = clamp(Math.round(load / mins), 1, 5);");
ok(`the pure-round scanner is armed on the simple, rng-variant and nested forms (pure ${plantPure}, rng ${plantRng}, nested ${plantDeep})`,
  plantPure === 1 && plantRng === 0 && plantDeep === 1);

// --- Door declaration: capRound is exported exactly once, in domain/attributes.ts, nowhere else. -----
const DECL = /\nexport const capRound\s*=/g;
const declByFile = carriers.filter((f) => count(src[f], DECL) > 0);
ok(`capRound is declared exactly once, in the door (home ${count(src[HOME], DECL)}, tree ${declByFile.join(",") || "none"})`,
  count(src[HOME], DECL) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- Door body routes through the single clamp door, not a reimplemented max/min. -------------------
const doorBody = (src[HOME].match(/export const capRound = [^\n]*/) || [""])[0];
ok(`the capRound body is clamp(Math.round(value), lo, hi) — it rides the one clamp door (reads "${doorBody.trim()}")`,
  /export const capRound = \(value: number, lo: number, hi: number\): number => clamp\(Math\.round\(value\), lo, hi\);/.test(doorBody.trim()));

// --- Population floor + every reader present (a blind walk would read 0 and pass a negative claim). --
const present = READERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every reader is inside it (${carriers.length} .ts/.tsx files, ${READERS.length} readers present)`,
  carriers.length >= 80 && present);

// --- Convergence completeness: the door body itself is the ONE legitimate pure round-then-clamp in ---
// --- the tree (it IS the definition). Any occurrence in any OTHER file is a leftover the ------------
// --- conversion should have removed — worldEngine 100–101 keep an rng nudge and read 0 by the --------
// --- comma-adjacency rule, and the only comment occurrence is the rng-variant doc text. --------------
const treePureCount = carriers.reduce((s, f) => s + roundClampSites(src[f]), 0);
const homePure = roundClampSites(src[HOME]);
ok(`the only pure round-then-clamp inline in the whole tree is the capRound door body — every reader was converted (tree ${treePureCount}, home ${homePure}; a planted inline would read ${plantPure})`,
  plantPure === 1 && homePure === 1 && treePureCount === homePure);

// --- Every reader calls the door (capRound), at least once; the door definition is NOT counted. ------
const CALL = /\bcapRound\(/g;
const perCall = READERS.map((f) => [f, count(src[f], CALL)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
ok(`all ${READERS.length} readers call capRound and the door definition is not double-counted (per-file ${perCall.map(([f, n]) => `${f.split("/").pop()}=${n}`).join(", ")}, total ${totalCalls})`,
  perCall.every(([, n]) => n >= 1) && totalCalls >= 10);

// --- Must-not-unify: worldEngine 100–101 (round, then +rngInt, then clamp) survive inline, and the ---
// --- pure-round census refuses them. A re-inline of a PURE form at any site would redden the clause. -
const weRaw = src["domain/worldEngine.ts"];
const weRngVariant = /clamp\(Math\.round\([^)]*\) \+ rngInt\(/.test(weRaw);
const plantRngInline = roundClampSites("const y = clamp(Math.round(v) + rngInt(rng, 0, 1), 0, 4);");
ok(`worldEngine's round-then-nudge-then-bound lines (100–101) stay inline — the pure-round census excludes them (worldEngine reads ${roundClampSites(weRaw)}, rng-variant present ${weRngVariant}, planted rng ${plantRngInline})`,
  roundClampSites(weRaw) === 0 && weRngVariant && plantRngInline === 0);

// --- Behavioural: capRound(v, lo, hi) equals clamp(Math.round(v), lo, hi) on every band the sites ---
// --- actually use, across samples below / at / above both bounds — so the conversions move no number. -
const GRID_V = [-3, 0, 0.4, 1, 4, 9, 10, 22, 45, 70, 96, 97, 100, 1000];
const BANDS = [[0, 4], [5, 96], [0, 10], [1, 5], [5, 99], [30, 100], [15, 45], [1, 99]];
const agrees = ([lo, hi]) => GRID_V.every((v) => capRound(v, lo, hi) === clamp(Math.round(v), lo, hi));
ok(`capRound(v,lo,hi) equals clamp(Math.round(v),lo,hi) on a grid spanning below/at/above both bounds for every band the sites use (${BANDS.length} bands)`,
  BANDS.every(agrees));

// --- Behavioural, on each converted site's own arithmetic: the new capRound call reproduces the old ---
// --- inline clamp(Math.round(...)) result for a representative input — the rewrite, not a hand figure. -
const siteChecks = [
  capRound(17, 15, 45) === clamp(Math.round(17), 15, 45),                                   // careerArc startAge
  capRound(0.7 + 0.2 - 0.1, 5, 96) === clamp(Math.round(0.7 + 0.2 - 0.1), 5, 96),           // newsImpact confidence
  capRound(8.6, 0, 10) === clamp(Math.round(8.6), 0, 10),                                   // scouting years
  capRound(120 / 15, 1, 22) === clamp(Math.round(120 / 15), 1, 22),                         // training count (sample pool.length)
  capRound(45 * 0.2, 1, 12) === clamp(Math.round(45 * 0.2), 1, 12),                         // training bookend (sample BOOKEND_MAX)
  capRound(220 / 45, 1, 5) === clamp(Math.round(220 / 45), 1, 5),                           // training load / mins
  capRound(50 + (70 - 62) * 3 + 1.2 * 5 + (78 - 60), 5, 99) === clamp(Math.round(50 + (70 - 62) * 3 + 1.2 * 5 + (78 - 60)), 5, 99), // transfers
  capRound(58 + (74 - 60) * 1.4 + (-6), 30, 100) === clamp(Math.round(58 + (74 - 60) * 1.4 + (-6)), 30, 100), // worldEngine points
  capRound(58 + (74 - 60) * 1.4 + 12, 30, 100) === clamp(Math.round(58 + (74 - 60) * 1.4 + 12), 30, 100),   // worldEngine line 102
  capRound(Number("3"), 0, 4) === clamp(Math.round(Number("3")), 0, 4),                     // TacticalStudio carried-mentality
].every(Boolean);
ok(`the door reproduces the old inline number on a live input from each converted formula (careerArc, newsImpact, scouting, training ×3, transfers, worldEngine ×2, TacticalStudio)`, siteChecks);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);