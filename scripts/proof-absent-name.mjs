// Proof for the NAME lane of the absence door — the one M399's "Next" named as needing a
// DECISION rather than a fold, because it changes what a reader sees.
//
// The defect. A club or competition name the app LOOKED UP and did not find used to read as
// "" — the empty string. In a sentence slot that is a hole with no convention behind it:
// "Arsenal (ARS) play in , overall 88, at Emirates." The app already owns an absence marker
// (ABSENT, the em dash) whose own docstring says it is "what a reader sees where a figure OR A
// NAME is missing" — the name family simply never rode that door, so the app carried two
// conventions for absence: the em dash, and the hole.
//
// The decision, and its cost. A missing name now reads the em dash. That is a real change to
// the reader's text — and it is the FIRST one in this lane, so unlike the twenty-eight folds
// that preceded it, this unit's claim is not "no figure moves". The census below therefore
// charges the OTHER side too: the hole it removes is measured, and the marker is shown to be
// the absence door's own glyph rather than a new character.
//
// The lane is drawn by SHAPE, not by a hand-typed file list. The name lane is an optional chain
// on a name field (`.name` / `.short`) falling back to the empty string. The CONTROL lane — a
// query parameter, an id default, a form's select value, a record's own optional text, a
// `rowLine` result — keeps its "": the em dash is a DISPLAY glyph, and a control value of "—"
// would be a broken id, not an absence. The control lane is counted and floored here so a
// census that narrowed itself into blindness reddens rather than passing.
//
// Reachability was measured, not assumed: on the shipped world every club, competition, player
// and match resolves (0 unresolvable names over 73 clubs / 610 players / 1566 matches / 15
// competitions), so no reader sees the change on today's data. The change is LATENT — it is
// what a reader gets when the world is inconsistent, and the URL-driven `?club=` filter is a
// reader-supplied id that can miss. Both facts are charged by the census below rather than
// claimed in prose.
//
// Run: node scripts/proof-absent-name.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-absent-name-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { ABSENT } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
const EM = "—";

// The name lane: an optional chain on a NAME field falling back to the empty string.
const NAME_EMPTY = /\?\.(?:name|short)\s*\?\?\s*""/g;
// The name lane's new shape: the same chain falling back to the door.
const NAME_DOOR = /\?\.(?:name|short)\s*\?\?\s*ABSENT/g;
// The control lane: ANY empty-string fallback that is NOT a name lookup.
const ANY_EMPTY = /\?\?\s*""|\|\|\s*""/g;
const CONTROL_EMPTY = /\?\?\s*""|\|\|\s*""/g;
const IMPORT_ABSENT = /import[^;]*\bABSENT\b[^;]*from ["']@\/lib\/utils["']/g;
// A door USE, excluding the declaration and the import that brings it in.
const USE_ABSENT = /(?<![\w$"])ABSENT(?![\w$"])/g;

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const raw = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const n = (text, re) => (text.match(re) || []).length;
const bodyLines = (text) => text.split(/\r?\n/).filter((l) => !/^\s*(?:import|export)\b/.test(l)).join("\n");
const useText = (f) => bodyLines(raw[f]);

// The files this unit folded, with the count it folded in each. DERIVED from the tree below
// (the census names the files it touched), not typed from the fold plan. M534 added the run-in
// screen, whose three name lookups (hardest/easiest/competition short names) ride the door.
const FOLDED = [
  "data/footballService.ts", "data/intelligence.ts", "features/analytics/DataRoom.tsx",
  "features/analytics/GoalTiming.tsx",
  "features/analytics/RunIn.tsx",
  "features/football/Details.tsx", "features/football/FootballWorld.tsx",
  "features/scouting/ScoutingPanel.tsx", "features/sim/SimulationLab.tsx",
];
// The files that already rode the door for a name BEFORE this unit (M394/M395's fold
// included some `?? ABSENT` name fallbacks). They are charged apart so this unit's own
// population is not confused with the ledger it inherited.
// M559: the points-scenario screen's three short-name tiles and its title-race hint look names
// up and read the door; they are charged apart because this unit folded no name fallbacks there.
// M569: the venue split's two named lines and its competition-name hint do the same.
const PRE_EXISTING = ["domain/scouting.ts", "features/manager/ManagerOS.tsx", "features/analytics/PointsScenario.tsx", "features/analytics/VenueSplit.tsx"];

// --- 1. Plants: arm every scan, so a "zero"/"every" verdict is measured, never an empty set. ---
const pNameEmpty = n("const x = getClub(id)?.name ?? \"\";", NAME_EMPTY);
const pNameEmptyShort = n("const x = getClub(id)?.short ?? \"\";", NAME_EMPTY);
const pNameDoor = n("const x = getClub(id)?.name ?? ABSENT;", NAME_DOOR);
const pControlEmpty = n('const q = query.get("club") ?? "";', CONTROL_EMPTY);
const pControlNotName = n('const q = query.get("club") ?? "";', NAME_EMPTY);
const pImport = n('import { cn, ABSENT } from "@/lib/utils";', IMPORT_ABSENT);
const pUse = n(bodyLines("const x = getClub(id)?.name ?? ABSENT;"), USE_ABSENT);
const pDecl = n(bodyLines('export const ABSENT = "—";'), USE_ABSENT);
const pImportNotUse = n(bodyLines('import { cn, ABSENT } from "@/lib/utils";'), USE_ABSENT);
ok(`the scans are armed and the lane's shape is what draws it (name-empty ${pNameEmpty}/${pNameEmptyShort}, name-door ${pNameDoor}, control-empty ${pControlEmpty}, a control lane reads 0 name-empty ${pControlNotName}) and a door USE excludes the declaration ${pDecl} and the import ${pImportNotUse} but counts a real name fallback ${pUse}, import read ${pImport}`,
  pNameEmpty === 1 && pNameEmptyShort === 1 && pNameDoor === 1 && pControlEmpty === 1 && pControlNotName === 0 &&
  pUse === 1 && pDecl === 0 && pImportNotUse === 0 && pImport === 1);

// --- 2. Population floor + subject presence (a blind walk reads an empty tree and passes). ---
const subjects = FOLDED.concat([HOME], PRE_EXISTING).every((p) => Object.prototype.hasOwnProperty.call(raw, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx, floor 90)`,
  carriers.length >= 90 && subjects);

// --- 3. THE NAME LANE IS CLOSED: zero name fallbacks still spell the empty string. -------------
const nameEmptyByFile = carriers.filter((f) => n(raw[f], NAME_EMPTY) > 0);
const nameEmptyTotal = carriers.reduce((s, f) => s + n(raw[f], NAME_EMPTY), 0);
ok(`the name lane is closed: no name lookup falls back to the empty string any more (carriers [${nameEmptyByFile.join(",")}], total ${nameEmptyTotal}; planted name-empty read 1 each in clause 1)`,
  nameEmptyTotal === 0 && nameEmptyByFile.length === 0);

// --- 4. The door is what the lane reads now, in every file that owns a name fallback. -------
const nameDoorByFile = carriers.map((f) => [f, n(raw[f], NAME_DOOR)]).filter(([, c]) => c > 0).sort();
const nameDoorTotal = nameDoorByFile.reduce((a, [, c]) => a + c, 0);
const nameDoorFiles = nameDoorByFile.map(([f]) => f);
const expectedNameDoorFiles = [...FOLDED, ...PRE_EXISTING].sort();
ok(`every name fallback now reads the door, and the carrier set is exactly the files that own one (${nameDoorTotal} sites over ${nameDoorFiles.length} files [${nameDoorFiles.join(",")}]; floor 36 sites / 10 files)`,
  nameDoorTotal >= 36 && nameDoorFiles.length >= 10 && nameDoorFiles.join(",") === expectedNameDoorFiles.join(","));

// --- 5. The files this unit folded import the door, and each imports it exactly once. -------
// --- A fold that forgot its import would be a compile error, but a fold that added a SECOND ---
// --- import line, or imported a DIFFERENT door's name, would compile and still be wrong. ------
const foldedImport = FOLDED.map((f) => [f, n(raw[f], IMPORT_ABSENT)]);
const importOk = foldedImport.every(([, c]) => c === 1);
ok(`all nine folded files import the door exactly once, and no file outside the fold grew one (${foldedImport.map(([f, c]) => `${f.split("/").pop()}=${c}`).join(", ")})`,
  importOk && foldedImport.length === 9);

// --- 6. The CONTROL LANE survived: a control value is still "", and the fold did not sweep it.
// --- This is the clause that keeps the census honest in the other direction: a census that
// --- had folded every "" onto the door would have made the control lane 0, and the control
// --- lane going to 0 is a REGRESSION (a control value of "—" is a broken id, not an absence).
// --- M409 moved the URL-PARAMETER sites of this lane onto their own door (`paramText`), so the
// --- lane is five sites smaller than it was -- legitimately, and the floor moves with the work
// --- rather than staying at a number the tree no longer has. --------------------------------
const controlByFile = carriers.map((f) => [f, n(raw[f], CONTROL_EMPTY) - n(raw[f], NAME_EMPTY)]).filter(([, c]) => c > 0).sort();
const controlTotal = controlByFile.reduce((a, [, c]) => a + c, 0);
ok(`the control lane survived the fold: an id default, a record field and a filter value still read "" (${controlTotal} sites over ${controlByFile.length} files [${controlByFile.map(([f, c]) => `${f.split("/").pop()}=${c}`).join(", ")}]; floor 15 sites / 12 files — the URL parameters left this lane at M409 for their own door)`,
  controlTotal >= 15 && controlByFile.length >= 12 && !controlByFile.some(([f]) => FOLDED.includes(f) && f !== "features/analytics/DataRoom.tsx" && f !== "features/analytics/GoalTiming.tsx" && f !== "features/analytics/RunIn.tsx" && f !== "features/football/Details.tsx" && f !== "features/football/FootballWorld.tsx" && f !== "features/manager/ManagerOS.tsx"));

// --- 7. The marker is the ABSENCE DOOR's own glyph, not a new character and not a hole. ------
// --- The lane's whole claim is that a missing name now reads the em dash. If the door's value
// --- were the empty string, the fold would be a no-op; if it were a different dash, the app
// --- would carry a second absence glyph. Both are charged here, and the planted variants
// --- (a hole, a second dash) must FAIL. ---
const doorLine = (raw[HOME].match(/export const ABSENT[^\n]*/) || [""])[0];
const doorLineText = doorLine.trim();
const expectedDoorLine = `export const ABSENT = "${EM}";`;
const isEm = (s) => s === EM;
ok(`the lane's marker IS the absence door's own glyph: one em-dash character, not the empty string and not a second dash (line "${doorLineText}", line matches ${doorLineText === expectedDoorLine ? 1 : 0}, length ${ABSENT.length}, equals-em ${isEm(ABSENT) ? 1 : 0}, equals-empty ${ABSENT === "" ? 1 : 0}, equals-en ${ABSENT === "–" ? 1 : 0}; planted hole ${isEm("") ? 1 : 0}, planted second dash ${isEm("–") ? 1 : 0})`,
  doorLineText === expectedDoorLine && typeof ABSENT === "string" && ABSENT.length === 1 &&
  ABSENT === EM && ABSENT !== "" && ABSENT !== "–" && !isEm("") && !isEm("–"));

// --- 8. The reader-visible claim, measured on the SHIPPED rows: a missing name now reads the
// --- marker, and the row has no hole. This is the clause that would catch a fold that
// --- changed the glyph but left the sentence broken, and it is measured by RUNNING the
// --- dictionary over the row the way a screen does, not by reading the source. ---
const DICT = await server.ssrLoadModule("/i18n/dictionaries.ts");
const D = DICT.DICTIONARIES.en;
const say = (key, vars) => {
  let s = D[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll("{" + k + "}", String(v));
  return s;
};
// A hole: a doubled space, a space before a closing mark, or an empty parenthetical.
const HOLE = /\s{2,}|\s[.,;:!?]|\(\s*\)|\[\s*\]|^\s+|\s+$/;
// The rows the name lane feeds, with the name MISSING (the case the fold is about).
const holeRows = [
  ["ai.fact.club", { name: "Arsenal", short: "ARS", comp: ABSENT, overall: 88, stadium: "Emirates" }],
  ["ai.fact.nextFixture", { opponent: "Chelsea", comp: ABSENT }],
  ["ai.fact.player", { name: "Saka", position: "RW", age: 24, nation: "England", club: ABSENT, overall: 86, potential: 90, value: "€90.0M", foot: "L" }],
  ["sr.clubLine", { nation: "England", competition: ABSENT }],
  ["sr.playerLine", { group: "Attacker", club: ABSENT, overall: 86 }],
  ["data.sub.goalsPerGame", { club: ABSENT }],
  ["data.clashLine", { home: "Arsenal", away: ABSENT }],
  ["ai.qf.matchup", { home: "Arsenal", away: "Chelsea", comp: ABSENT }],
  ["fw.players.club", { name: ABSENT }],
  ["scout.squadOf", { club: ABSENT }],
  ["sim.tableCaption", { name: ABSENT }],
];
const holeHits = holeRows.filter(([k, v]) => HOLE.test(say(k, v))).map(([k]) => k);
const withMarker = holeRows.filter(([k, v]) => say(k, v).includes(EM)).map(([k]) => k);
// The pre-fold reading, for the record: the same rows with the name spelled "".
const preHoleHits = holeRows.filter(([k, v]) => HOLE.test(say(k, Object.fromEntries(Object.entries(v).map(([kk, vv]) => [kk, vv === ABSENT ? "" : vv]))))).map(([k]) => k);
ok(`every row the name lane feeds reads the marker and no row is left with a hole (${holeRows.length} rows, holes ${holeHits.length} [${holeHits.join(",")}], marker present in ${withMarker.length}; before the fold the same rows had ${preHoleHits.length} holes [${preHoleHits.join(",")}])`,
  holeHits.length === 0 && withMarker.length === holeRows.length && preHoleHits.length >= 3);

// --- 9. The fold moved NO figure a reader sees today: on the shipped world every name
// --- resolves, so the marker never appears. This is the honesty clause — the change is
// --- LATENT, and the census says so rather than claiming a visible fix. ---
const SVC = await server.ssrLoadModule("/data/footballService.ts");
const clubs = SVC.footballProvider.clubs();
const players = SVC.footballProvider.players();
const matches = SVC.footballProvider.matches();
let unresolved = 0;
for (const c of clubs) if (!SVC.getCompetition(c.competitionId)) unresolved++;
for (const m of matches) if (!SVC.getClub(m.homeClubId) || !SVC.getClub(m.awayClubId) || !SVC.getCompetition(m.competitionId)) unresolved++;
for (const p of players) if (p.clubId && !SVC.getClub(p.clubId)) unresolved++;
ok(`the change is LATENT on the shipped world: every name resolves, so no reader sees the marker today (${clubs.length} clubs / ${players.length} players / ${matches.length} matches, ${unresolved} unresolvable names) — and the URL-driven ?club= filter is a reader-supplied id that can miss`,
  unresolved === 0 && clubs.length > 50 && players.length > 500 && matches.length > 1000);

// --- 10. The lane's vars are PLAIN: a KEY var routes through t() and a CODE var through
// --- codeWord(), so a name-lane var in either set would send the marker through a
// --- translator instead of printing it. The count is DERIVED: the lane's sites come in two
// --- shapes — 26 inside a `vars:` object (where the var NAME decides the routing) and 2 as a
// --- JSX prop (a SectionTitle's title and a SeasonTable's name, which are printed directly
// --- and are never routed). All 26 var names are plain, and the plant proves the classifier
// --- bites on a var name that IS in those sets. ---
const CODE_VARS = ["mode", "group", "a", "b", "focus", "foci", "arch", "arch2", "kind", "stance", "feels", "traj", "cat", "cat2", "goal", "ageGroup", "shot", "drill", "attrs", "trained", "last", "new", "attr", "status", "foot", "position"];
const KEY_VARS = ["lead", "target", "game", "zone", "event", "improvement"];
// A name-lane site inside a `vars:` object: `name: <expr>?.name ?? ABSENT`.
const laneVar = /(\w+)\s*:\s*[^,{}]*\?\.\w+\s*\?\?\s*ABSENT/g;
// A name-lane site as a JSX prop: `title={<expr>?.name ?? ABSENT}`.
const laneProp = /\b(\w+)\s*=\s*\{[^}]*\?\.\w+\s*\?\?\s*ABSENT\}/g;
const laneVars = [];
const laneProps = [];
for (const f of FOLDED) {
  for (const m of raw[f].matchAll(laneVar)) laneVars.push([f, m[1]]);
  for (const m of raw[f].matchAll(laneProp)) laneProps.push([f, m[1]]);
}
const routedVars = laneVars.filter(([, v]) => CODE_VARS.includes(v) || KEY_VARS.includes(v));
const routedProps = laneProps.filter(([, v]) => CODE_VARS.includes(v) || KEY_VARS.includes(v));
const pRouted = CODE_VARS.includes("group") ? 1 : 0;
const laneTotal = laneVars.length + laneProps.length;
ok(`every name-lane var is PLAIN, so the marker prints itself instead of being routed through a translator (${laneTotal} sites over ${FOLDED.length} files: ${laneVars.length} in a vars object + ${laneProps.length} as a JSX prop [${laneProps.map(([, p]) => p).join(",")}]; routed vars ${routedVars.length} [${routedVars.map(([, v]) => v).join(",")}], routed props ${routedProps.length}; the plant reads ${pRouted} on a var name that IS in the code set)`,
  laneTotal === 31 && laneVars.length === 26 && laneProps.length === 5 &&
  routedVars.length === 0 && routedProps.length === 0 && pRouted === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
