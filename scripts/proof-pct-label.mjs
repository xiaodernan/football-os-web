// Proof for the shared percent-LABEL door (`pctLabel`, declared once in lib/utils.ts as a 0..1
// fraction rendered as an integer followed by a literal percent sign — `${Math.round(ratio * 100)}%`).
// The door already had ~20 call sites across the manager/sim/football/transfer/profile/film screens,
// but NO census of its own. M370 folds the LAST hand-spelled inline sibling — AppShell's level bar
// width `${Math.round(info.progress * 100)}%` — onto the door and gives pctLabel a proof, so the
// integer-percent-LABEL shape survives nowhere in shipped source but the door's own home.
//
// pctLabel shares ONLY the `${Math.round(<expr> * 100)}%` template. Two doors must NOT be folded in,
// and this proof charges each of them zero from three directions:
//   · `pct` (lib/utils) returns the bare INTEGER `Math.round(ratio * 100)` for an i18n var — no
//     surrounding backticks and no `%`, so the census (anchored on the `\`$\{Math\.round(` template
//     opener) cannot see it.
//   · `pctOf` (lib/utils) keeps the RAW FRACTIONAL precision a CSS length needs — `${(value / max) *
//     100}%` — it opens the interpolation with `${(` and never calls Math.round; folding it onto
//     pctLabel would round a bar's width to whole percents. Same for a clamp-guarded fill
//     `${Math.max(2, … * 100)}%` / `${Math.min(100, … * 100)}%`, which opens `${Math.max(`/`${Math.min(`.
// Discriminator is structural: the label form opens `\`${Math.round(`; the guarded/unrounded/integer
// siblings open `\`${(`, `\`${Math.max(`, `\`${Math.min(`, or no template at all — so a naive census
// that folded on `* 100` alone would swallow all of them. Behaviourally the three doors disagree on
// the SAME fraction: pctLabel(1/3)="33%", pctOf(1,3)="33.33…%", pct(1/3)=33 — proving none substitutes.
// scripts/ and dev/ are not walked, so the plants arm the scans instead of entering the census, and a
// re-inline of the label shape in ANY shipped file reddens clause 4/5 instead of being excused.
// Run: node scripts/proof-pct-label.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Loading a pure helper through Vite SSR still routes through the module runner, which waits on the
// shared dep-optimizer a concurrent `npm run build` / the other writer's dev server churn (the repo's
// `.vite/deps` gets locked/cleared/re-optimized, stalling ssrLoadModule at the runner's fixed 60s
// timeout). Two defenses: an owned cacheDir OUTSIDE the repo (per-PID, so the witness arms' children
// never collide) plus noDiscovery/empty include to skip pre-bundle and let Node resolve clsx externally.
const server = await createServer({
  cacheDir: join(tmpdir(), `proof-pct-label-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { pctLabel, pct, pctOf } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
// The M370 subject — the last file that hand-spelled the integer-percent label.
const SUBJECT = "features/shell/AppShell.tsx";
// Clean files carrying a GUARDED percent-FILL (Math.max floor / Math.min ceiling) — must-not-unify
// siblings for the door; the label census must charge every one of them zero.
const GUARDED_FILL = ["features/load/LoadPage.tsx", "features/scouting/ScoutingPanel.tsx", "features/film/FilmRoom.tsx"];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "ui", "app", "i18n"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The integer-percent LABEL template: opens `` `${Math.round(` ``, nests at most two paren levels in
// the ratio argument (a caller like `Math.round(((career.morale + 1) / 2) * 100)` is a legal label
// shape the census must not be blind to), and closes `…* 100)}%` ``. The `\`` and `${Math.round(`
// anchors make the guarded (`${Math.max(` / `${Math.min(`), unrounded (`${(`) and integer-return
// (`Math.round(…)` no template) siblings structurally invisible to it. The two-level argument body is
// shared by INLINE_LABEL and LOCAL_SHADOW so both read the identical shape.
const ARG2 = String.raw`(?:[^()]|\((?:[^()]|\([^()]*\))*\))*`;
const INLINE_LABEL = new RegExp(String.raw`` + "`" + String.raw`\$\{Math\.round\(` + ARG2 + String.raw`\* *100 *\)\}%` + "`", "g");
const DECL_PCTLABEL = /\nexport const pctLabel\s*=\s*\(ratio: number\): string =>/g;
const IMPORT_PCTLABEL = /import[^;]*\bpctLabel\b[^;]*from ["']@\/lib\/utils["']/g;
const CALL_PCTLABEL = /\bpctLabel\(/g; // invocations only: the door's `pctLabel = (` and an import's `, pctLabel`/`pctLabel }` lack `pctLabel(`.
// The byte-identical PRIVATE shadow the two screens used to carry before the door (`const pct = (v) =>
// \`${Math.round(v * 100)}%\``). Its reappearance would re-spell the label shape while hiding behind a
// local name, so the census charges it zero tree-wide even though the bare `pct` NUMBER door is legal.
const LOCAL_SHADOW = new RegExp(String.raw`const pct\s*=\s*\([^)]*\)\s*=>\s*` + "`" + String.raw`\$\{Math\.round\(` + ARG2 + String.raw`\* *100 *\)\}%` + "`", "g");
// A guarded percent-FILL line: Math.max/Math.min-wrapped interpolation ending `…* 100)}` — the fills
// the label door must NOT claim, yet must positively detect as present-but-uncharged.
const GUARD_LINE = (l) => /Math\.(?:max|min)\(/.test(l) && /\* *100\)\}/.test(l);
const guardLines = (text) => text.split(/\r?\n/).filter(GUARD_LINE).length;

// --- Plants: arm every scan so a "once"/"only"/"survives" verdict is a measurement, never an empty set. ---
const pDecl = count(`\nexport const pctLabel = (ratio: number): string => x;`, DECL_PCTLABEL);
const pImport = count(`import { cn, pctLabel } from "@/lib/utils";`, IMPORT_PCTLABEL);
const pCall = count(`style={{ width: pctLabel(info.progress) }}`, CALL_PCTLABEL);
const pInline = count(`style={{ width: \`\${Math.round(info.progress * 100)}%\` }}`, INLINE_LABEL);
const pInlineDeep = count(`value={\`\${Math.round(((a + 1) / 2) * 100)}%\`}`, INLINE_LABEL);
// Must-not-unify plants the label census must charge ZERO, each a distinct sibling shape:
const pPctInt = count(`const shown = Math.round(ratio * 100);`, INLINE_LABEL); // bare integer, no template/%
const pPctOfFrac = count(`style={{ width: \`\${(value / max) * 100}%\` }}`, INLINE_LABEL); // unrounded `${(`
const pGuardMax = count(`style={{ width: \`\${Math.max(2, (a / b) * 100)}%\` }}`, INLINE_LABEL); // clamped floor
const pGuardMin = count(`style={{ width: \`\${Math.min(100, (a / b) * 100)}%\` }}`, INLINE_LABEL); // clamped ceiling
const pShadow = count(`const pct = (v: number) => \`\${Math.round(v * 100)}%\`;`, LOCAL_SHADOW);
const pGuardLine = guardLines(`style={{ width: \`\${Math.max(2, (a / b) * 100)}%\` }}`);
ok(`the pctLabel scans are armed (decl ${pDecl}, import ${pImport}, call ${pCall}, inline ${pInline}, inline-deep ${pInlineDeep}) and every must-not-unify sibling reads uncharged by INLINE_LABEL (integer ${pPctInt}, unrounded ${pPctOfFrac}, clamp-max ${pGuardMax}, clamp-min ${pGuardMin}, shadow ${pShadow}) yet the guard line is armed by GUARD_LINE (${pGuardLine})`,
  pDecl === 1 && pImport === 1 && pCall === 1 && pInline === 1 && pInlineDeep === 1 &&
  pPctInt === 0 && pPctOfFrac === 0 && pGuardMax === 0 && pGuardMin === 0 && pShadow === 1 && pGuardLine === 1);

// --- Population floor + subject presence (a blind walk would read an empty tree and pass a negative claim). ---
const present = [HOME, SUBJECT].every((p) => Object.prototype.hasOwnProperty.call(src, p));
const guardedPresent = GUARDED_FILL.every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx, floor 80; home+subject+${GUARDED_FILL.length} guarded-fill files present)`,
  carriers.length >= 80 && present && guardedPresent);

// --- Structural: the pctLabel door is declared exactly once, and only in its home. ---
const declByFile = carriers.filter((f) => count(src[f], DECL_PCTLABEL) > 0);
ok(`pctLabel is declared exactly once, in the lib/utils door (home ${count(src[HOME], DECL_PCTLABEL)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_PCTLABEL) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- Reach + convergence: the ONLY shipped file that carries the integer-percent label template is the ---
// --- door's home (its body plus the doc comment that names it); every consumer feature file spells zero. ---
const inlineFiles = carriers.filter((f) => count(src[f], INLINE_LABEL) > 0);
const strays = inlineFiles.filter((f) => f !== HOME);
const doorBody = (src[HOME].match(/export const pctLabel = [^\n]*/) || [""])[0];
ok(`the integer-percent label survives only inside the door's home — body IS the canonical shape, no stray re-spells it (${inlineFiles.join(",")}; home occurrences ${count(src[HOME], INLINE_LABEL)}; strays ${strays.length}; body "${doorBody.trim()}")`,
  count(src[HOME], INLINE_LABEL) >= 1 && inlineFiles.length === 1 && inlineFiles[0] === HOME && strays.length === 0 &&
  /export const pctLabel = \(ratio: number\): string => `\$\{Math\.round\(ratio \* 100\)\}%`;/.test(doorBody.trim()));

// --- The M370 subject: AppShell reads the door, calls it, and hand-spells the label shape nowhere. ---
const subjectImports = count(src[SUBJECT], IMPORT_PCTLABEL) >= 1;
const subjectCalls = count(src[SUBJECT], CALL_PCTLABEL);
const subjectInline = count(src[SUBJECT], INLINE_LABEL);
ok(`AppShell now reads the door and re-inlines nothing (imports ${subjectImports}, pctLabel calls ${subjectCalls}, inline label ${subjectInline})`,
  subjectImports && subjectCalls >= 1 && subjectInline === 0);

// --- Derived consumer census: every shipped file that CALLS pctLabel also IMPORTS it, no call is orphaned, ---
// --- and the door has broad reach (>= 20 invocations). The set is derived from the bytes, never hand-listed. ---
const callers = carriers.filter((f) => count(src[f], CALL_PCTLABEL) >= 1);
const orphanCallers = callers.filter((f) => count(src[f], IMPORT_PCTLABEL) === 0);
const totalCalls = callers.reduce((s, f) => s + count(src[f], CALL_PCTLABEL), 0);
ok(`every caller of pctLabel imports it and the door has wide reach (${callers.length} files, ${callers.map((f) => f.split("/").pop()).join(",")}; orphans ${orphanCallers.length}; total calls ${totalCalls})`,
  callers.length >= 6 && orphanCallers.length === 0 && totalCalls >= 20 && callers.includes(SUBJECT));

// --- Must-not-unify, discrimination in the tree: the guarded-fill files DO carry a `…* 100)}` percent fill ---
// --- that a naive `* 100` census would fold onto the label door, yet INLINE_LABEL charges every one zero. ---
const guardedArmed = GUARDED_FILL.filter((f) => guardLines(src[f]) >= 1);
const guardedUncharged = GUARDED_FILL.filter((f) => count(src[f], INLINE_LABEL) === 0);
ok(`guarded percent-fills are armed by GUARD_LINE but left uncharged by INLINE_LABEL in all ${GUARDED_FILL.length} files (armed ${guardedArmed.length}/${GUARDED_FILL.length}, uncharged ${guardedUncharged.length}/${GUARDED_FILL.length} — a blind spot a naive fold would swallow)`,
  guardedArmed.length === GUARDED_FILL.length && guardedUncharged.length === GUARDED_FILL.length);

// --- No private shadow resurfaced: the two screens' old `const pct = (v) => \`${Math.round(v*100)}%\`` ---
// --- helper is gone tree-wide (both folded onto the door), yet the plant proves the scan could read it. ---
const shadowFiles = carriers.filter((f) => count(src[f], LOCAL_SHADOW) > 0);
const plantShadow = count(`const pct = (v: number) => \`\${Math.round(v * 100)}%\`;`, LOCAL_SHADOW);
ok(`no shipped file re-declares the byte-identical private label helper (carriers ${shadowFiles.join(",") || "none"}; planted shadow reads ${plantShadow})`,
  plantShadow === 1 && shadowFiles.length === 0);

// --- Behavioural: pctLabel reproduces the removed inline template byte-for-byte across samples. ---
const inlineLabel = (ratio) => `${Math.round(ratio * 100)}%`;
const samples = [0.5, 1 / 3, 0.999, 0, 0.7, 2 / 3, 0.049];
ok(`pctLabel(ratio) equals the removed inline template byte-for-byte across samples (${samples.map((r) => pctLabel(r)).join(", ")})`,
  samples.every((r) => pctLabel(r) === inlineLabel(r)));

// --- Behavioural must-not-unify: the three doors DISAGREE on the same fraction, so none substitutes ---
// --- for another — the fold that looked free (pctLabel vs pctOf on a bar width) would round the fill, ---
// --- and the swap that looked free (pctLabel vs pct in a var) would append a stray percent sign. ---
ok(`pctLabel, pctOf and pct are three distinct doors on the same input — pctLabel(1/3)="${pctLabel(1 / 3)}" (integer, rounded), pctOf(1,3)="${pctOf(1, 3)}" (fractional, unrounded), pct(1/3)=${pct(1 / 3)} (bare number, no %); pctLabel never equals pctOf's fill nor the bare pct`,
  pctLabel(1 / 3) === "33%" && pctOf(1, 3) === `${(1 / 3) * 100}%` && pctOf(1, 3) !== pctLabel(1 / 3) &&
  pct(1 / 3) === 33 && pctLabel(1 / 3) !== `${pct(1 / 3)}` && typeof pct(1 / 3) === "number" && typeof pctLabel(1 / 3) === "string");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
