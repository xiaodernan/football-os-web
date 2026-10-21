// Proof for the season-row credit doors — `creditRecord` / `creditResult` in domain/attributes.ts. The
// "one result credits one row" rule was hand-written four times: analytics' split tally (`finish`,
// loss-tested-first, no points), career's standing-row bump (`bump`, points via the ladder door),
// footballSeed's double-sided table build (home and away in the same statement) and the sim lab's
// round-robin `apply` (flag-test, `void home`). Every one the same bookkeeping, so it is a door now
// (M422). This is also the class M417's exported-body census cannot see: three of the four spellings
// were LOCAL helpers (bump, apply, finish) or inline code, and the alignment measure reads exported
// functions only.
//
// The census charges the rule's spine — a `.played` increment and the `.won`/`.drawn`/`.lost` outcome
// increments, either `++` or `+= 1` — across the whole tree and asserts it appears only in the door, so
// a re-inline at any reader reddens it. The scan keys on the credited-row idioms, not on counting in
// general: career's season summary counts the same outcomes into PLAIN locals inside its fused
// aggregation pass (no dots, no row) — a different spelling, documented as the survivor. Run:
// node scripts/proof-creditresult.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-creditresult-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { creditRecord, creditResult, resultPoints } = await server.ssrLoadModule("/domain/attributes.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/attributes.ts";
const READERS = [
  "domain/analytics.ts", "domain/career.ts", "data/footballSeed.ts",
  "features/sim/SimulationLab.tsx",
];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui", "app"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The rule's spine: the played increment and the outcome increments on a credited row.
const PLAYED = /\.played\s*(?:\+\+|\+=\s*1\b)/g;
const OUTCOME = /\.(?:won|drawn|lost)\s*(?:\+\+|\+=\s*1\b)/g;
const spineCount = (text) => count(text, PLAYED) + count(text, OUTCOME);

// --- Plants: arm the census so a "only the door" verdict is a measurement, and it refuses look-alikes. -
const plantPlayed = spineCount("row.played++;");
const plantPlayedPlus = spineCount("row.played += 1;");
const plantWon = spineCount("row.won++;");
const plantLostPlus = spineCount("row.lost += 1;");
const plantConverted = spineCount("creditRecord(row, a, b); creditResult(row, a, b);");
const plantGames = spineCount("games++; matches++;");
const plantPlainCounter = spineCount("if (diff > 0) won++; else if (diff === 0) drawn++; else lost++;");
ok(`the spine census is armed on both increment spellings and the converted calls, and refuses a bare counter and a plain-local outcome count (played ${plantPlayed}+${plantPlayedPlus}, won ${plantWon}, lost ${plantLostPlus}, converted ${plantConverted}, games ${plantGames}, plain ${plantPlainCounter})`,
  plantPlayed === 1 && plantPlayedPlus === 1 && plantWon === 1 && plantLostPlus === 1 &&
  plantConverted === 0 && plantGames === 0 && plantPlainCounter === 0);

// --- Door declarations: creditRecord and creditResult each declared exactly once, in attributes.ts. -----
const DECL_REC = /\nexport function creditRecord\b/g;
const DECL_RES = /\nexport function creditResult\b/g;
const plantDecl = count(`\nexport function creditRecord(r, a, b) {}`, DECL_REC) +
  count(`\nexport function creditResult(r, a, b) {}`, DECL_RES);
const declRecFiles = carriers.filter((f) => count(src[f], DECL_REC) > 0);
const declResFiles = carriers.filter((f) => count(src[f], DECL_RES) > 0);
ok(`creditRecord and creditResult are each declared exactly once, in the door (planted ${plantDecl}, record ${declRecFiles.join(",") || "none"}, result ${declResFiles.join(",") || "none"})`,
  plantDecl === 2 && declRecFiles.length === 1 && declRecFiles[0] === HOME &&
  declResFiles.length === 1 && declResFiles[0] === HOME);

// --- The record body is the bookkeeping, and the result body rides it plus the ladder door. -------------
const recBody = (src[HOME].match(/export function creditRecord[\s\S]*?\n}/) || [""])[0];
const resBody = (src[HOME].match(/export function creditResult[\s\S]*?\n}/) || [""])[0];
ok(`the record body is the bookkeeping and the result body rides the record door plus the ladder door ("${recBody.replace(/\s+/g, " ").trim().slice(0, 100)}…")`,
  /row\.played\+\+/.test(recBody) && /row\.gf \+= ourGoals/.test(recBody) &&
  /row\.won\+\+/.test(recBody) && /row\.lost\+\+/.test(recBody) &&
  resBody.includes("creditRecord(row, ourGoals, oppGoals)") &&
  resBody.includes("resultPoints(ourGoals, oppGoals)"));

// --- Population floor + every reader present. ----------------------------------------------------------
const present = READERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every reader is inside it (${carriers.length} .ts/.tsx files, ${READERS.length} readers present)`,
  carriers.length >= 80 && present);

// --- Convergence completeness: the spine appears only in the door. --------------------------------------
const treeCount = carriers.reduce((s, f) => s + spineCount(src[f]), 0);
const homeCount = spineCount(src[HOME]);
const readerSpines = READERS.map((f) => [f, spineCount(src[f])]);
ok(`the credit rule's spine appears only in the door — every reader was converted, all four spellings (tree ${treeCount}, home ${homeCount}; readers ${readerSpines.map(([f, n]) => `${f.split("/").pop()}=${n}`).join(",")}; a planted inline would read ${plantPlayed})`,
  plantPlayed === 1 && treeCount === homeCount && homeCount === 4 && readerSpines.every(([, n]) => n === 0));

// --- career's season summary is the documented survivor: plain locals, not a credited row. -------------
const summaryLine = (src["domain/career.ts"].match(/[^\n]*if \(diff > 0\) won\+\+[^\n]*/) || [""])[0];
ok(`career's season summary keeps its plain-local outcome count inside the fused aggregation pass — no row is credited, so the census correctly leaves it ("${summaryLine.trim()}")`,
  summaryLine.includes("won++") && !summaryLine.includes(".won"));

// --- Every reader calls a door and inlines no spine. -----------------------------------------------------
const CALL = /\bcredit(Record|Result)\(/g;
const perCall = READERS.map((f) => [f, count(src[f], CALL)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
ok(`all ${READERS.length} readers call a credit door and inline no spine (per-file ${perCall.map(([f, n]) => `${f.split("/").pop()}=${n}`).join(",")}, total ${totalCalls})`,
  perCall.every(([, n]) => n >= 1) && totalCalls >= 4);

// --- Behavioural: both doors equal all four old spellings on every sample. ------------------------------
const MATCHES = [[2, 1], [1, 1], [0, 3], [0, 0], [5, 4], [3, 3], [1, 0]];
const fresh = () => ({ played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 });
const eqOk = MATCHES.every(([h, a]) => {
  const viaDoor = fresh(); creditRecord(viaDoor, h, a);
  const viaResultDoor = fresh(); creditResult(viaResultDoor, h, a);
  const viaFinish = fresh(); // analytics' old spelling: loss tested first
  viaFinish.played++; viaFinish.gf += h; viaFinish.ga += a;
  if (h > a) viaFinish.won++; else if (h < a) viaFinish.lost++; else viaFinish.drawn++;
  const viaApply = fresh(); // the sim lab's old spelling: flag tested
  const win = h > a;
  viaApply.played++; viaApply.gf += h; viaApply.ga += a;
  if (win) viaApply.won++; else if (h === a) viaApply.drawn++; else viaApply.lost++;
  viaApply.points += resultPoints(h, a);
  const fields = ["played", "won", "drawn", "lost", "gf", "ga"];
  const recordEq = fields.every((k) => viaDoor[k] === viaFinish[k] && viaDoor[k] === viaApply[k]);
  const resultEq = viaResultDoor.points === viaApply.points && fields.every((k) => viaResultDoor[k] === viaApply[k]);
  return recordEq && resultEq;
});
const conservationOk = (() => {
  const h = fresh(), a = fresh();
  creditResult(h, 2, 1); creditResult(a, 1, 2);
  const d1 = fresh(), d2 = fresh();
  creditResult(d1, 1, 1); creditResult(d2, 1, 1);
  return h.points + a.points === 3 && d1.points + d2.points === 2 && h.won === 1 && a.lost === 1 && d1.drawn === 1;
})();
ok(`both doors equal all four old spellings on every sample (loss-first, flag, points via the ladder) and a double-sided match credits three points to the winner or one to each`, eqOk && conservationOk);

// --- Integration: the converted sites' shapes — a split tally, a standing table, a round robin. --------
const split = fresh();
creditRecord(split, 3, 1); creditRecord(split, 0, 0); creditRecord(split, 1, 2);
const table = [fresh(), fresh()];
creditResult(table[0], 2, 0); creditResult(table[1], 0, 2);
creditResult(table[0], 1, 1); creditResult(table[1], 1, 1);
const best = table.reduce((b, r) => (r.points > b.points ? r : b), table[0]);
ok(`the doors reproduce the converted sites' shapes — the split tally (W D L), the double-sided table (3 points to the winner, 1 each on the draw) (split ${split.won}/${split.drawn}/${split.lost}, leader points ${best.points})`,
  split.won === 1 && split.drawn === 1 && split.lost === 1 && split.played === 3 &&
  best.points === 4 && table[0].gf === 3 && table[1].gf === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
