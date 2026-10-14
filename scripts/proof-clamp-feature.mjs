// Proof for the shared numeric clamp door (`clamp`, declared once in lib/utils.ts as
// `Math.max(lo, Math.min(hi, v))`). M355 folded the DOMAIN files onto this door; M364 folded the last
// six genuine double-sided clamps that still lived in clean FEATURE/UI files — DataRoom's RatingBar
// scale, Dashboard's focus-goal pct, TacticalStudio's carried-mentality index and its two pointer-drag
// x/y reads, and primitives' AttributeBar pct. The door shares ONLY the double-sided `max(lo, min(hi, v))`
// shape. M366 folded the last two feature twins that had been pinned as writer-owned — Details' ratio
// bar floor and SimulationLab's carried-mentality index — so the only double-sided nests left are the
// door itself, the shifted floor below, and the writer's data fixtures. Three siblings must NOT be
// folded in, because they are not clamps at all:
//   · a single-sided floor — `Math.max(0, potential - overall)`, `Math.max(1, tokens.length - 1)` — has
//     no upper bound, so `clamp(v, lo, hi)` cannot express it; the door would demand a ceiling that does
//     not exist.
//   · a two-argument min/max — `Math.min(h.played, a.played)`, `Math.min(growth.next.value, ….target)`,
//     `Math.min(...points)` — picks an extreme of two values, not a bounded clamp.
//   · domain/careerArc's `Math.max(0, Math.min(LAST_AGE, peakAge + 2) - startAge)` is a clamp THEN a
//     subtraction (a shifted floor); the `- startAge` sits between the inner min closing and the outer
//     max closing, so it is not `clamp(v, lo, hi)` and M355 declared it a residue. M364 left it inline
//     on purpose — this proof pins that it survived the convergence unchanged.
// The census keys on a LINE that carries BOTH `Math.max(` and `Math.min(` (a double-sided nest); a
// single-sided floor or a lone two-arg min/max has only one of them, so it is never charged — the
// discrimination plants below prove exactly that. scripts/ is not walked, so the plants arm the scans
// rather than enter the census.
// Run: node scripts/proof-clamp-feature.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// `clamp` is a pure function, but loading it through Vite SSR still routes through the module runner,
// which waits on the shared dep-optimizer. A concurrent `npm run build` / the other writer's dev server
// churn the repo's `.vite/deps` (locks, clears, re-optimizes), so ssrLoadModule stalls at the runner's
// fixed 60s "transport invoke timed out". Two defenses: (1) point cacheDir at a throwaway dir OUTSIDE the
// repo so this proof owns its own optimizer and never collides with the shared/writer cache; (2) noDiscovery
// + empty include skips pre-bundling entirely, letting Node resolve clsx/tailwind-merge externally.
const server = await createServer({
  cacheDir: join(tmpdir(), `proof-clamp-feature-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { clamp } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts"; // the clamp door's home
// The four clean feature/UI files M364 folded onto the door (six sites total).
const CONSUMERS = [
  "features/analytics/DataRoom.tsx", "features/dashboard/Dashboard.tsx",
  "features/tactical/TacticalStudio.tsx", "ui/primitives.tsx",
];
// The one domain file that carries a max/min pair on a line but is a shifted clamp, not a door fold.
const SHIFT = "domain/careerArc.ts";
// The concurrent writer's data fixtures: a clamp still hand-nested there is a DECLARED residue, not a
// stray. Keyed by file identity (the writer's lane), never by line. The two feature twins that used to
// sit here too — SimulationLab's `Math.max(0, Math.min(4, …))` and Details' `Math.max(4, Math.min(100, …))`
// — were folded onto the door by M366, so a clause below now charges them zero-and-imports instead.
const WRITER = ["data/footballSeed.ts", "data/footballService.ts", "data/intelligence.ts"];
// Former writer-lane feature files, now converged: a re-inline reddens rather than being excused.
const FORMER = ["features/football/Details.tsx", "features/sim/SimulationLab.tsx"];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui", "app"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// A line hand-nests a double-sided clamp when it carries BOTH Math.max( and Math.min(.
const DOUBLE_LINE = (l) => /Math\.max\(/.test(l) && /Math\.min\(/.test(l);
const doubleIn = (text) => text.split(/\r?\n/).filter(DOUBLE_LINE).length;

const DECL_CLAMP = /\nexport const clamp\s*=\s*\(v: number, lo: number, hi: number\)/g;
const IMPORT_CLAMP = /import[^;]*\bclamp\b[^;]*from ["']@\/lib\/utils["']/g;
const CALL_CLAMP = /\bclamp\(/g; // an invocation; `const clamp = (` in the door and the bare `clamp`
                                  // in an import line both lack `clamp(`, so this counts calls only.

// --- Plants: arm every scan so a "once"/"gone"/"only" verdict is a measurement, not an empty set. ---
const plantDecl = count(`\nexport const clamp = (v: number, lo: number, hi: number): number => x;`, DECL_CLAMP);
const plantImport = count(`import { cn, clamp } from "@/lib/utils";`, IMPORT_CLAMP);
const plantCall = count(`const s = clamp(value, 0, 2);`, CALL_CLAMP);
const plantDouble = doubleIn(`const z = Math.max(0, Math.min(1, x));`);
ok(`the four clamp scans are armed (decl ${plantDecl}, import ${plantImport}, call ${plantCall}, double ${plantDouble})`,
  plantDecl === 1 && plantImport === 1 && plantCall === 1 && plantDouble === 1);

// --- Population floor + subject presence (a blind walk would read 0 and pass a negative claim). ----
const present = CONSUMERS.concat([HOME, SHIFT], WRITER, FORMER).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx)`,
  carriers.length >= 80 && present);

// --- Structural: the clamp door is declared exactly once, and only in its home. --------------------
const declByFile = carriers.filter((f) => count(src[f], DECL_CLAMP) > 0);
ok(`clamp is declared exactly once, in the lib/utils door (home ${count(src[HOME], DECL_CLAMP)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_CLAMP) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- The door's body is the double-sided formula, so folding a nest onto it changes no arithmetic. -
const doorBody = (src[HOME].match(/export const clamp = [^\n]*/) || [""])[0];
ok(`the door body is Math.max(lo, Math.min(hi, v)) (reads "${doorBody.trim()}")`,
  /export const clamp = \(v: number, lo: number, hi: number\): number => Math\.max\(lo, Math\.min\(hi, v\)\);/.test(doorBody.trim()) && doubleIn(doorBody) === 1);

// --- All four M364 consumers read the door and call it; the six folded sites are six invocations. ---
const importing = CONSUMERS.filter((f) => count(src[f], IMPORT_CLAMP) >= 1);
const perCall = CONSUMERS.map((f) => [f, count(src[f], CALL_CLAMP)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
ok(`the four M364 feature/UI consumers read the door and hand-nest nothing (imports ${importing.length}/4, per-file calls ${perCall.map(([, n]) => n).join(",")}, total calls ${totalCalls}, double-sided inline ${CONSUMERS.reduce((s, f) => s + doubleIn(src[f]), 0)})`,
  importing.length === CONSUMERS.length && perCall.every(([, n]) => n >= 1) && totalCalls >= 6 && CONSUMERS.every((f) => doubleIn(src[f]) === 0));

// --- Convergence completeness: a hand-nested double-sided clamp survives only in the door, the ------
// --- declared careerArc shifted residue, or the writer's data lane. Critically, neither the four ---
// --- CONSUMER files nor the two former twins may appear here — an exemption cannot hide my own. ---
const doubleFiles = carriers.filter((f) => doubleIn(src[f]) > 0);
const allowed = new Set([HOME, SHIFT, ...WRITER]);
const strays = doubleFiles.filter((f) => !allowed.has(f));
const writerResidue = doubleFiles.filter((f) => WRITER.includes(f));
const consumersClean = CONSUMERS.every((f) => !doubleFiles.includes(f)) && FORMER.every((f) => !doubleFiles.includes(f));
ok(`every hand-nested clamp is accounted for: door, careerArc shifted residue, or the writer's data lane (carriers ${doubleFiles.length}, writer residue ${writerResidue.length}, strays ${strays.length})`,
  doubleFiles.includes(HOME) && strays.length === 0 && doubleIn(src[SHIFT]) >= 1 && writerResidue.length >= 1 && consumersClean);

// --- The former writer-lane feature twins carry ZERO hand-nested clamps now and read the door. ----
const formerDouble = FORMER.map((f) => [f.split("/").pop(), doubleIn(src[f])]);
const formerImport = FORMER.filter((f) => count(src[f], IMPORT_CLAMP) >= 1);
ok(`the two former writer-lane feature twins re-inlined nothing and import clamp instead (double ${formerDouble.map(([n, c]) => `${n}=${c}`).join(", ")}; importers ${formerImport.length}/${FORMER.length}: ${formerImport.join(", ")})`,
  formerDouble.every(([, c]) => c === 0) && formerImport.length === FORMER.length);

// --- Must-not-unify, discrimination: the double-sided census charges a real nest but leaves a ------
// --- single-sided floor and a lone two-argument min uncharged — the shapes the door must not claim. --
const plantSingle = doubleIn(`const z = Math.max(0, x);`);
const plantTwoArg = doubleIn(`const z = Math.min(h.played, a.played);`);
ok(`a single-sided floor and a two-argument min are left uncharged by the double-sided census (blind spot a naive clamp-fold would swallow: single ${plantSingle}, two-arg ${plantTwoArg}, nest ${plantDouble})`,
  plantSingle === 0 && plantTwoArg === 0 && plantDouble === 1);

// --- Must-not-unify, structural: careerArc's max-min-DIFF survived M364 inline, because a subtraction --
// --- sits between the inner min and the outer max — `clamp(v, lo, hi)` cannot express a shifted floor. --
ok(`domain/careerArc's shifted clamp (a subtraction between the min and the max) is left inline by design (blind spot: a regex that only saw the max/min pair would mis-fold it)`,
  /Math\.max\(0, Math\.min\(LAST_AGE, peakAge \+ 2\) - startAge\)/.test(src[SHIFT]) && doubleIn(src[SHIFT]) >= 1);

// --- Behavioural: clamp(v, lo, hi) reproduces BOTH nesting orders (the door nests max-outer, DataRoom --
// --- had nested min-outer) below / inside / above the band, so every one of the six folds is exact. -----
const band = [-1, 0, 0.5, 2, 5];
const maxOuter = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const minOuter = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
ok(`clamp(v, 0, 2) equals both Math.max-outer and Math.min-outer nesting across below/inside/above samples (${band.map((v) => clamp(v, 0, 2)).join(",")})`,
  band.every((v) => clamp(v, 0, 2) === maxOuter(v, 0, 2) && clamp(v, 0, 2) === minOuter(v, 0, 2)) && clamp(-1, 0, 2) === 0 && clamp(5, 0, 2) === 2 && clamp(0.5, 0, 2) === 0.5);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
