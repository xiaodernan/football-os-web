// Proof for the headroom door.
//
// The defect class: "the growth still available before the ceiling" was written three times.
// The scouting module exported it as `headroom(player)`; the world engine's development step and
// the career arc's annual change each kept a PRIVATE COPY of the same line — byte-identical, so
// the three agreed today, and the same drift risk the comparators (M376–M381) and the pricing
// curve (M385) retired: a change to what "headroom" means would have had to be found in three
// places, and would have been made in one.
//
// The door is SCALAR-shaped, `headroomOf(potential, overall)`, and it lives in
// domain/attributes.ts beside the other numeric domain doors. The shape is the two numbers rather
// than the player because the career arc works on a record of
// `{ age, overall, potential, peakAge }` and has no player to hand; the scouting module's
// player-shaped `headroom` is the same door with the player's own fields read off it.
//
// The census charges the family closed: the inline form survives NOWHERE in the app, the door is
// declared once, the three readers reach it, and the door's body is the formula it replaced.
//
// Run: node scripts/proof-headroom.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-headroom-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { headroomOf } = await server.ssrLoadModule("/domain/attributes.ts");
const { headroom } = await server.ssrLoadModule("/domain/scouting.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/attributes.ts";
const PLAYER_SHAPE = "domain/scouting.ts";
const READERS = ["domain/scouting.ts", "domain/worldEngine.ts", "domain/careerArc.ts"];
// The inline form the door replaced: a potential-minus-overall, floored at zero. The operands are
// named, because the broader "any floored difference" is a DIFFERENT family with its own
// survivors (a remaining-fixture count, a gap to the projected leader, years to peak, a
// criticality above the role floor) and charging those as headroom would be charging a defect
// that is not there.
const INLINE = /Math\.max\(\s*0\s*,\s*((?:[A-Za-z_$][\w$]*\.)?potential)\s*-\s*((?:[A-Za-z_$][\w$]*\.)?overall)\s*\)/g;
// The broader family: ANY floored difference. Its survivors are pinned below, so a NEW one is
// measured rather than excused.
const FLOORED = /Math\.max\(\s*0\s*,\s*([A-Za-z_$][\w$.]*)\s*-\s*([A-Za-z_$][\w$.]*)\s*\)/g;
// The floored-difference family that is NOT headroom, pinned by file. Each is a different
// concept: the door's own body, career.ts's fixtures-left door and its gap to the projected
// leader, careerArc.ts's years to peak, gap.ts's criticality above the role floor. M414 folded
// career.ts's four remaining-fixture spellings into `fixturesLeft`, so that file now carries two
// matching shapes, not five; the pin follows the fold instead of the file it used to be.
const FLOORED_PINS = {
  "domain/attributes.ts": 1, "domain/career.ts": 2, "domain/careerArc.ts": 1, "domain/gap.ts": 1,
};

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const raw = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const code = Object.fromEntries(carriers.map((f) => [f, raw[f].split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n")]));
const n = (text, re) => (text.match(re) || []).length;
const DECL = /export const headroomOf\s*=\s*\(potential: number, overall: number\): number =>/;
const CALL = /\bheadroomOf\s*\(/g;
const IMPORT = /import[^;]*\bheadroomOf\b[^;]*from ["'][^"']*attributes["']/;

// --- 1. Plants: arm the scan, so a "zero"/"three" verdict is measured, never an empty set. -----
const pInline = n("const h = Math.max(0, potential - overall);", INLINE);
const pInlinePlayer = n("const h = Math.max(0, p.potential - p.overall);", INLINE);
const pInlineOther = n("const h = Math.max(0, a - b);", INLINE);
const pFloored = n("const h = Math.max(0, a - b);", FLOORED);
const pDecl = n("export const headroomOf = (potential: number, overall: number): number => x;", DECL);
const pCall = n("const h = headroomOf(p.potential, p.overall);", CALL);
const pImport = n('import { headroomOf } from "@/domain/attributes";', IMPORT);
ok(`the scans are armed and the headroom shape is what draws the line (the shape itself ${pInline}, the player-shaped spelling ${pInlinePlayer}, an unrelated subtraction ${pInlineOther} — which the headroom scan must NOT charge — and the broader floored-difference scan reads it ${pFloored}; the declaration ${pDecl}, a call ${pCall}, an import ${pImport})`,
  pInline === 1 && pInlinePlayer === 1 && pInlineOther === 0 && pFloored === 1 &&
  pDecl === 1 && pCall === 1 && pImport === 1);

// --- 2. Population floor + subject presence. -------------------------------------------------
const present = READERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(raw, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx, floor 90)`,
  carriers.length >= 90 && present);

// --- 3. THE HEADROOM FAMILY IS CLOSED: the inline form survives nowhere in the app. The door's
// --- own body IS the inline form, so the home is excluded -- and the exclusion is charged, not
// --- assumed. The BROADER floored-difference family is charged beside it, because it has four
// --- survivors that are different concepts and a census that could not tell them apart would
// --- either charge them as headroom or lose the ability to see a new one. ---------------------
const inlineByFile = carriers.filter((f) => f !== HOME && n(code[f], INLINE) > 0);
const inlineTotal = carriers.reduce((s, f) => s + (f === HOME ? 0 : n(code[f], INLINE)), 0);
const homeInline = n(code[HOME], INLINE);
// The floored-difference family: the door's body, plus the seven named survivors.
const flooredByFile = carriers.map((f) => [f, n(code[f], FLOORED)]).filter(([, c]) => c > 0).sort();
const flooredTotal = flooredByFile.reduce((s, [, c]) => s + c, 0);
const flooredPinsHold = flooredByFile.every(([f, c]) => (FLOORED_PINS[f] ?? 0) === c);
const flooredStrays = flooredByFile.filter(([f]) => !(f in FLOORED_PINS) || FLOORED_PINS[f] !== flooredByFile.find(([g]) => g === f)[1]);
ok(`the headroom family is closed: the inline form survives nowhere outside the door's own body (${inlineTotal} site(s) outside [${inlineByFile.join(",")}]; the home carries ${homeInline} — the door's body IS the formula), and the broader floored-difference family is pinned beside it (${flooredTotal} site(s) over ${flooredByFile.length} file(s) [${flooredByFile.map(([f, c]) => `${f.split("/").pop()}=${c}`).join(", ")}]; pins hold ${flooredPinsHold}, strays ${flooredStrays.length} [${flooredStrays.map(([f]) => f).join(",")}])`,
  inlineTotal === 0 && inlineByFile.length === 0 && homeInline === 1 &&
  flooredTotal === 5 && flooredPinsHold && flooredStrays.length === 0);

// --- 4. The door is declared exactly once, and only in the home. ------------------------------
const declByFile = carriers.filter((f) => n(raw[f], DECL) > 0);
ok(`the door is declared exactly once, in the attributes home, and no module re-declared a private copy (home ${n(raw[HOME], DECL)}, tree [${declByFile.join(",")}])`,
  n(raw[HOME], DECL) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- 5. All three readers reach the door, and each imports it from the home. ------------------
// --- A reader that called the door without importing it would be a runtime failure, so the
// --- import is charged per file, not just the call. -------------------------------------------
const readerCalls = READERS.map((f) => [f, n(code[f], CALL), n(code[f], IMPORT)]);
const readerOk = readerCalls.every(([, c, i]) => c >= 1 && i >= 1);
ok(`all three readers reach the door and each imports it from the home (${readerCalls.map(([f, c, i]) => `${f.split("/").pop()}=${c}call/${i}import`).join(", ")})`,
  readerOk && readerCalls.length === 3);

// --- 6. The player-shaped door is the SAME door, not a second formula. ------------------------
const p1 = { potential: 84, overall: 62 };
const p2 = { potential: 60, overall: 60 };
const p3 = { potential: 40, overall: 70 };
ok(`the player-shaped door IS the scalar door: headroom(player) equals headroomOf(potential, overall) on every case, and neither can go negative (headroom(p1) = ${headroom(p1)}, headroom(p2) = ${headroom(p2)}, headroom(p3) = ${headroom(p3)})`,
  headroom(p1) === headroomOf(p1.potential, p1.overall) &&
  headroom(p2) === headroomOf(p2.potential, p2.overall) &&
  headroom(p3) === headroomOf(p3.potential, p3.overall) &&
  headroom(p3) === 0 && headroomOf(50, 80) === 0);

// --- 7. The door's body is the formula it replaced, byte for byte. ----------------------------
const doorBody = (raw[HOME].match(/export const headroomOf[^\n]*/) || [""])[0];
const samples = [0, 1, 22, 22.5, -3, 99];
ok(`the door's body is the formula it replaced, byte for byte, and it is never negative (body "${doorBody.trim()}"; ${samples.length} samples agree with the inline form: ${samples.every((v) => headroomOf(v + 10, 10) === Math.max(0, v + 10 - 10))})`,
  doorBody.trim() === "export const headroomOf = (potential: number, overall: number): number => Math.max(0, potential - overall);" &&
  samples.every((v) => headroomOf(v, 0) === Math.max(0, v - 0)) &&
  headroomOf(10, 99) === 0);

// --- 8. Planted companion for the zero above: a headroom that is NOT zero, and a case where the
// --- UNFLOORED difference WOULD be negative. Without them "never negative" would be true of a
// --- door that answered zero every time, and the zero would be a vacuous claim. ---------------
const positive = headroomOf(90, 40);
const unfloored = 40 - 90;
ok(`planted companion: the door answers a positive headroom where there is one, and the floor is load-bearing (headroomOf(90, 40) = ${positive}, so the door is not a constant zero; at headroomOf(40, 90) the unfloored difference would be ${unfloored} and the door reads ${headroomOf(40, 90)})`,
  positive === 50 && unfloored === -50 && headroomOf(40, 90) === 0);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
