// Proof for the shared division door (lib/utils.ts's `safeDiv`, declared once as
// `(num, den) => num / Math.max(1, den)`). Six quotients across five files each hand-stitched the
// same zero-guard — career's points-per-game, worldEngine's squad average, playerDna's archetype
// attribute mean (M368), TacticalStudio's two balance means, AiStudio's ring angle — because the count
// under them can arrive empty (a row not yet played, a filtered squad, a graph with one node), and a
// bare `/0` is Infinity or NaN where every caller wants a number. The door folds ONLY that quotient
// shape: its body IS the old `/ Math.max(1, den)` spelling, so every quotient it touches computes
// identically — the fold buys the spelling, not a value. Two things this census must SEE:
//   · the SAME guard spelled `/ (count || 1)` — for a non-negative INTEGER count `den || 1` equals
//     `Math.max(1, den)`, so playerDna's `/(ks.length || 1)` folded with no value change. A `PLAIN_DIV`
//     scan anchored only on `Math.max(1,` would be blind to it, so a dedicated `/ (… || 1)` scan charges
//     every such quotient (a zero→one DEFAULT like `(a/b) || 1` or an unparenthesised `x/len || 1` divides
//     THEN defaults — a different shape — and must NOT be claimed).
//   · three sibling `Math.max(1, …)` floors stay hand-stitched because they are not denominator guards at
//     all, and the blind-spot clause below counts exactly them (a naive fold keyed on the max/min pair or
//     on "a 1 floor near a division" would swallow them):
//     · career's fixtureAt count floor also guards a MODULO and an array index —
//       `opponents[(index + lap) % n]` — so no quotient-only fold can carry it;
//     · career's season floor (`totalFixtures`, twice) feeds subtraction and comparison only — there
//       is no division anywhere in its life to fold;
//     · PlayerOS's node level floors AFTER the divide — floor-then-divide and divide-then-floor are
//       different rounding orders, hence different measurements.
// attributes.ts still spells its category average `/ (defs.length || 1)` — that is a writer-lane residue
// (the file is dirty in this shared worktree), charged here by identity so the fold is owed, not hidden.
// scripts/ is not walked, so the plants below arm the scans rather than enter the census.
// Run: node scripts/proof-div-guard.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Owned cacheDir OUTSIDE the repo (per-PID, so witness-arm children never collide) plus noDiscovery, so a
// concurrent `npm run build` / the other writer's dep-optimizer churn on the shared `.vite/deps` cannot
// stall this ssrLoadModule at the runner's timeout. safeDiv is pure; Node resolves clsx externally.
const server = await createServer({
  cacheDir: join(tmpdir(), `proof-div-guard-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { safeDiv } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
// The five files whose quotients the door carries (M371: career, worldEngine, TacticalStudio, AiStudio;
// M368: playerDna's archetype attribute mean, folded from `/ (ks.length || 1)`).
const CONSUMERS = [
  "domain/career.ts", "domain/worldEngine.ts", "domain/playerDna.ts",
  "features/tactical/TacticalStudio.tsx", "features/ai/AiStudio.tsx",
];
// Identity-keyed writer-lane residue: attributes' category average still spells `/ (defs.length || 1)`.
// The file is dirty in this shared worktree, so its owner folds it — this census charges it, not excuses it.
const RESIDUE = "domain/attributes.ts";

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n"].flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The hand-stitched quotient guard, the door declaration, its import, its call.
const PLAIN_DIV = /\/\s*Math\.max\(1,\s*/g;
// The SAME zero-guard spelled with `|| 1` on a denominator: `/ (something || 1)`. `[^()]*` is enough for
// the real spellings (`(ks.length || 1)`, `(defs.length || 1)`); the `/` must be immediately followed by the
// open paren that encloses the `|| 1`, so a `(a/b) || 1` default or an unparenthesised `x/len || 1` do NOT match.
const OR_ONE_DIV = /\/\s*\([^()]*\|\|\s*1\s*\)/g;
const DECL_SAFE = /\nexport const safeDiv\s*=/g;
const IMPORT_SAFE = /import[^;]*\bsafeDiv\b[^;]*from ["']@\/lib\/utils["']/g;
const CALL_SAFE = /\bsafeDiv\s*\(/g;

// --- Plants: arm every scan so a "gone"/"once"/"sole" verdict is a measurement, not an empty set. --
const plantDiv = count(`const r = points / Math.max(1, played);`, PLAIN_DIV);
const plantDecl = count(`\nexport const safeDiv = (num, den) => num;`, DECL_SAFE);
const plantImport = count(`import { cn, safeDiv } from "@/lib/utils";`, IMPORT_SAFE);
const plantCall = count(`const y = safeDiv(a, b);`, CALL_SAFE);
ok(`the four scans are armed (plain guard ${plantDiv}, decl ${plantDecl}, import ${plantImport}, call ${plantCall})`,
  plantDiv === 1 && plantDecl === 1 && plantImport === 1 && plantCall === 1);

// --- Population floor + subject presence (a blind walk reads 0 and would pass a negative claim). --
const present = CONSUMERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx)`,
  carriers.length >= 80 && present);

// --- Structural: safeDiv is declared exactly once, and only in the door. -------------------------
const declByFile = carriers.filter((f) => count(src[f], DECL_SAFE) > 0);
ok(`safeDiv is declared exactly once, in the door (home ${count(src[HOME], DECL_SAFE)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_SAFE) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- The door body verbatim: the fold IS the old shape, so no quotient moves. -------------------
const doorLine = (src[HOME].match(/export const safeDiv[^\n]*/) || [""])[0];
ok(`the door body is the hand-stitched quotient shape verbatim (reads "${doorLine.trim()}")`,
  doorLine.trim() === "export const safeDiv = (num: number, den: number): number => num / Math.max(1, den);");

// --- No consumer still hand-stitches the guard — all five import the door and call it. -------------
const consumerPlain = CONSUMERS.reduce((s, f) => s + count(src[f], PLAIN_DIV), 0);
const importing = CONSUMERS.filter((f) => count(src[f], IMPORT_SAFE) >= 1);
const callCounts = Object.fromEntries(CONSUMERS.map((f) => [f, count(src[f], CALL_SAFE)]));
const totalCalls = Object.values(callCounts).reduce((s, n) => s + n, 0);
ok(`all ${CONSUMERS.length} consumers hand-stitch nothing and read the door (plain guards ${consumerPlain}, importers ${importing.length}/${CONSUMERS.length}, per-file calls ${Object.entries(callCounts).map(([f, n]) => `${f.split("/").pop()}=${n}`).join(", ")}, total ${totalCalls}; planted reads ${plantDiv})`,
  consumerPlain === 0 && plantDiv === 1 && importing.length === CONSUMERS.length
  && totalCalls === 6 && callCounts["domain/career.ts"] === 1 && callCounts["domain/worldEngine.ts"] === 1
  && callCounts["domain/playerDna.ts"] === 1
  && callCounts["features/tactical/TacticalStudio.tsx"] === 2 && callCounts["features/ai/AiStudio.tsx"] === 1);

// --- Convergence completeness: outside the door no file in the walked tree carries the guard. ----
const divByFile = carriers.filter((f) => count(src[f], PLAIN_DIV) > 0);
const strays = divByFile.filter((f) => f !== HOME);
ok(`the hand-stitched guard survives only in the door — no quotient residue remains (carriers ${divByFile.join(",")}; strays ${strays.length}; planted reads ${plantDiv})`,
  divByFile.length === 1 && divByFile[0] === HOME && strays.length === 0 && plantDiv === 1);

// --- The `/ (count || 1)` spelling of the same zero-guard, censused by EVERY spelling. PLAIN_DIV
// --- anchored on `Math.max(1,` is blind to it, so a quotient guard could hide there. playerDna folded
// --- (residue gone); attributes' category average is the one writer-lane residue still hand-stitched. --
const orOneByFile = carriers.filter((f) => count(src[f], OR_ONE_DIV) > 0);
const orOneTotal = orOneByFile.reduce((s, f) => s + count(src[f], OR_ONE_DIV), 0);
const pdResidue = count(src["domain/playerDna.ts"], OR_ONE_DIV);
const attrResidue = count(src[RESIDUE], OR_ONE_DIV);
// Shape controls: a guarded denominator `/ (x || 1)` charges; a zero→one DEFAULT `(a/b) || 1` and an
// unparenthesised `x / len || 1` (which divides THEN defaults) are not the door's shape and must charge 0.
const pOrOne = count(`const r = sum / (xs.length || 1);`, OR_ONE_DIV);
const pOrOneDefault = count(`const q = (a / b) || 1;`, OR_ONE_DIV);
const pOrOneBare = count(`const z = x / ks.length || 1;`, OR_ONE_DIV);
ok(`the "/ (count || 1)" denominator guard is censused by every spelling: playerDna folded to the door (residue ${pdResidue}), only attributes' writer-lane average still hand-stitches it (total ${orOneTotal} in ${orOneByFile.map((f) => f.split("/").pop()).join(",")}); plants: guarded "/(x||1)" ${pOrOne}, "(a/b)||1" default ${pOrOneDefault}, unparenthesised "x/len||1" ${pOrOneBare}`,
  pOrOne === 1 && pOrOneDefault === 0 && pOrOneBare === 0
  && pdResidue === 0 && attrResidue === 1 && orOneTotal === 1 && orOneByFile.length === 1 && orOneByFile[0] === RESIDUE);

// --- Behavioural: the ssr-loaded door equals the old spelling on every sample pair. --------------
const NUMS = [-7, -0.5, 0, 0.25, 1, 2.5, 10, 999];
const DENS = [-4, 0, 0.5, 1, 3, 17];
let gridOk = typeof safeDiv === "function";
let pairs = 0;
for (const a of NUMS) for (const b of DENS) {
  pairs++;
  if (safeDiv(a, b) !== a / Math.max(1, b)) gridOk = false;
}
ok(`the loaded door equals the hand-stitched quotient across every below/inside/above sample (${pairs} pairs = ${NUMS.length}x${DENS.length})`,
  gridOk && pairs >= 40);

// --- Must-not-unify: the floor is 1 (integer counts), not epsilon (any nonzero) — they disagree. --
ok(`the floor is 1, not epsilon: safeDiv(10, 0.5) is 10 where the raw quotient is 20, safeDiv(6, 0) is 6, safeDiv(-6, -1) is -6 (blind spot a nonzero-guard merge would swallow)`,
  safeDiv(10, 0.5) === 10 && 10 / 0.5 === 20 && safeDiv(6, 0) === 6 && safeDiv(-6, -1) === -6);

// --- Blind spots: the three non-quotient `Math.max(1, …)` floors stay hand-stitched, counted. ----
const careerSrc = src["domain/career.ts"];
const playerSrc = src["features/player/PlayerOS.tsx"];
const moduloFloor = count(careerSrc, /Math\.max\(1, opponents\.length\)/g);
const seasonFloor = count(careerSrc, /Math\.max\(1, \(clubCount - 1\) \* 2\)/g);
const postDivFloor = count(playerSrc, /Math\.max\(1, Math\.floor\(v \/ 12\)\)/g);
ok(`the modulo floor, the season floor and the floor-after-divide stay hand-stitched (blind spots a naive fold would swallow: modulo ${moduloFloor}, season ${seasonFloor}, node-level ${postDivFloor})`,
  moduloFloor === 1 && seasonFloor === 2 && postDivFloor === 1 && /% n/.test(careerSrc));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
