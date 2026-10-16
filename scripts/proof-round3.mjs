// Proof for the shared round-to-3-decimal-places door (`round3`, declared once in lib/utils.ts as
// `Math.round(v * 1000) / 1000`). The scale family beyond round1 has three doors that coexist in two
// homes — round1 (×10) in domain/scouting, and round2 (×100) / round3 (×1000) in lib/utils. M363 gave
// round1 a census, M371 gave the ×100 door round2 its own, but the ×1000 door itself still had no
// proof of its own: round3 spreads over two consumers (analytics, matchProbability) yet scripts/ never
// proved it was declared once, hand-spelled nowhere outside its body, and imported by every caller.
// This unit closes that debt — a purely additive census, editing NO shipped source and NO lib/utils door.
//
// round3 shares ONLY the ×1000-and-divide shape. Three siblings must NOT be folded in, charged zero
// from every angle this proof can reach:
//   · round1 (×10) and round2 (×100) — different decimal precisions; the `* 1000)` and `/ 1000\b` anchors
//     reject the shorter `* 10) / 10` and `* 100) / 100` spellings.
//   · pct (`Math.round(ratio * 100)`) — MULTIPLIES to an integer for a percent figure and never divides;
//     the round3 census anchors on the `/ 1000` tail, so a non-dividing multiply is invisible to it.
//   · `.toFixed(3)` — a String sink with a different rounding rule and return type. round3 has NO such
//     twin anywhere in the tree; the sink clause proves the scan WOULD see one (via a plant) and that the
//     numeric census would leave it uncharged, so the absence is a measurement rather than blindness.
// scripts/ and dev/ are not walked, so the plants arm the scans instead of entering the census, and a
// hand-inlined `Math.round(x * 1000) / 1000` in ANY shipped file reddens the convergence clause.
// Run: node scripts/proof-round3.mjs
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
  cacheDir: join(tmpdir(), `proof-round3-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { round2, round3, pct } = await server.ssrLoadModule("/lib/utils.ts");

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

// The ×1000-and-divide formula in its inlined spelling. The argument body nests at most two paren levels
// so a caller like `Math.round(((a + 1) / 2) * 1000) / 1000` is never blind-spotted. The `\* *1000\)` and
// `/ *1000\b` anchors reject ×10 (round1) and ×100 (round2), and reject a bare `Math.round(x*100)` (pct)
// that never divides.
const ARG2 = String.raw`(?:[^()]|\((?:[^()]|\([^()]*\))*\))*`;
const R3_INLINE = new RegExp(String.raw`Math\.round\(` + ARG2 + String.raw`\* *1000\) *\/ *1000\b`, "g");
const R2_INLINE = new RegExp(String.raw`Math\.round\(` + ARG2 + String.raw`\* *100\) *\/ *100\b`, "g");
const R1_INLINE = new RegExp(String.raw`Math\.round\(` + ARG2 + String.raw`\* *10\) *\/ *10\b`, "g");
const DECL_ROUND3 = /\nexport const round3\s*=\s*\(v: number\): number =>/g;
const IMPORT_ROUND3 = /import[^;]*\bround3\b[^;]*from ["']@\/lib\/utils["']/g;
const CALL_ROUND3 = /\bround3\(/g; // invocations only: the door's `round3 = (` and an import's `, round3`/`round3 }` lack `round3(`.
const TOFIXED3 = /\.toFixed\(3\)/g; // the String-sink shape round3 has no twin of, but must not swallow.

// --- Plants: arm every scan so a "once"/"only"/"survives" verdict is a measurement, never an empty set. ---
const pDecl = count(`\nexport const round3 = (v: number): number => x;`, DECL_ROUND3);
const pImport = count(`import { clamp, round3 } from "@/lib/utils";`, IMPORT_ROUND3);
const pCall = count(`const r = round3(ppg(r));`, CALL_ROUND3);
const pInline = count(`const x = Math.round(v * 1000) / 1000;`, R3_INLINE);
const pInlineDeep = count(`const x = Math.round(((a + 1) / 2) * 1000) / 1000;`, R3_INLINE);
// Must-not-unify siblings the round3 census must charge ZERO, each armed by its OWN scan:
const pR2 = count(`const x = Math.round(v * 100) / 100;`, R3_INLINE);
const pR2armed = count(`const x = Math.round(v * 100) / 100;`, R2_INLINE);
const pR1 = count(`const x = Math.round(n * 10) / 10;`, R3_INLINE);
const pR1armed = count(`const x = Math.round(n * 10) / 10;`, R1_INLINE);
const pPct = count(`const shown = Math.round(ratio * 100);`, R3_INLINE); // multiplies, never divides
const pFmt = count(`const cell = value.toFixed(3);`, TOFIXED3);
ok(`the round3 scans are armed (decl ${pDecl}, import ${pImport}, call ${pCall}, inline ${pInline}, inline-deep ${pInlineDeep}) and every scale/type sibling reads uncharged by R3_INLINE (round1 ${pR1}, round2 ${pR2}, pct ${pPct}) while its own scan arms them (round1 ${pR1armed}, round2 ${pR2armed}) and the toFixed(3) sink is armed (${pFmt})`,
  pDecl === 1 && pImport === 1 && pCall === 1 && pInline === 1 && pInlineDeep === 1 &&
  pR2 === 0 && pR2armed === 1 && pR1 === 0 && pR1armed === 1 && pPct === 0 && pFmt === 1);

// --- Population floor + subject presence (a blind walk would read an empty tree and pass a negative claim). ---
const present = [HOME, "domain/analytics.ts", "domain/matchProbability.ts"].every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and the round3 consumers are inside it (${carriers.length} .ts/.tsx, floor 80)`,
  carriers.length >= 80 && present);

// --- Structural: the round3 door is declared exactly once, and only in its home. ---
const declByFile = carriers.filter((f) => count(src[f], DECL_ROUND3) > 0);
ok(`round3 is declared exactly once, in the lib/utils door (home ${count(src[HOME], DECL_ROUND3)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_ROUND3) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- Reach guard on the door: the ×1000-and-divide formula appears EXACTLY once in lib/utils — the round3 ---
// --- body. Its round2 sibling (×100) and every docstring mention stay uncharged by R3_INLINE. ---
const doorBody = (src[HOME].match(/export const round3 = [^\n]*/) || [""])[0];
ok(`the door body IS the ×1000 formula and it is the sole such line in lib/utils (home ×1000 ${count(src[HOME], R3_INLINE)}, body "${doorBody.trim()}")`,
  count(src[HOME], R3_INLINE) === 1 && /export const round3 = \(v: number\): number => Math\.round\(v \* 1000\) \/ 1000;/.test(doorBody.trim()));

// --- Convergence completeness: outside the door's home, the ×1000-and-divide formula survives nowhere. ---
const inlineFiles = carriers.filter((f) => count(src[f], R3_INLINE) > 0);
const strays = inlineFiles.filter((f) => f !== HOME);
const plantStray = count(`const x = Math.round(v * 1000) / 1000;`, R3_INLINE);
ok(`the round-to-3dp formula survives only in the door's body — no shipped file re-inlines it (carriers ${inlineFiles.join(",")}; strays ${strays.length}; a planted inline would read ${plantStray})`,
  plantStray === 1 && inlineFiles.length === 1 && inlineFiles[0] === HOME && strays.length === 0);

// --- Derived consumer census: every shipped file that CALLS round3 IMPORTS it (no orphan call — the HOME ---
// --- docstring and the `round3 = (v: number)` declaration line lack the `round3(` call shape), and every ---
// --- caller is inside the walk. The set is derived from the bytes, never hand-listed. ---
const callers = carriers.filter((f) => f !== HOME && count(src[f], CALL_ROUND3) >= 1);
const orphanCallers = callers.filter((f) => count(src[f], IMPORT_ROUND3) === 0);
const totalCalls = callers.reduce((s, f) => s + count(src[f], CALL_ROUND3), 0);
ok(`every external caller of round3 imports it and the door has reach (${callers.length} files, ${callers.map((f) => f.split("/").pop()).join(",")}; orphans ${orphanCallers.length}; total external calls ${totalCalls})`,
  callers.length >= 2 && orphanCallers.length === 0 && totalCalls >= 12);

// --- Must-not-unify, scale census in the tree: the round2 (×100) sibling lives in the SAME home and IS ---
// --- a real Math.round divide line, yet the ×1000 census charges it zero while the ×100 census arms it — ---
// --- the blind spot a "merge the rounding helpers" refactor would erase (it would silently re-scale). ---
const r2Body = (src[HOME].match(/export const round2 = [^\n]*/) || [""])[0];
ok(`round2's ×100 body is a divide line the round3 census leaves uncharged (round3 census on round2 body ${count(r2Body, R3_INLINE)}; round2 census arms it ${count(r2Body, R2_INLINE)})`,
  count(r2Body, R3_INLINE) === 0 && count(r2Body, R2_INLINE) === 1);

// --- Must-not-unify, sink: round3 keeps 3 dp as a Number; the round2/round1 siblings keep 2/1 — so no ---
// --- shared helper would reproduce all three precisions from one door (it would silently re-scale). ---
const r3OnlyHome = count(src[HOME], R3_INLINE) === 1;
ok(`round1, round2 and round3 keep 1, 2 and 3 dp on 12.3456 while ×10/×100/×1000 are three scales the round3 census keeps apart (door ×1000 in home ${r3OnlyHome}; ×100/×10 uncharged by R3_INLINE)`,
  round3(12.3456) === 12.346 && round2(12.3456) === 12.35 && Math.round(12.3456 * 10) / 10 === 12.3 && r3OnlyHome);

// --- Must-not-unify, absence is a measurement: round3 has no `.toFixed(3)` String-sink twin anywhere in the ---
// --- tree, and even the shape it lacks would read uncharged by the numeric census — so "0 found" here means ---
// --- "read every spelling and there are none", not "the scan can't see toFixed at all". ---
const toFixed3Sites = carriers.filter((f) => f !== HOME && count(src[f], TOFIXED3) >= 1);
const plantFmtUnderR3 = count(`const c = v.toFixed(3);`, R3_INLINE);
ok(`round3 has no .toFixed(3) String-sink twin in the tree and its numeric census would leave one uncharged (toFixed(3) sites ${toFixed3Sites.length}; a planted one reads TOFIXED3 ${pFmt} and R3_INLINE ${plantFmtUnderR3}; round3 returns a Number, toFixed a String)`,
  toFixed3Sites.length === 0 && pFmt === 1 && plantFmtUnderR3 === 0 && typeof round3(2.345) === "number" && typeof (2.345).toFixed(3) === "string");

// --- Behavioural: round3 reproduces Math.round(v * 1000) / 1000 bit-for-bit across samples (incl a negative ---
// --- half-step), and is one of four distinct roundings on 12.3456 (pct integer, ×10, ×100, ×1000). ---
const inline3 = (v) => Math.round(v * 1000) / 1000;
const samples = [12.3456, 0.0005, 2.3455, -1.1555, 99.9995, 7.0, 1 / 3, 0.000001];
ok(`round3 reproduces Math.round(v*1000)/1000 exactly across ${samples.length} samples incl a negative half-step (${samples.map((v) => round3(v)).join(", ")}); pct(12.3456)=${pct(12.3456)} is a fifth, integer-only figure`,
  samples.every((v) => round3(v) === inline3(v)) && round3(-2.5) === -2.5 && typeof round3(1) === "number" && pct(12.3456) === 1235);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
