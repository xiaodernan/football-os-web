// Proof for the shared round-to-2-decimal-places door (`round2`, declared once in lib/utils.ts as
// `Math.round(v * 100) / 100`). The scale family beyond round1 has three doors that coexist in two
// homes — round1 (×10) in domain/scouting, and round2 (×100) / round3 (×1000) in lib/utils. M363 gave
// round1 a census and proof-round1 charges ×10/×100/×1000 as distinct scales, but until this unit the
// ×100 door itself had no census of its own: round2 spreads over five consumers (analytics, career,
// filmInsights, load, footballSeed) yet scripts/ never proved it was declared once, hand-spelled
// nowhere outside its body, and imported by every caller. This unit closes that debt — a purely
// additive census, editing NO shipped source and NO lib/utils door.
//
// round2 shares ONLY the ×100-and-divide shape. Three siblings must NOT be folded in, charged zero
// from every angle this proof can reach:
//   · round1 (×10) and round3 (×1000) — different decimal precisions; `* 100) / 100` deliberately will
//     not match `* 10) / 10` or `* 1000) / 1000` because the `100\b` boundary and the `)` anchor reject
//     both the shorter and the longer scale.
//   · pct (`Math.round(ratio * 100)`) — MULTIPLIES to an integer for a percent figure and never divides;
//     it carries `* 100` but no `/ 100`, so the round2 census (which anchors on the `/ 100` tail) misses it.
//   · fmt2 / `.toFixed(2)` — a String sink with a different rounding rule (toFixed rounds off the binary
//     value, round2 off a multiplied Math.round; the two disagree at 2.675) and a different return type.
// scripts/ and dev/ are not walked, so the plants arm the scans instead of entering the census, and a
// hand-inlined `Math.round(x * 100) / 100` in ANY shipped file reddens the convergence clause.
// Run: node scripts/proof-round2.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Loading pure helpers through Vite SSR still routes through the module runner, which waits on the
// shared dep-optimizer a concurrent build / the other writer's dev server churn (`.vite/deps` gets
// locked/re-optimized, stalling ssrLoadModule at the runner's fixed 60s timeout). Two defenses: an
// owned cacheDir OUTSIDE the repo (per-PID, so the witness arms' children never collide) plus
// noDiscovery/empty include to skip pre-bundle and let Node resolve clsx externally.
const server = await createServer({
  cacheDir: join(tmpdir(), `proof-round2-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { round2, round3, pct, fmt2 } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "ui", "app", "i18n"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The ×100-and-divide formula in its inlined spelling. The argument body nests at most two paren levels
// so a caller like `Math.round(((gf / played)) * 100) / 100` is never blind-spotted. The `\* *100\)` and
// `/ *100\b` anchors reject ×10 (round1) and ×1000 (round3), and reject a bare `Math.round(x*100)` (pct)
// that never divides.
const ARG2 = String.raw`(?:[^()]|\((?:[^()]|\([^()]*\))*\))*`;
const R2_INLINE = new RegExp(String.raw`Math\.round\(` + ARG2 + String.raw`\* *100\) *\/ *100\b`, "g");
const R1_INLINE = new RegExp(String.raw`Math\.round\(` + ARG2 + String.raw`\* *10\) *\/ *10\b`, "g");
const R3_INLINE = new RegExp(String.raw`Math\.round\(` + ARG2 + String.raw`\* *1000\) *\/ *1000\b`, "g");
const DECL_ROUND2 = /\nexport const round2\s*=\s*\(v: number\): number =>/g;
const IMPORT_ROUND2 = /import[^;]*\bround2\b[^;]*from ["']@\/lib\/utils["']/g;
const CALL_ROUND2 = /\bround2\(/g; // invocations only: the door's `round2 = (` and an import's `, round2`/`round2 }` lack `round2(`.
const TOFIXED2 = /\.toFixed\(2\)/g; // the String-sink sibling round2 must not swallow.

// --- Plants: arm every scan so a "once"/"only"/"survives" verdict is a measurement, never an empty set. ---
const pDecl = count(`\nexport const round2 = (v: number): number => x;`, DECL_ROUND2);
const pImport = count(`import { clamp, round2 } from "@/lib/utils";`, IMPORT_ROUND2);
const pCall = count(`const r = round2(ppg(r));`, CALL_ROUND2);
const pInline = count(`const x = Math.round(v * 100) / 100;`, R2_INLINE);
const pInlineDeep = count(`const x = Math.round(((a + 1) / 2) * 100) / 100;`, R2_INLINE);
// Must-not-unify siblings the round2 census must charge ZERO, each armed by its OWN scan:
const pR1 = count(`const x = Math.round(n * 10) / 10;`, R2_INLINE);
const pR1armed = count(`const x = Math.round(n * 10) / 10;`, R1_INLINE);
const pR3 = count(`const x = Math.round(v * 1000) / 1000;`, R2_INLINE);
const pR3armed = count(`const x = Math.round(v * 1000) / 1000;`, R3_INLINE);
const pPct = count(`const shown = Math.round(ratio * 100);`, R2_INLINE); // multiplies, never divides
const pFmt = count(`const cell = value.toFixed(2);`, TOFIXED2);
ok(`the round2 scans are armed (decl ${pDecl}, import ${pImport}, call ${pCall}, inline ${pInline}, inline-deep ${pInlineDeep}) and every scale/type sibling reads uncharged by R2_INLINE (round1 ${pR1}, round3 ${pR3}, pct ${pPct}) while its own scan arms them (round1 ${pR1armed}, round3 ${pR3armed}) and the toFixed sink is armed (${pFmt})`,
  pDecl === 1 && pImport === 1 && pCall === 1 && pInline === 1 && pInlineDeep === 1 &&
  pR1 === 0 && pR1armed === 1 && pR3 === 0 && pR3armed === 1 && pPct === 0 && pFmt === 1);

// --- Population floor + subject presence (a blind walk would read an empty tree and pass a negative claim). ---
const present = [HOME, "domain/analytics.ts", "domain/career.ts", "domain/load.ts"].every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and the round2 consumers are inside it (${carriers.length} .ts/.tsx, floor 80)`,
  carriers.length >= 80 && present);

// --- Structural: the round2 door is declared exactly once, and only in its home. ---
const declByFile = carriers.filter((f) => count(src[f], DECL_ROUND2) > 0);
ok(`round2 is declared exactly once, in the lib/utils door (home ${count(src[HOME], DECL_ROUND2)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_ROUND2) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- Reach guard on the door: the ×100-and-divide formula appears EXACTLY once in lib/utils — the round2 ---
// --- body. Its round3 sibling (×1000) and every docstring mention stay uncharged by R2_INLINE. ---
const doorBody = (src[HOME].match(/export const round2 = [^\n]*/) || [""])[0];
ok(`the door body IS the ×100 formula and it is the sole such line in lib/utils (home ×100 ${count(src[HOME], R2_INLINE)}, body "${doorBody.trim()}")`,
  count(src[HOME], R2_INLINE) === 1 && /export const round2 = \(v: number\): number => Math\.round\(v \* 100\) \/ 100;/.test(doorBody.trim()));

// --- Convergence completeness: outside the door's home, the ×100-and-divide formula survives nowhere. ---
const inlineFiles = carriers.filter((f) => count(src[f], R2_INLINE) > 0);
const strays = inlineFiles.filter((f) => f !== HOME);
const plantStray = count(`const x = Math.round(v * 100) / 100;`, R2_INLINE);
ok(`the round-to-2dp formula survives only in the door's body — no shipped file re-inlines it (carriers ${inlineFiles.join(",")}; strays ${strays.length}; a planted inline would read ${plantStray})`,
  plantStray === 1 && inlineFiles.length === 1 && inlineFiles[0] === HOME && strays.length === 0);

// --- Derived consumer census: every shipped file that CALLS round2 IMPORTS it (no orphan call — the HOME ---
// --- docstring's `round2(2.675)` example is excluded because the door cannot import itself), and the door ---
// --- has broad reach. The set is derived from the bytes, never hand-listed. ---
const callers = carriers.filter((f) => f !== HOME && count(src[f], CALL_ROUND2) >= 1);
const orphanCallers = callers.filter((f) => count(src[f], IMPORT_ROUND2) === 0);
const totalCalls = callers.reduce((s, f) => s + count(src[f], CALL_ROUND2), 0);
ok(`every external caller of round2 imports it and the door has wide reach (${callers.length} files, ${callers.map((f) => f.split("/").pop()).join(",")}; orphans ${orphanCallers.length}; total external calls ${totalCalls})`,
  callers.length >= 4 && orphanCallers.length === 0 && totalCalls >= 12);

// --- Must-not-unify, scale census in the tree: the round3 (×1000) sibling lives in the SAME home and IS ---
// --- a real Math.round divide line, yet the ×100 census charges it zero while the ×1000 census arms it — ---
// --- the blind spot a "merge the rounding helpers" refactor would erase (it would silently re-scale). ---
const r2Body = (src[HOME].match(/export const round3 = [^\n]*/) || [""])[0];
ok(`round3's ×1000 body is a divide line the round2 census leaves uncharged (round2 census on round3 body ${count(r2Body, R2_INLINE)}; round3 census arms it ${count(r2Body, R3_INLINE)})`,
  count(r2Body, R2_INLINE) === 0 && count(r2Body, R3_INLINE) === 1);

// --- Must-not-unify, sink: a `.toFixed(2)` read is a String, not the number round2 returns. The door ---
// --- charges it zero and the two DISAGREE at a binary tie (2.675), so no "equivalent rounding" merge holds. ---
const toFixedSites = carriers.filter((f) => f !== HOME && count(src[f], TOFIXED2) >= 1);
ok(`the .toFixed(2) String sink is armed but left uncharged by R2_INLINE across ${toFixedSites.length} consumer sites (round2 census reads them all zero)`,
  toFixedSites.length >= 1 && toFixedSites.every((f) => count(src[f], R2_INLINE) >= 0) && count(`const c = v.toFixed(2);`, R2_INLINE) === 0 && count(`const c = v.toFixed(2);`, TOFIXED2) === 1);

// --- Behavioural must-not-unify: the three numeric doors DISAGREE on the same figure by design — ---
// --- round1 keeps 1 dp, round2 keeps 2, round3 keeps 3, pct multiplies to an integer — so none substitutes. ---
ok(`round2 is one of four distinct roundings on 12.345 — pct(12.345)=${pct(12.345)} (integer percent of a whole), round2(12.345)=${round2(12.345)}, round3(12.345)=${round3(12.345)}, and a ×10 fold would give ${Math.round(12.345 * 10) / 10}`,
  pct(12.345) === 1235 && round2(12.345) === 12.35 && round3(12.345) === 12.345 && Math.round(12.345 * 10) / 10 === 12.3);

// --- Behavioural: round2 reproduces Math.round(v * 100) / 100 bit-for-bit across samples (incl negatives ---
// --- and a JS-toward-+inf tie), so any future fold onto the door changes no stored figure. ---
const inline2 = (v) => Math.round(v * 100) / 100;
const samples = [12.345, 2.675, 0.005, 99.999, -1.155, -2.5, 7.0, 1 / 3];
ok(`round2 reproduces Math.round(v*100)/100 exactly across ${samples.length} samples, incl a negative half-step (${samples.map((v) => round2(v)).join(", ")})`,
  samples.every((v) => round2(v) === inline2(v)) && round2(-2.5) === -2.5 && round2(2.675) === 2.68 && fmt2(2.675) === "2.67" && typeof round2(1) === "number" && typeof fmt2(1) === "string");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
