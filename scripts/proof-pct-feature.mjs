// Proof for the FEATURE-layer closure of the shared integer-percent door (`pct`, declared once in
// lib/utils.ts as `Math.round(ratio * 100)`). M354 folded the seven DOMAIN-module spellings and pinned
// domain/ closure; the feature/UI layer was left unpinned because proof-pct's census scopes only domain/.
// M366 + M367 converge the CLEAN bare-integer-percent sites a reader sees as a displayed number
// (not a `%`-suffixed label): TacticalStudio's back-line stat `Math.round((1 - balance.line) * 100)`,
// DevelopmentPage's tier label `Math.round(analysis.skill * 100)`, PlayerOS's analysis progress
// `Math.round(((i + 1) / 6) * 100)`, and FilmRoom's stage progress
// `Math.round(((i + 1) / STAGES.length) * 100)`. Each now reads the door, so a rounding or clamp
// change to the integer-percent figure is one edit, not five across four screens.
//
// The door claims ONLY `Math.round( <expr> * 100 )` with a trailing `/ 100` EXCLUDED (that is round2, a
// two-decimal stored rating, not a displayed percentage — proof-pct pins that distinction). Two feature
// siblings must NOT be folded, and this proof charges them as a deliberate blind spot:
//   · a `* 200` interpolation (TacticalStudio's spread width) uses a DIFFERENT denominator, so it is a
//     different whole; PERCENT (which anchors on `* 100`) leaves it uncharged and the door must not claim it.
//   · an integer-percent whose scope has ALREADY bound the identifier `pct` to a non-function value
//     (DataRoom's forecast row destructures `{ match, odds, pct, sample }`, and `pct` is then read as
//     `pct.home`/`pct.draw`/`pct.away`). Calling the door there would invoke that object — a TypeError —
//     so the hand-spelled `Math.round(odds.mostLikelyPct * 100)` is a permanent, identity-keyed residue.
// A `${Math.round(… * 100)}%` string label (AppShell's progress bar) is the pctLabel shape, NOT this
// door, and is already pinned inline by sibling proof-pct-of; it is out of scope here so a fold of THAT
// door cannot double-redden. M367 folded FilmRoom's stage-progress site onto the door (a fourth
// consumer). Dashboard's integer-percent is a legitimate future candidate (writer lane in flight) and is
// deliberately NOT claimed, so this proof never fights its owner.
// scripts/ is not walked, so the plants arm the scans instead of entering the census.
// Run: node scripts/proof-pct-feature.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The door is pure, but Vite SSR still routes the load through the runner, which waits on the shared dep
// optimizer that a concurrent `npm run build` / the other writer's dev server churns (repo `.vite/deps`
// gets locked/re-optimized, stalling ssrLoadModule at the runner's 60s timeout). Two defenses: an owned
// cacheDir OUTSIDE the repo (per-PID, so witness-arm children never collide) plus noDiscovery/empty
// include, letting Node resolve clsx externally.
const server = await createServer({
  cacheDir: join(tmpdir(), `proof-pct-feature-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { pct, round2 } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
// The four feature files folded onto the door (M366: TacticalStudio, DevelopmentPage, PlayerOS;
// M367: FilmRoom's stage-progress `Math.round(((i + 1) / STAGES.length) * 100)`, same shape as
// PlayerOS's six-stage progress).
const CONSUMERS = [
  "features/tactical/TacticalStudio.tsx",
  "features/development/DevelopmentPage.tsx",
  "features/player/PlayerOS.tsx",
  "features/film/FilmRoom.tsx",
];
// Identity-keyed must-not-unify residues, charged by identity rather than excused by a blanket skip.
const DENOM200 = "features/tactical/TacticalStudio.tsx"; // same file: its *200 site must stay inline
const SHADOWED = "features/analytics/DataRoom.tsx"; // its *100 site stays inline: `pct` is a bound object there

// Walk the shipped source roots. scripts/ and dev/ are NOT walked, so plants below arm the scans, never a
// second charge in the census population.
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "ui", "app", "i18n"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The bare integer-percent shape, up to two nesting levels deep (so a progress fraction spelled
// `Math.round(((i + 1) / N) * 100)` is charged, not just `Math.round((a / b) * 100)`), whose closing
// paren is NOT round2's `/ 100`.
const PERCENT = /Math\.round\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\* *100\)(?! *\/ *100)/g;
// A different denominator (a *200 whole) — charged by a SEPARATE scan so the door's closure over *100
// does not accidentally claim it, and so the two scans prove disjoint.
const DENOM200_RE = /Math\.round\((?:[^()]|\([^()]*\))*\* *200\)/g;
const DECL_PCT = /\nexport const pct[ \t]*=/g;
const IMPORT_PCT = /import[^;]*\bpct\b[^;]*from ["']@\/lib\/utils["']/g;
const CALL_PCT = /\bpct\(/g; // invocations only: `pct = (` (decl) and `pct }` (import) lack the `pct(`.
// A destructuring param that binds the identifier `pct` in scope — the collision that forbids folding.
const PCT_BINDING = /\(\{[^{}]*\bpct\b[^{}]*\}\s*\)/g;

// --- Plants: arm every scan so a "0 survives" or "only in the door" verdict is a measurement. ---------
const pPercent = count(`  const p = Math.round(n.credibility * 100);\n  const q = Math.round((a / b) * 100);`, PERCENT);
// The two-level widening is witnessed here: a progress fraction spelled with a nested numerator
// `Math.round(((i + 1) / N) * 100)` — the exact shape FilmRoom/PlayerOS folded — must charge ONE.
const pPercentDouble = count(`  setProgress(Math.round(((i + 1) / STAGES.length) * 100));`, PERCENT);
const pPercentRound2Excluded = count(`  const r2 = Math.round(v * 100) / 100;`, PERCENT);
const pDecl = count(`\nexport const pct = (ratio: number): number => Math.round(ratio * 100);\n`, DECL_PCT);
const pImport = count(`import { cn, pct } from "@/lib/utils";`, IMPORT_PCT);
const pCall = count(`const w = pct(1 - balance.line);`, CALL_PCT);
// pctOf/pctLabel must NOT read as a `pct(` call or a `pct =` decl — the three sibling doors stay distinct.
const pCallSibling = count(`const a = pctOf(x, y); const b = pctLabel(z);`, CALL_PCT);
const pDenom200 = count(`  const s = Math.round(balance.spread * 200);`, DENOM200_RE);
const pDenom200NotPercent = count(`  const s = Math.round(balance.spread * 200);`, PERCENT);
const pPctBinding = count(`forecast.map(({ match, odds, pct, sample }) => {`, PCT_BINDING);
ok(`the scans are armed and each exclusion bites (percent ${pPercent}, double-paren percent ${pPercentDouble}, round2-form charged ${pPercentRound2Excluded}, decl ${pDecl}, import ${pImport}, call ${pCall}, sibling-call charged ${pCallSibling}, *200 ${pDenom200}, *200-as-percent ${pDenom200NotPercent}, pct-binding ${pPctBinding})`,
  pPercent === 2 && pPercentDouble === 1 && pPercentRound2Excluded === 0 && pDecl === 1 && pImport === 1 && pCall === 1 &&
  pCallSibling === 0 && pDenom200 === 1 && pDenom200NotPercent === 0 && pPctBinding === 1);

// --- Population floor + subject presence (a blind walk reads empty and would pass a negative claim). ---
const present = CONSUMERS.concat([HOME, SHADOWED]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx, floor 80)`,
  carriers.length >= 80 && present);

// --- Structural: the integer-percent door is declared exactly once, in lib/utils, nowhere else. --------
const declByFile = carriers.filter((f) => count(src[f], DECL_PCT) > 0);
ok(`pct is declared exactly once, in the door (home ${count(src[HOME], DECL_PCT)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_PCT) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- All three feature consumers read the door: import it, and call it at least once. ------------------
const importing = CONSUMERS.filter((f) => count(src[f], IMPORT_PCT) >= 1);
const perCall = CONSUMERS.map((f) => count(src[f], CALL_PCT));
ok(`all ${CONSUMERS.length} feature consumers import pct from @/lib/utils and call it (importers ${importing.length}/${CONSUMERS.length}, per-file calls ${perCall.join(",")})`,
  importing.length === CONSUMERS.length && perCall.every((n) => n >= 1));

// --- No hand-spelled integer-percent survives in a converged consumer (planted, so the zero is measured).
const consumerPercent = CONSUMERS.map((f) => count(src[f], PERCENT));
const pInline = count(`  const x = Math.round(analysis.skill * 100);`, PERCENT);
ok(`none of the ${CONSUMERS.length} feature consumers still spells the integer percent inline (read ${consumerPercent.join(",")}; a planted inline reads ${pInline})`,
  pInline === 1 && consumerPercent.every((n) => n === 0));

// --- must-not-unify (denominator): the *200 whole is a different figure. Read THAT LINE, not the file: ---
// --- PERCENT (anchored on `* 100`) charges the *200 line zero, DENOM200 charges it one, and the door is ---
// --- never called over a *200. (A file-wide PERCENT reading would just re-run clause 5's closure claim.) ---
const spreadLine = src[DENOM200].split(/\r?\n/).find((l) => l.includes("* 200")) || "";
const t200 = (spreadLine.match(DENOM200_RE) || []).length;
const t200PctCharged = (spreadLine.match(PERCENT) || []).length;
const t200IsCall = /\bpct\([^)]*\* *200\)/.test(spreadLine);
ok(`TacticalStudio's *200 spread line stays hand-spelled inline — PERCENT charges that line 0 while DENOM200 charges it 1, and the door is never called over a *200 (percent-on-line ${t200PctCharged}, *200-on-line ${t200}, door-over-*200 ${t200IsCall ? 1 : 0})`,
  t200PctCharged === 0 && t200 === 1 && t200IsCall === false);

// --- must-not-unify (identifier collision): DataRoom's forecast scope binds `pct` to a non-function ---
// --- object, so its `* 100` integer-percent is a permanent residue that a naive fold would break. ------
const drPercent = count(src[SHADOWED], PERCENT);
const drBindings = count(src[SHADOWED], PCT_BINDING);
const drCallsDoor = count(src[SHADOWED], CALL_PCT);
ok(`DataRoom's integer-percent stays inline because the forecast row destructures a \`pct\` object that shadows the door (inline *100 ${drPercent}, \`pct\`-binding ${drBindings}, door calls there ${drCallsDoor})`,
  drPercent === 1 && drBindings === 1 && drCallsDoor === 0);

// --- Behavioural: the shipped door reproduces the formula each folded site removed, equality to the ---
// --- formula it replaced (not a hand-typed number), across the operands those four screens pass. -----
const inlineRound = (x) => Math.round(x * 100);
const lineRatios = [0, 0.5, 0.375, 1]; // 1 - balance.line spans a 0..1 defensive line
const skillRatios = [0.4999, 0.5, 0.625, 0.87, 0.999, 1]; // analysis.skill fraction, incl a .625 half case
const stageFractions = [1, 2, 3, 4, 5, 6].map((n) => n / 6); // PlayerOS (/6) and FilmRoom (/STAGES.length=6) progress
const agrees = [...lineRatios, ...skillRatios, ...stageFractions].every((r) => pct(r) === inlineRound(r));
ok(`the shipped pct answers Math.round(ratio * 100) for every ratio the four consumers pass (${lineRatios.length + skillRatios.length + stageFractions.length} ratios), incl pct(0.625)=${pct(0.625)} and pct(1/6)=${pct(1 / 6)}`,
  agrees && pct(0.5) === 50 && pct(1) === 100 && pct(0) === 0 && pct(1 / 6) === 17);

// --- must-not-unify (behavioral): pct drops the fraction; round2 keeps two decimals. The folded feature ---
// --- sites display whole percents, so they take pct — a caller that swapped in round2 would shrink every ---
// --- figure by two orders of magnitude, and a shared ratio proves the two doors disagree. --------------
ok(`pct and round2 disagree on a shared ratio so the feature fold picked the integer door, not the two-decimal one (pct(0.87)=${pct(0.87)} vs round2(0.87)=${round2(0.87)})`,
  pct(0.87) === 87 && round2(0.87) !== pct(0.87));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
