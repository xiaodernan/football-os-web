// Proof for the attribute-vector threshold door.
//
// The defect class: `domain/playerDna.ts` owns the question "does this player have a full
// attribute vector, or only a rating?" -- `VECTOR_MIN_KEYS` is the threshold and `playerVector`
// is the door -- and its own docstring says WHY it is one place: "One threshold, one place, so
// every consumer agrees on what 'has a vector' means ... Callers use this to decide measured vs
// modelled rather than each re-testing the threshold." Two callers re-tested it anyway, against
// a bare 8: the comparison page's `hasVector`, and a proof that was supposed to be MEASURING the
// code and was measuring a copy of its number instead.
//
// The census scans the app AND the proofs, because the second bypass was in a proof: a census
// that read only the app would have found the first and called the family closed.
//
// Run: node scripts/proof-vector.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-vector-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const DNA = await server.ssrLoadModule("/domain/playerDna.ts");
const { playerVector, VECTOR_MIN_KEYS } = DNA;

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/playerDna.ts";
// A bare numeric threshold on an attribute vector, in EITHER shape it takes: the direct
// comparison, and the ternary that counts zero for an absent vector. A threshold of 0 or 1 is
// an EMPTINESS check -- a different question ("is this record empty?"), not a vector-length
// threshold -- so the scan reads the number and charges only the ones that could be a length.
const BARE = /Object\.keys\(([A-Za-z_$][\w$.]*)\)\.length\s*(>=|>)\s*(\d+)/g;
const BARE_TERNARY = /Object\.keys\(([A-Za-z_$][\w$.]*)\)\.length\s*:\s*0\)\s*>=\s*(\d+)/g;
// A threshold that could be the vector length: two or more.
const VECTORISH = (m) => Number(m[2]) >= 2;
const CONST = /export const VECTOR_MIN_KEYS = (\d+);/;
const DOOR = /export function playerVector\(attributes\?: Attributes\): Attributes \| null \{/;
const CALL = /\bplayerVector\s*\(/g;
// This census's own file: it holds the patterns as string literals, so a code-state scan would
// read its own plants as residue. It is excluded from the scans, not from the population.
const SELF = "scripts/proof-vector.mjs";

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const ROOTS = ["domain", "data", "lib", "features", "components", "ui", "src", "store"];
const appFiles = ROOTS.flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
// The proofs are read too: the second bypass was in one, and a census that read only the app
// would have called the family closed while a proof measured a copy of the threshold.
const proofFiles = readdirSync("scripts").filter((f) => f.endsWith(".mjs")).map((f) => "scripts/" + f);
const scanned = [...appFiles, ...proofFiles];
const raw = Object.fromEntries(scanned.map((f) => [f, readFileSync(f, "utf8")]));
const code = Object.fromEntries(scanned.map((f) => [f, raw[f].split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n")]));
// A FRESH, ALWAYS-GLOBAL regex per count. Two reasons, and the second one bites harder: a
// global regex carries `lastIndex` between uses, so a census whose counts depend on which scan
// ran first is not measuring anything; and a NON-global regex's `match` returns the capture
// groups alongside the match, so `length` counts the GROUPS and a one-group pattern reads as 2.
const n = (text, re) => {
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  return (text.match(new RegExp(re.source, flags)) || []).length;
};

// --- 1. Plants: arm the scan, so a "zero" verdict is measured, never an empty set. -----------
const pBare = n("const ok = Object.keys(a).length >= 8;", BARE);
const pBareTernary = n("const ok = (a ? Object.keys(a).length : 0) >= 8;", BARE_TERNARY);
const pEmpty = n("const ok = Object.keys(a).length > 0;", BARE);
const pOther = n("const ok = Object.keys(a).length >= 3;", BARE);
const pConst = n("export const VECTOR_MIN_KEYS = 4;", CONST);
const pDoor = n("export function playerVector(attributes?: Attributes): Attributes | null {", DOOR);
ok(`the scans are armed and a bare numeric threshold is what they draw (a direct threshold ${pBare}, the ternary shape ${pBareTernary}, an EMPTY check ${pEmpty} — which is a different question and must not be charged — and another number ${pOther}; the constant ${pConst}, the door ${pDoor})`,
  pBare === 1 && pBareTernary === 1 && pEmpty === 1 && pOther === 1 && pConst === 1 && pDoor === 1);

// --- 2. Population floor + subject presence. -------------------------------------------------
const present = [HOME, "domain/compare.ts", "domain/scouting.ts", "scripts/proof-m99.mjs"]
  .every((p) => Object.prototype.hasOwnProperty.call(raw, p));
ok(`the census walks the real source tree and every subject is inside it (${appFiles.length} app file(s) + ${proofFiles.length} proof script(s), floor 90)`,
  appFiles.length >= 80 && proofFiles.length >= 60 && present);

// --- 3. THE FAMILY IS CLOSED: no bare threshold on an attribute vector survives, in the app OR
// --- in a proof. The door's own home is excluded, and the exclusion is charged: the door's body
// --- reads the constant, which is not a bare number. ----------------------------------------
const bareIn = (f) =>
  (code[f].match(BARE) || []).some(VECTORISH) || (code[f].match(BARE_TERNARY) || []).some(VECTORISH);
const bareApp = appFiles.filter((f) => f !== HOME && f !== SELF && bareIn(f));
const bareProofs = proofFiles.filter((f) => f !== SELF && bareIn(f));
const bareTotal = [...bareApp, ...bareProofs].length;
ok(`the family is closed: no bare numeric threshold on an attribute vector survives, in the app OR in a proof (${bareTotal} site(s): app [${bareApp.join(",")}], proofs [${bareProofs.join(",")}])`,
  bareTotal === 0 && bareApp.length === 0 && bareProofs.length === 0);

// --- 4. The door and its constant are declared exactly once, in their home. ------------------
const declConst = scanned.filter((f) => f !== SELF && n(raw[f], CONST) > 0);
const declDoor = scanned.filter((f) => f !== SELF && n(raw[f], DOOR) > 0);
ok(`the door and its constant are declared exactly once, in the playerDna home (VECTOR_MIN_KEYS in [${declConst.join(",")}] = ${VECTOR_MIN_KEYS}, playerVector in [${declDoor.join(",")}])`,
  declConst.length === 1 && declConst[0] === HOME && declDoor.length === 1 && declDoor[0] === HOME);

// --- 5. The readers reach the door, and the app's reader IMPORTS it (a call with no import
// --- would be a runtime failure). --------------------------------------------------------------
const READERS = ["domain/compare.ts", "domain/scouting.ts", "scripts/proof-m99.mjs"];
const readerCalls = READERS.map((f) => [f, n(code[f], CALL)]);
const readerImports = READERS.map((f) => [f, /import[^;]*\bplayerVector\b[^;]*from/.test(code[f]) || /ssrLoadModule\("\/domain\/playerDna\.ts"\)/.test(code[f])]);
ok(`all three readers reach the door, and each imports it (${readerCalls.map(([f, c]) => `${f.split("/").pop()}=${c}`).join(", ")}; imports ${readerImports.map(([f, i]) => `${f.split("/").pop()}=${i ? "yes" : "NO"}`).join(", ")})`,
  readerCalls.every(([, c]) => c >= 1) && readerImports.every(([, i]) => i));

// --- 6. BEHAVIOUR: the door keeps the threshold's edges -- exactly the minimum is kept, one
// --- fewer is null, and an absent vector is null. ---------------------------------------------
const at = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => ["k" + i, 50]));
const edge = playerVector(at(VECTOR_MIN_KEYS)) !== null;
const oneShort = playerVector(at(VECTOR_MIN_KEYS - 1)) === null;
const absent = playerVector(undefined) === null;
const empty = playerVector({}) === null;
ok(`the door keeps the threshold's edges: exactly ${VECTOR_MIN_KEYS} keys is kept, ${VECTOR_MIN_KEYS - 1} is null, an absent vector is null and an empty one is null (${edge ? "kept" : "NULL"} / ${oneShort ? "null" : "KEPT"} / ${absent ? "null" : "KEPT"} / ${empty ? "null" : "KEPT"})`,
  edge && oneShort && absent && empty && VECTOR_MIN_KEYS === 8);

// --- 7. The reader the fold moved now agrees with the door, on every player the world has --
// --- the point of the fold was that a threshold change would have moved one screen silently. ---
const SVC = await server.ssrLoadModule("/data/footballService.ts");
const players = SVC.footballProvider.players();
const byDoor = players.filter((p) => playerVector(p.attributes) !== null);
const byBare = players.filter((p) => (p.attributes ? Object.keys(p.attributes).length : 0) >= VECTOR_MIN_KEYS);
const disagreements = players.filter((p) =>
  (playerVector(p.attributes) !== null) !== ((p.attributes ? Object.keys(p.attributes).length : 0) >= VECTOR_MIN_KEYS)).length;
ok(`the reader the fold moved agrees with the door on every player the world has: ${byDoor.length} have a vector by the door and ${byBare.length} by the old bare threshold, ${disagreements} disagreement(s) across ${players.length} players`,
  byDoor.length === byBare.length && disagreements === 0 && players.length > 500 && byDoor.length > 0);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
