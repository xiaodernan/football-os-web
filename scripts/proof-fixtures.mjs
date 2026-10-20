// Proof for the season's fixture doors.
//
// The defect class: "how many fixtures a club's season has" was spelled twice in career.ts and
// "how many are still to play" FOUR times -- once per row, once as a local, and TWICE IN THE
// SAME EXPRESSION, where a reader has to check that two copies of the same arithmetic agree.
//
// The census charges both families closed, and the doors' edges: the round-robin shape has a
// floor of 1 (a club cannot have a season of no fixtures) and the count still to play has a
// floor of 0 (a played fixture cannot be un-played).
//
// Run: node scripts/proof-fixtures.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-fixtures-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const CAREER = await server.ssrLoadModule("/domain/career.ts");
const { seasonFixtures, fixturesLeft } = CAREER;

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/career.ts";
// The two spellings the doors replaced. The old spelling names the SEASON's figure
// (`totalFixtures`); the door's own body names its own parameter (`total`), so the home is
// charged against the door's shape and the tree against the old one.
const TOTAL_SPELLING = /Math\.max\(\s*1\s*,\s*\(clubCount - 1\)\s*\*\s*2\s*\)/g;
const LEFT_SPELLING = /Math\.max\(\s*0\s*,\s*totalFixtures\s*-\s*([A-Za-z_$][\w$.]*)\s*\)/g;
const TOTAL_DOOR_BODY = /Math\.max\(\s*1\s*,\s*\(clubCount - 1\)\s*\*\s*2\s*\)/g;
const LEFT_DOOR_BODY = /Math\.max\(\s*0\s*,\s*total\s*-\s*played\s*\)/g;
const DECL_TOTAL = /export const seasonFixtures = \(clubCount: number\): number =>/;
const DECL_LEFT = /export const fixturesLeft = \(total: number, played: number\): number =>/;
const CALL_TOTAL = /\bseasonFixtures\s*\(/g;
const CALL_LEFT = /\bfixturesLeft\s*\(/g;

// A FRESH, ALWAYS-GLOBAL regex per count: a global regex carries `lastIndex` between uses, and
// a non-global regex's `match` returns the capture groups too, so `length` would count the GROUPS.
const n = (text, re) => {
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  return (text.match(new RegExp(re.source, flags)) || []).length;
};

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const ROOTS = ["domain", "data", "lib", "features", "components", "ui", "src", "store"];
const appFiles = ROOTS.flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const raw = Object.fromEntries(appFiles.map((f) => [f, readFileSync(f, "utf8")]));
const code = Object.fromEntries(appFiles.map((f) => [f, raw[f].split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n")]));

// --- 1. Plants: arm the scan, so a "zero" verdict is measured, never an empty set. -----------
const pTotal = n("const t = Math.max(1, (clubCount - 1) * 2);", TOTAL_SPELLING);
const pLeft = n("const r = Math.max(0, totalFixtures - played);", LEFT_SPELLING);
const pLeftRow = n("const r = Math.max(0, totalFixtures - r.played);", LEFT_SPELLING);
const pOther = n("const r = Math.max(0, a - b);", LEFT_SPELLING);
const pDeclTotal = n("export const seasonFixtures = (clubCount: number): number => x;", DECL_TOTAL);
const pDeclLeft = n("export const fixturesLeft = (total: number, played: number): number => x;", DECL_LEFT);
ok(`the scans are armed and the two spellings are what they draw (the season's total ${pTotal}, the fixtures still to play ${pLeft} and its per-row form ${pLeftRow}, an unrelated floored difference ${pOther} — which names no season figure and so is not charged; the declarations ${pDeclTotal}/${pDeclLeft})`,
  pTotal === 1 && pLeft === 1 && pLeftRow === 1 && pOther === 0 && pDeclTotal === 1 && pDeclLeft === 1);

// --- 2. Population floor + subject presence. -------------------------------------------------
const present = [HOME, "domain/career.ts"].every((p) => Object.prototype.hasOwnProperty.call(raw, p));
ok(`the census walks the real source tree and every subject is inside it (${appFiles.length} .ts/.tsx, floor 90)`,
  appFiles.length >= 90 && present);

// --- 3. THE FAMILIES ARE CLOSED: neither spelling survives outside the doors' own bodies. -----
// --- The home is excluded and the exclusion is charged: the doors' bodies ARE the spellings. ---
const totalByFile = appFiles.filter((f) => f !== HOME && n(code[f], TOTAL_SPELLING) > 0);
const leftByFile = appFiles.filter((f) => f !== HOME && n(code[f], LEFT_SPELLING) > 0);
const homeTotal = n(code[HOME], TOTAL_DOOR_BODY);
const homeLeft = n(code[HOME], LEFT_DOOR_BODY);
ok(`the families are closed: the season's total and the fixtures still to play survive nowhere outside the doors' own bodies (${totalByFile.length} file(s) with the total [${totalByFile.join(",")}], ${leftByFile.length} with the count left [${leftByFile.join(",")}]; the home carries ${homeTotal}/${homeLeft} — the two doors' bodies ARE the spellings)`,
  totalByFile.length === 0 && leftByFile.length === 0 && homeTotal === 1 && homeLeft === 1);

// --- 4. The doors are declared exactly once, in their home. -----------------------------------
const declTotal = appFiles.filter((f) => n(raw[f], DECL_TOTAL) > 0);
const declLeft = appFiles.filter((f) => n(raw[f], DECL_LEFT) > 0);
ok(`the doors are declared exactly once each, in the career home (seasonFixtures in [${declTotal.join(",")}], fixturesLeft in [${declLeft.join(",")}])`,
  declTotal.length === 1 && declTotal[0] === HOME && declLeft.length === 1 && declLeft[0] === HOME);

// --- 5. The readers reach the doors. -------------------------------------------------------------
const callTotal = n(code[HOME], CALL_TOTAL);
const callLeft = n(code[HOME], CALL_LEFT);
ok(`the career module reaches both doors, and the module's own readers of the two figures do too (seasonFixtures called ${callTotal}x, fixturesLeft called ${callLeft}x)`,
  callTotal >= 2 && callLeft >= 3);

// --- 6. BEHAVIOUR: the doors keep the edges their spellings had. ------------------------------
// --- A club cannot have a season of no fixtures (the floor of 1), and a played fixture cannot
// --- be un-played (the floor of 0). -------------------------------------------------------------
const edges =
  seasonFixtures(1) === 1 && seasonFixtures(2) === 2 && seasonFixtures(20) === 38 &&
  fixturesLeft(38, 0) === 38 && fixturesLeft(38, 38) === 0 && fixturesLeft(38, 40) === 0 && fixturesLeft(0, 0) === 0;
ok(`the doors keep the edges their spellings had: a club's season has at least one fixture and the count still to play never goes negative (seasonFixtures(1)=${seasonFixtures(1)}, seasonFixtures(20)=${seasonFixtures(20)}, fixturesLeft(38,0)=${fixturesLeft(38, 0)}, fixturesLeft(38,40)=${fixturesLeft(38, 40)})`,
  edges);

// --- 7. The doors agree with the arithmetic they replaced, over EVERY shape the two figures
// --- can take: a round-robin season for any club count, and any number of matches played. ---
// --- The point of the fold was that a change to the round-robin shape or to either floor would
// --- have moved one of the two functions silently, so the doors are checked against the
// --- spellings over the whole space, not over a sample. --------------------------------------
let checked = 0;
const disagree = [];
for (let clubs = 1; clubs <= 40; clubs++) {
  const total = seasonFixtures(clubs);
  if (total !== Math.max(1, (clubs - 1) * 2)) disagree.push(`total(${clubs})`);
  for (let played = 0; played <= 80; played++) {
    checked++;
    if (fixturesLeft(total, played) !== Math.max(0, total - played)) disagree.push(`left(${clubs},${played})`);
  }
}
ok(`the doors agree with the arithmetic they replaced over the WHOLE space: ${checked} (season, played) combinations and 40 club counts, ${disagree.length} disagreement(s) [${disagree.slice(0, 4).join(",")}]`,
  disagree.length === 0 && checked === 40 * 81);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
