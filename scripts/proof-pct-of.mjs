// Proof for the shared share-of-a-max CSS-length door (`pctOf`, declared once in lib/utils.ts as a
// value divided by a max, times a hundred, followed by a literal percent sign). M362 folded the first
// five bare-inline spellings in CLEAN feature files — DevelopmentPage's gap bar (width) and target
// marker (left), PlayerOS's workload column (height), and ReviewPage's two focus bars (width) — onto
// the door. M365 folded the last eight, which had been pinned as writer-owned residue: ComparePage's
// four comparison bars, Details' three possession/rating bars, and SimulationLab's one split bar. The
// door centralises one fraction-of-a-scale rendered as a `%` length, across three different style
// properties, so a scale change is one edit, not thirteen.
//
// The door shares ONLY the bare `${(value / max) * 100}%` shape. Siblings that must NOT be folded in:
//   · a clamp-guarded fill — `${Math.max(2, (x / y) * 100)}%` (LoadPage, FilmRoom) or `${Math.min(100, (x / y) * 100)}%`
//     (ScoutingPanel) — wraps a bound; `pctOf` has no floor/ceiling to express it.
//   · an integer-rounded ratio label — AppShell's `${Math.round(… * 100)}%` — ROUNDS and treats the input as
//     a 0..1 fraction, not value-over-max; the raw fractional precision a style needs is lost.
//   The discriminator is structural: the bare form opens the interpolation with `${(`, every guarded/rounded
//   form opens it with `${Math.` — so the census anchors on `${(` and cannot charge a guarded sibling that
//   nests the identical inner fraction.
// No bare site survives anywhere but the door's own body; the three former writer files are charged
// zero-and-imports by a dedicated clause, so a re-inline reddens instead of being excused by identity.
// scripts/ is not walked, so the plants arm the scans instead of entering the census.
// Run: node scripts/proof-pct-of.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// `pctOf` is pure, but loading it through Vite SSR still routes through the module runner, which waits on
// the shared dep-optimizer that a concurrent `npm run build` / the other writer's dev server churn (the
// repo's `.vite/deps` gets locked/cleared/re-optimized, stalling ssrLoadModule at the runner's fixed 60s
// timeout). Two defenses: an owned cacheDir OUTSIDE the repo (per-PID, so the witness arms' children never
// collide) plus noDiscovery/empty include to skip pre-bundling and let Node resolve clsx externally.
const server = await createServer({
  cacheDir: join(tmpdir(), `proof-pct-of-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { pctOf } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
// All six feature files that now read the door: the original three (five call sites, zero bare)
// plus the three former writer-lane files M365 folded in (eight bare sites at HEAD, none now).
const CONSUMERS = [
  "features/development/DevelopmentPage.tsx",
  "features/player/PlayerOS.tsx",
  "features/review/ReviewPage.tsx",
  "features/compare/ComparePage.tsx",
  "features/football/Details.tsx",
  "features/sim/SimulationLab.tsx",
];
// Clean files whose percent-fill is GUARDED (clamped or rounded) — must-not-unify siblings, left inline.
const GUARDED = ["features/load/LoadPage.tsx", "features/film/FilmRoom.tsx", "features/scouting/ScoutingPanel.tsx", "features/shell/AppShell.tsx"];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "ui", "app", "i18n"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The bare shape: a template literal that opens `${(` and closes `) * 100}%`. A guarded sibling opens
// `${Math.` and is therefore invisible to this — even when it nests the identical inner fraction.
const BARE = /`\$\{\s*\([^{}]*?\s\/\s*[^{}]*?\)\s*\*\s*100\s*\}%`/g;
const DECL_PCTOF = /\nexport const pctOf\s*=\s*\(value: number, max: number\): string =>/g;
const IMPORT_PCTOF = /import[^;]*\bpctOf\b[^;]*from ["']@\/lib\/utils["']/g;
const CALL_PCTOF = /\bpctOf\(/g; // invocations only: the door's `pctOf = (` and an import's `pctOf }` lack `pctOf(`.
// A guarded percent-fill line: a Math-wrapped interpolation ending `…* 100)}` — the shapes the door must NOT claim.
const GUARD_LINE = (l) => /Math\.(?:max|min|round)\(/.test(l) && /\* *100\)\}/.test(l);
const guardLines = (text) => text.split(/\r?\n/).filter(GUARD_LINE).length;

// --- Plants: arm every scan so a "once"/"only"/"survives" verdict is a measurement, never an empty set. ---
const pDecl = count(`\nexport const pctOf = (value: number, max: number): string => x;`, DECL_PCTOF);
const pImport = count(`import { cn, pctOf } from "@/lib/utils";`, IMPORT_PCTOF);
const pCall = count(`const w = pctOf(item.actual, max);`, CALL_PCTOF);
const pBare = count(`style={{ width: \`\${(a / b) * 100}%\` }}`, BARE);
const pGuardMax = count(`style={{ width: \`\${Math.max(2, (a / b) * 100)}%\` }}`, BARE);
const pGuardMin = count(`style={{ width: \`\${Math.min(100, (a / b) * 100)}%\` }}`, BARE);
const pGuardRound = count(`style={{ width: \`\${Math.round(a / b * 100)}%\` }}`, BARE);
const pGuardLine = guardLines(`style={{ width: \`\${Math.max(2, (a / b) * 100)}%\` }}`);
ok(`the pctOf scans are armed (decl ${pDecl}, import ${pImport}, call ${pCall}, bare ${pBare}) and the guarded plants read uncharged by BARE (max ${pGuardMax}, min ${pGuardMin}, round ${pGuardRound}) yet armed by GUARD_LINE (${pGuardLine})`,
  pDecl === 1 && pImport === 1 && pCall === 1 && pBare === 1 && pGuardMax === 0 && pGuardMin === 0 && pGuardRound === 0 && pGuardLine === 1);

// --- Population floor + subject presence (a blind walk would read an empty tree and pass a negative claim). ---
const present = CONSUMERS.concat([HOME], GUARDED).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx, floor 80)`,
  carriers.length >= 80 && present);

// --- Structural: the pctOf door is declared exactly once, and only in its home. ---
const declByFile = carriers.filter((f) => count(src[f], DECL_PCTOF) > 0);
ok(`pctOf is declared exactly once, in the lib/utils door (home ${count(src[HOME], DECL_PCTOF)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_PCTOF) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- Reach guard on the door: lib/utils holds exactly ONE bare-shape occurrence — the body. The doc ---
// --- comment describes the shape in prose and never re-spells it, so the door is one canonical site. ---
const homeBare = count(src[HOME], BARE);
const doorBody = (src[HOME].match(/export const pctOf = [^\n]*/) || [""])[0];
ok(`the door body IS the bare value-over-max-percent shape and it is the sole such line in lib/utils (home bare ${homeBare}, body "${doorBody.trim()}")`,
  homeBare === 1 && /export const pctOf = \(value: number, max: number\): string => `\$\{\(value \/ max\) \* 100\}%`;/.test(doorBody.trim()));

// --- All six consumers read the door and write the bare shape nowhere. ---
const importing = CONSUMERS.filter((f) => count(src[f], IMPORT_PCTOF) >= 1);
const perCall = CONSUMERS.map((f) => [f, count(src[f], CALL_PCTOF)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
const consumerBare = CONSUMERS.reduce((s, f) => s + count(src[f], BARE), 0);
ok(`all six consumers read the door and hand-spell the bare shape nowhere (imports ${importing.length}/6, per-file calls ${perCall.map(([, n]) => n).join(",")}, total calls ${totalCalls}, bare inline across them ${consumerBare})`,
  importing.length === CONSUMERS.length && perCall.every(([, n]) => n >= 1) && totalCalls >= 10 && consumerBare === 0);

// --- Convergence completeness: the bare shape survives only in the door. ---
const bareFiles = carriers.filter((f) => count(src[f], BARE) > 0);
const strays = bareFiles.filter((f) => f !== HOME);
const consumersClean = CONSUMERS.every((f) => !bareFiles.includes(f));
const plantStray = count(`style={{ width: \`\${(a / b) * 100}%\` }}`, BARE);
ok(`every bare value-over-max-percent survives only in the door — no residue remains (carriers ${bareFiles.join(",")}; strays ${strays.length}; planted bare reads ${plantStray})`,
  plantStray === 1 && bareFiles.length === 1 && bareFiles[0] === HOME && strays.length === 0 && consumersClean);

// --- Must-not-unify, discrimination: the four clean guarded-fill files (Math.max floor, Math.min ceiling, ---
// --- Math.round integer) DO carry a guarded percent-fill yet the bare census charges every one of them zero -
// --- — the blind spot a naive census would fold into the door. ---
const guardedArmed = GUARDED.filter((f) => guardLines(src[f]) >= 1);
const guardedUncharged = GUARDED.filter((f) => count(src[f], BARE) === 0);
ok(`guarded percent-fills are armed by GUARD_LINE but left uncharged by BARE in all four clean files (armed ${guardedArmed.length}/4, uncharged ${guardedUncharged.length}/4 — a blind spot a naive fold would swallow)`,
  guardedArmed.length === GUARDED.length && guardedUncharged.length === GUARDED.length);

// --- Former writer-lane files: zero bare sites now, and each reads the door (a regression to the
// --- hand-spelled shape reddens this clause rather than being excused by an identity exemption). ---
const formerBare = CONSUMERS.slice(3).map((f) => [f.split("/").pop(), count(src[f], BARE)]);
const formerImport = CONSUMERS.slice(3).filter((f) => count(src[f], IMPORT_PCTOF) >= 1);
ok(`the three former writer-lane files re-inlined nothing and import the door (bare ${formerBare.map(([n, c]) => `${n}=${c}`).join(", ")}; importers ${formerImport.length}/3)`,
  formerBare.every(([, c]) => c === 0) && formerImport.length === 3);

// --- Behavioural: pctOf reproduces the removed inline template byte-for-byte, keeps the fractional --------
// --- precision an integer-rounded label would drop, and shares the inline code's unguarded divide-by-zero. ---
const inlineOf = (value, max) => `${(value / max) * 100}%`;
const samples = [[30, 90], [1, 3], [50, 200], [0, 5], [7, 2]];
const fractional = pctOf(1, 3);
ok(`pctOf(value, max) equals the raw inline template across samples and keeps full fractional precision (pctOf(1,3) = ${fractional}; a rounded label would say ${Math.round((1 / 3) * 100)}%)`,
  samples.every(([v, m]) => pctOf(v, m) === inlineOf(v, m)) && fractional === inlineOf(1, 3) && fractional !== `${Math.round((1 / 3) * 100)}%`);
// Planted so the "no guard" claim is measured: a guarded pctOf would return "0%" for (5,0), not "Infinity%".
const guardedOf = (v, m) => (m === 0 ? "0%" : `${(v / m) * 100}%`);
ok(`pctOf preserves the inline code's unguarded divide semantics — a NaN/Infinity guard was deliberately NOT added, and the planted guarded form disagrees exactly where it should (pctOf(5,0) = ${pctOf(5, 0)}, pctOf(0,0) = ${pctOf(0, 0)}; guarded plant says ${guardedOf(5, 0)})`,
  pctOf(5, 0) === inlineOf(5, 0) && pctOf(0, 0) === inlineOf(0, 0) && inlineOf(5, 0) === "Infinity%" && inlineOf(0, 0) === "NaN%" && guardedOf(5, 0) === "0%" && pctOf(5, 0) !== guardedOf(5, 0));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
