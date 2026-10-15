// Proof for the shared numeric clamp (lib/utils.ts's clamp). M341 folded five private `clamp`
// FUNCTIONS onto this one door and its comment still reads "The app's one numeric clamp," yet the
// hand-inlined expression `Math.max(lo, Math.min(hi, v))` — and its mirror `Math.min(hi, Math.max(lo, v))` —
// kept being spelled directly inside eight otherwise-clean domain modules (analytics's clampLambda,
// careerArc, load, gap ×2, newsImpact, matchProbability, matchEngine ×2, training ×5). training.ts
// and careerArc.ts already imported and used the door elsewhere in the SAME file while writing the
// shape inline beside it: one module that both obeys and bypasses its own contract. This census
// converges fourteen of those inline sites onto clamp and charges the shape STRUCTURALLY.
//
// The charge rule is a balanced-paren walk, not a literal, because the clamp value can itself be a
// nested call (Math.round(Number(x)), a ternary, an arithmetic span). An inline site is charged only
// when the OUTER call has exactly two top-level args and its SECOND arg is EXACTLY one opposite
// Math.max/Math.min call that ends where the outer ends. That adjacency is what excludes
// domain/careerArc.ts:99 — `Math.max(0, Math.min(LAST_AGE, peakAge + 2) - startAge)` — which floors a
// DIFFERENCE (the ` - startAge` sits after the inner close), not a value. That file is a must-not-
// unify witness: it holds a Math.max and a Math.min, so a literal scan would mischarge it, but the
// shape scan reads it as zero. M361 converged the last three residues (career.ts, attributes.ts's
// clampAttr, scouting.ts's five inline sites), so all eleven domain modules now read the door and a
// completeness clause measures the fully-closed seam with a planted inline. Run: node scripts/proof-clamp.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { clamp } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
// The eleven domain modules whose inline clamp sites were converged onto the door.
const CONSUMERS = [
  "domain/analytics.ts", "domain/careerArc.ts", "domain/load.ts", "domain/gap.ts",
  "domain/matchProbability.ts", "domain/matchEngine.ts", "domain/training.ts",
  "domain/career.ts", "domain/attributes.ts", "domain/scouting.ts",
];
// newsImpact.ts's only clamp use was a round-then-clamp site, which moved to the capRound door in M383;
// it no longer imports clamp directly, so it is no longer a direct consumer of this door.

// Walk the shipped source roots. scripts/ is NOT walked, so the plants below arm the scans without
// becoming a second charge in the census population.
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n"].flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// --- The structural clamp-shape scanner (balanced parens, both nestings, shape-not-literal). -----
// Index of the ')' matching the '(' at `open`, or -1 if it runs off the end unbalanced.
const matchParen = (text, open) => {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (depth === 0) return i; }
  }
  return -1;
};
// Split a call's argument span on top-level commas (depth 0 across (), [], {}).
const splitArgs = (s) => {
  const out = []; let depth = 0, cur = "";
  for (const c of s) {
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    if (c === "," && depth === 0) { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur);
  return out;
};
// Count inline clamp shapes: Math.max(a, Math.min(b, V)) or Math.min(b, Math.max(a, V)), where the
// outer call's second top-level argument is exactly one opposite Math.max/Math.min call spanning it.
const clampShapes = (text) => {
  let n = 0;
  for (const outer of ["Math.max(", "Math.min("]) {
    const inner = outer === "Math.max(" ? "Math.min(" : "Math.max(";
    let from = 0, idx;
    while ((idx = text.indexOf(outer, from)) !== -1) {
      from = idx + 1;
      const open = idx + outer.length - 1;
      const close = matchParen(text, open);
      if (close === -1) continue;
      const args = splitArgs(text.slice(open + 1, close));
      if (args.length !== 2) continue;
      const a2 = args[1].trim();
      if (!a2.startsWith(inner)) continue;
      const innerOpen = a2.indexOf("(");
      const innerClose = matchParen(a2, innerOpen);
      if (innerClose !== a2.length - 1) continue; // trailing content (e.g. " - startAge") => not a clamp
      n++;
    }
  }
  return n;
};

// --- Plants: arm the scanner on both nestings, deep nesting, and the careerArc-form exclusion. ----
const plantMaxOuter = clampShapes("const x = Math.max(0, Math.min(1, v));");
const plantMinOuter = clampShapes("const x = Math.min(2, Math.max(0, value));");
const plantDeep = clampShapes("const x = Math.max(0, Math.min(4, Math.round(Number(z))));");
const plantTernary = clampShapes("const x = Math.max(0, Math.min(1, a ? b / c : 0));");
// The exclusion: a floor-of-a-difference that a literal/naive scan would mischarge as a clamp.
const plantExcluded = clampShapes("const y = Math.max(0, Math.min(LAST_AGE, peakAge + 2) - startAge);");
ok(`the scanner is armed on both nestings + deep/ternary values and refuses the floor-of-difference form (max ${plantMaxOuter}, min ${plantMinOuter}, deep ${plantDeep}, ternary ${plantTernary}, excluded ${plantExcluded})`,
  plantMaxOuter === 1 && plantMinOuter === 1 && plantDeep === 1 && plantTernary === 1 && plantExcluded === 0);

const DECL_CLAMP = /\nexport const clamp[ \t]*=/g;
const IMPORT_CLAMP = /import[^;]*\bclamp\b[^;]*from ["']@\/lib\/utils["']/g;
const plantDecl = count(`\nexport const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));\n`, DECL_CLAMP);
const plantImport = count(`import { clamp, pct } from "@/lib/utils";`, IMPORT_CLAMP);
// A two-arg-only max/min (a floor or a ceiling, not a clamp) must NOT be charged — the shape rule,
// not the presence of Math.max or Math.min, is what admits a site.
const plantCeilingOnly = clampShapes("const x = Math.min(15, resolved * 5); const z = Math.max(p.potential, current);");
ok(`the decl/import scans are armed and a lone max or min is not charged as a clamp (decl ${plantDecl}, import ${plantImport}, ceiling-form ${plantCeilingOnly})`,
  plantDecl === 1 && plantImport === 1 && plantCeilingOnly === 0);

// --- Population floor + every subject present (a blind walk would pass a negative claim). ---------
const present = CONSUMERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx files, ${CONSUMERS.length} consumers present)`,
  carriers.length >= 80 && present);

// --- Structural: the door is declared exactly once, in lib/utils, and nowhere else. ----------------
const declByFile = carriers.filter((f) => count(src[f], DECL_CLAMP) > 0);
ok(`clamp is exported exactly once, in the door (home ${count(src[HOME], DECL_CLAMP)}, tree ${declByFile.join(",") || "none"})`,
  count(src[HOME], DECL_CLAMP) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- The door's own body is the max-outer clamp it claims to be. ----------------------------------
const doorBody = (src[HOME].match(/export const clamp[\s\S]*?;/) || [""])[0];
ok(`the door body is Math.max(lo, Math.min(hi, v)) and takes (value, low, high) (${doorBody.length} chars)`,
  /Math\.max\(\s*lo\s*,\s*Math\.min\(\s*hi\s*,\s*v\s*\)\s*\)/.test(doorBody) && /=>/.test(doorBody) && doorBody.length >= 40);

// --- Every consumer imports the door. -------------------------------------------------------------
const importing = CONSUMERS.filter((f) => count(src[f], IMPORT_CLAMP) >= 1);
ok(`all ${CONSUMERS.length} domain modules import clamp from @/lib/utils (${importing.length}/${CONSUMERS.length}: ${importing.join(", ")})`,
  importing.length === CONSUMERS.length);

// --- No converged consumer still spells an inline clamp shape (planted, so the zero is measured). --
const consumerShapes = CONSUMERS.map((f) => [f, clampShapes(src[f])]);
const plantConsumerHasSite = clampShapes("  const skill = Math.max(0, Math.min(1, (overall - FLOOR) / 30));");
ok(`none of the ${CONSUMERS.length} consumers still inlines a clamp shape (read ${consumerShapes.map(([, n]) => n).join(",")}; a planted inline would read ${plantConsumerHasSite})`,
  plantConsumerHasSite === 1 && consumerShapes.every(([, n]) => n === 0));

// --- Must-not-unify / shape-keyed proof: careerArc.ts:99 holds a Math.max AND a Math.min yet reads
// zero, because it floors a difference rather than clamping a value. This is the clause that fails if
// the census ever degenerates to a literal `Math.max(`/`Math.min(` count.
// Planted so the zero is measured: a synthetic floor-of-difference would also read 0, while a true
// clamp shape in the same file would read 1.
const arcRaw = src["domain/careerArc.ts"];
const arcHasMaxAndMin = /Math\.max\(/.test(arcRaw) && /Math\.min\(/.test(arcRaw);
const arcStartAgeLine = /Math\.max\(0, Math\.min\(LAST_AGE, peakAge \+ 2\) - startAge\)/.test(arcRaw);
const plantFloorDiff = clampShapes("const x = Math.max(0, Math.min(LAST_AGE, peak + 2) - start);");
const plantTrueClamp = clampShapes("const x = Math.max(0, Math.min(99, v));");
ok(`careerArc.ts keeps a floor-of-difference (line 99) that the shape scan reads as 0 despite the file holding both Math.max and Math.min — the census is keyed on shape, not on the two tokens (shapes read ${clampShapes(arcRaw)}; floor-of-difference plant ${plantFloorDiff}, true-clamp plant ${plantTrueClamp})`,
  arcHasMaxAndMin && arcStartAgeLine && plantFloorDiff === 0 && plantTrueClamp === 1 && clampShapes(arcRaw) === 0);

// --- Completeness: across the whole domain tree, NO file holds an inline clamp shape — the seam is
// fully closed. careerArc's floor-of-difference reads 0 by shape, so it does not appear here.
// Planted so the zero is measured: a synthetic file with an inline shape would read 1.
const domainFiles = carriers.filter((f) => f.startsWith("domain/"));
const domainWithShapes = domainFiles.filter((f) => clampShapes(src[f]) > 0).sort();
const plantInlineShape = clampShapes("const v = Math.max(0, Math.min(1, x));");
ok(`across the domain tree no file holds an inline clamp shape any more — the seam is fully closed (${domainWithShapes.join(",") || "none"}; a planted inline would read ${plantInlineShape})`,
  plantInlineShape === 1 && domainWithShapes.length === 0);

// --- Behavioural: the shipped door reproduces BOTH nestings on the value ranges the sites use, so
// converting a Math.min(hi, Math.max(lo, v)) site to clamp(v, lo, hi) moves no number the reader sees.
const GRID = [-5, 0, 0.5, 1, 2, 5, 8, 10, 68, 70, 96, 100, 999, 1000, 1001];
const maxOuterAgrees = GRID.every((v) => clamp(v, 1, 5) === Math.max(1, Math.min(5, v)));
const minOuterAgrees = GRID.every((v) => clamp(v, 1, 5) === Math.min(5, Math.max(1, v)));
ok(`clamp(v,lo,hi) equals both the max-outer and the min-outer hand form on ${GRID.length} values (below/at/above both bounds), so the conversions are number-preserving`,
  maxOuterAgrees && minOuterAgrees);

// --- Behavioural, on the converted sites' own arithmetic: each door call reproduces the old inline
// result for a representative input the module actually feeds it. Each pair is (new clamp form) vs
// (old hand-inlined form) on the SAME numbers, so it witnesses the rewrite, not a hand-typed figure.
const siteChecks = [
  clamp((200 - 50) / 30, 0, 1) === Math.max(0, Math.min(1, (200 - 50) / 30)),          // gap skillForOverall
  clamp(40 + 5 * 4 + 3 * 4, 35, 92) === Math.max(35, Math.min(92, 40 + 5 * 4 + 3 * 4)), // load confidenceInput
  clamp(250, 1, 1000) === Math.max(1, Math.min(1000, 250)),                            // matchProbability runs
  +clamp(10, 5.2, 9.6).toFixed(2) === +Math.max(5.2, Math.min(9.6, 10)).toFixed(2),    // matchEngine rating
  clamp(800, 1, 5) === Math.min(5, Math.max(1, 800)),                                 // training min-outer bookend
].every(Boolean);
ok(`the door reproduces the old inline number on a live input from each converted domain formula (gap, load, matchProbability, matchEngine, plus a min-outer training form)`, siteChecks);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
