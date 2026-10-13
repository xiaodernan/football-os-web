// Proof for the shared round-to-1-decimal-place door (`round1`, declared once in
// domain/scouting.ts as `Math.round(n * 10) / 10`). "Round a number to one decimal" is a FORMULA,
// and until this unit the tree spelled that one formula two ways: the door (which ~13 domain modules
// already import through `round1(...)`) and a hand-inlined `Math.round(x * 10) / 10` sitting directly
// at the call site. Two CLEAN feature screens still hand-inlined it — CommunityHub's avgRating and
// DynamicWorld's avgNow — while the identical door sat one import away. M363 folded those two sites
// onto the door. The door shares ONLY the ×10 formula: the ×100 (round2) and ×1000 (round3) scale
// siblings in lib/utils are genuinely different precisions and must NOT be folded in, and a
// `.toFixed(1)` read is a different sink entirely — it returns a String, so swapping it for the
// number-returning door would change the type the caller receives. domain/career.ts still hand-spells
// `Math.round(... * 10) / 10` seven times; it is the concurrent writer's lane, so it is declared a
// residue pinned by file identity — NOT converged here. The census keys on a line that carries BOTH
// `Math.round(` and the balanced-tail fingerprint `* 10) / 10`; a naive `[^)]*` cannot read an
// argument that itself contains a call (`ratings.reduce(...)`), and `* 10) / 10` deliberately will not
// match a `* 100) / 100` line, so the scale census stays honest. scripts/ is not walked, so the plants
// below arm the scans rather than enter the census.
// Run: node scripts/proof-round1.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { round1 } = await server.ssrLoadModule("/domain/scouting.ts");
const { round2, round3 } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/scouting.ts"; // the door's home (writer lane — read here, never edited by M363)
// The two clean feature screens M363 folded onto the door.
const CONSUMERS = ["features/community/CommunityHub.tsx", "features/world/DynamicWorld.tsx"];
// The concurrent writer's domain file still hand-spells round1 inline; pinned as residue, not converged.
const RESIDUE = ["domain/career.ts"];
const UTILS = "lib/utils.ts"; // round2/round3 live here — the scale siblings to keep apart

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n"].flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The round-to-1-dp formula, in its inlined spelling. A line carries it when it has BOTH the Math.round
// head and the ×10 balanced tail; the tail anchors on `)` so a ×100 or ×1000 line is never charged.
const R1_TAIL = /\*\s*10\)\s*\/\s*10\b/g;
const R2_TAIL = /\*\s*100\)\s*\/\s*100\b/g;
const R3_TAIL = /\*\s*1000\)\s*\/\s*1000\b/g;
const inlineR1 = (text) => text.split(/\r?\n/).filter((ln) => /Math\.round\(/.test(ln) && /\*\s*10\)\s*\/\s*10\b/.test(ln)).length;

const DECL_ROUND1 = /\nexport const round1\s*=/g;
const IMPORT_ROUND1 = /import[^;]*\bround1\b[^;]*from ["'][^"']*scouting["']/g;
const CALL_ROUND1 = /\bround1\(/g; // an invocation; `round1 = (` in the door decl and the bare name in an
                                    // import line both lack `round1(`, so this counts calls only.

// --- Plants: arm every scan so a "once" or "gone" verdict is a measurement, not an empty set. ------
const plantDecl = count(`\nexport const round1 = (n: number) => Math.round(n * 10) / 10;`, DECL_ROUND1);
const plantImport = count(`import { round1 } from "@/domain/scouting";`, IMPORT_ROUND1);
const plantCall = count(`const z = round1(y);`, CALL_ROUND1);
const plantInline = inlineR1(`const z = Math.round(v * 10) / 10;`);
ok(`the four round1 scans are armed (decl ${plantDecl}, import ${plantImport}, call ${plantCall}, inline ${plantInline})`,
  plantDecl === 1 && plantImport === 1 && plantCall === 1 && plantInline === 1);

// --- Population floor + subject presence (a blind walk would read 0 and pass a negative claim). ----
const present = CONSUMERS.concat([HOME, UTILS], RESIDUE).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx)`,
  carriers.length >= 80 && present);

// --- Structural: the round1 door is declared exactly once, and only in its home. -------------------
const declByFile = carriers.filter((f) => count(src[f], DECL_ROUND1) > 0);
ok(`round1 is declared exactly once, in the scouting door (home ${count(src[HOME], DECL_ROUND1)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_ROUND1) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- The door's body is the exact ×10 formula it replaced, so folding a site changes no arithmetic. --
const doorBody = (src[HOME].match(/export const round1 = [^\n]*/) || [""])[0];
ok(`the door body is the single formula Math.round(n * 10) / 10 (reads "${doorBody.trim()}")`,
  /export const round1 = \(n: number\) => Math\.round\(n \* 10\) \/ 10;/.test(doorBody.trim()) && count(doorBody, R1_TAIL) === 1);

// --- Both M363 consumers read the door instead of hand-stitching, and call it at least once. --------
const consumerInline = CONSUMERS.reduce((s, f) => s + inlineR1(src[f]), 0);
const importing = CONSUMERS.filter((f) => count(src[f], IMPORT_ROUND1) >= 1);
const using = CONSUMERS.map((f) => [f, count(src[f], CALL_ROUND1)]);
ok(`both M363 consumers re-inlined nothing and read the door instead (inline ${consumerInline}, importers ${importing.length}/${CONSUMERS.length}, per-file calls ${using.map(([, n]) => n).join(",")}; planted inline ${plantInline})`,
  consumerInline === 0 && plantInline === 1 && importing.length === CONSUMERS.length && using.every(([, n]) => n >= 1));

// --- Convergence completeness: outside the door and the pinned career residue, no walked file still
// hand-spells the round-to-1-dp formula. --------------------------------------------------------------
const inlineFiles = carriers.filter((f) => inlineR1(src[f]) > 0);
const strays = inlineFiles.filter((f) => f !== HOME && !RESIDUE.includes(f));
ok(`the round-to-1-dp formula survives only in the door and the pinned career residue (carriers ${inlineFiles.join(",")}; strays ${strays.length})`,
  inlineFiles.includes(HOME) && strays.length === 0 && RESIDUE.every((r) => inlineR1(src[r]) >= 1));

// --- Must-not-unify, scale census: the ×10 door, the ×100 and ×1000 siblings are three different ----
// --- decimal precisions that coexist in two homes; a merged helper would silently re-scale results. --
const utils = src[UTILS];
ok(`the ×10, ×100 and ×1000 spellings stay three distinct scales the door never folds (door ×10 ${count(doorBody, R1_TAIL)}, door ×100 ${count(doorBody, R2_TAIL)}, utils ×100 ${count(utils, R2_TAIL)}, utils ×1000 ${count(utils, R3_TAIL)}, utils ×10 ${count(utils, R1_TAIL)}; blind spot a merged helper would drop)`,
  count(doorBody, R1_TAIL) === 1 && count(doorBody, R2_TAIL) === 0 && count(utils, R2_TAIL) >= 1 && count(utils, R3_TAIL) >= 1 && count(utils, R1_TAIL) === 0);

// --- Must-not-unify, scale is load-bearing: round1 keeps 1 dp where round2/round3 keep 2 and 3. ------
ok(`round1 rounds to 1 dp while its ×100/×1000 siblings keep 2 and 3 (a shared helper would erase precision)`,
  round1(12.345) === 12.3 && round2(12.345) === 12.35 && round3(12.345) === 12.345);

// --- Must-not-unify, sink: `.toFixed(1)` is a String read, a different shape from the number round1 --
// --- returns, so a "same rounding" merge would change the type every caller downstream receives. -----
ok(`a .toFixed(1) read is a String sink, not the number round1 returns (blind spot for any "equivalent rounding" fold)`,
  typeof round1(2.34) === "number" && typeof (2.34).toFixed(1) === "string" && round1(2) === 2 && (2).toFixed(1) === "2.0");

// --- Behavioural: the door reproduces the inlined formula bit-for-bit, so the two folds agree on ----
// --- every sample — the whole reason the substitution is behaviour-preserving. -----------------------
const samples = [12.34, 0.05, 2.35, -1.15, 99.95, 7.0, 3.14159];
ok(`round1 reproduces Math.round(n * 10) / 10 exactly across ${samples.length} samples, so the fold preserved every value`,
  samples.every((n) => round1(n) === Math.round(n * 10) / 10));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
