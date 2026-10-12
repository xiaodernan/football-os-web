// Proof for the shared epoch-parse door (lib/utils.ts's `epochMs`). An ISO-ish timestamp string is
// turned into epoch milliseconds so a list can be ordered by it, a record can be tested for
// recency, and a "last activity" figure can be compared to zero. domain/footprint, domain/history and
// the Profile record each spelled this as a PRIVATE `ts` helper — footprint's and Profile's byte for
// byte, history's a hair shorter (no falsy branch, but `!""`/`!undefined` return the same 0 the raw
// `new Date` NaN floor already gave it). Identical today — so no order or figure a reader sees moves —
// but a parse-and-floor convention spelled three ways that part company the moment one drops the
// isNaN floor or forgets the empty string.
//
// The census keys on the FLOOR (`Number.isNaN(t) ? 0`), and that anchor is load-bearing because three
// look-alike parses must NOT be routed through this door:
//   · the BARE inline parse (filmInsights' / CommunityHub's / Dashboard's sort comparators) is
//     `new Date(b.at).getTime() - new Date(a.at).getTime()` with NO floor. A bad string there yields
//     NaN, and a NaN comparator leaves that pair in place; the door's 0 would yank it to one end and
//     REORDER the list. Ordering-visible, so it is a different computation.
//   · the VALIDITY-CHECK parse (history.ts's own `if (Number.isNaN(new Date(x).getTime())) continue`)
//     uses the NaN to SKIP a record. Feed it epochMs and it never returns NaN, so the skip never fires
//     and a corrupt record leaks in. Also not the door.
//   · the DAY-KEY door (load.ts, M353) floors an unparseable date to "" (a display key), not to a
//     numeric 0 — a sibling with a different sink.
// Only `Number.isNaN(…) ? 0` marks the door; the bare/validity/day-key parses charge other scans and
// survive un-floored, which the census measures rather than assumes.
// Run: node scripts/proof-epoch.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { epochMs } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
// Clean modules that dropped their private `ts` helper for the door.
const CONSUMERS = ["domain/footprint.ts", "domain/history.ts", "features/profile/ProfilePage.tsx"];

// Walk the shipped source roots. scripts/ is NOT walked, so the plants below are the reference the
// scans are armed against, never a second charge in the census population.
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n"].flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// Every parse-to-epoch call, floored or not — the raw population the door is drawn out of.
const RAW_GETTIME = /new Date\([^)]*\)\.getTime\(\)/g;
// The door's signature: a parse whose NaN result is floored to a numeric zero.
const FLOORED_PARSE = /Number\.isNaN\([^)]*\) *\? *0\b/g;
const DECL_EPOCH = /\nexport const epochMs[ \t]*=/g;
const IMPORT_EPOCH = /import[^;]*\bepochMs\b[^;]*from ["']@\/lib\/utils["']/g;
const CALL_EPOCH = /\bepochMs\(/g;

// --- Plants: arm every scan so a "once" or "gone" verdict is a measurement. --------------------
const plantRaw = count(`const t = new Date(s).getTime();`, RAW_GETTIME);
const plantFloor = count(`return Number.isNaN(t) ? 0 : t;`, FLOORED_PARSE);
// A validity-check parse must NOT read as the door (it uses the NaN, never floors it to a 0 value).
const plantValidity = count(`if (Number.isNaN(new Date(x).getTime())) continue;`, FLOORED_PARSE);
const plantDecl = count(`\nexport const epochMs = (iso?: string): number => {`, DECL_EPOCH);
const plantImport = count(`import { cn, epochMs } from "@/lib/utils";`, IMPORT_EPOCH);
ok(`the five scans are armed and the validity-check exclusion bites (raw ${plantRaw}, floor ${plantFloor}, validity ${plantValidity}, decl ${plantDecl}, import ${plantImport})`,
  plantRaw === 1 && plantFloor === 1 && plantValidity === 0 && plantDecl === 1 && plantImport === 1);

// --- Population floor + subject presence (a blind walk reads 0 and would pass a negative claim). --
const present = CONSUMERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx)`,
  carriers.length >= 80 && present);

// --- Structural: the door is declared exactly once, in lib/utils, and nowhere else. ------------
const declByFile = carriers.filter((f) => count(src[f], DECL_EPOCH) > 0);
ok(`epochMs is declared exactly once, in the door (home ${count(src[HOME], DECL_EPOCH)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_EPOCH) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- No module outside the door still floors an epoch parse to a numeric zero (the three private
// `ts` helpers are gone; planted floor reads 1 so the single-count bites). -------------------------
const flooredByFile = carriers.filter((f) => count(src[f], FLOORED_PARSE) > 0);
const flooredTotal = carriers.reduce((s, f) => s + count(src[f], FLOORED_PARSE), 0);
ok(`no module outside the door floors a parse to zero — footprint, history and Profile import it instead (${flooredByFile.join(",")}; planted floor reads ${plantFloor})`,
  plantFloor === 1 && flooredByFile.length === 1 && flooredByFile[0] === HOME && count(src[HOME], FLOORED_PARSE) === 1 && flooredTotal === 1);

// --- Door body: parse + .getTime() + a Number.isNaN→0 floor + the falsy guard. --------------------
const doorBody = (src[HOME].match(/export const epochMs[\s\S]*?\n\};/) || [""])[0];
ok(`the door body parses, floors NaN to zero and short-circuits a missing string`,
  /new Date\(iso\)\.getTime\(\)/.test(doorBody) && /Number\.isNaN\([^)]*\) *\? *0/.test(doorBody) && /!iso/.test(doorBody) && doorBody.length > 40);

// --- Every consumer imports the door. ------------------------------------------------------------
const importing = CONSUMERS.filter((f) => count(src[f], IMPORT_EPOCH) >= 1);
ok(`all three clean modules import epochMs from @/lib/utils (${importing.length}/${CONSUMERS.length}: ${importing.join(", ")})`,
  importing.length === CONSUMERS.length);

// --- Every consumer actually reads the door, not just imports it. --------------------------------
const calls = CONSUMERS.map((f) => [f, count(src[f], CALL_EPOCH)]);
ok(`each consumer calls epochMs at least once (read ${calls.map(([, n]) => n).join(",")})`,
  calls.every(([, n]) => n >= 1));

// --- Must-not-unify, census: the bare/validity/day-key parses far outnumber the single floored door
// and stay un-routed. Derived from the walked bytes, so "0 found" cannot satisfy it. ----------------
const rawTotal = carriers.reduce((s, f) => s + count(src[f], RAW_GETTIME), 0);
const unfloored = rawTotal - flooredTotal;
ok(`the inline epoch parses far outnumber the floored door and stay un-routed (raw ${rawTotal}, floored ${flooredTotal}, un-floored ${unfloored})`,
  rawTotal >= 20 && flooredTotal === 1 && unfloored >= 15);

// --- Must-not-unify, the day-key sibling (load.ts, M353) floors to an empty key, not a numeric zero.
const loadKey = src["domain/load.ts"];
ok(`the day-key door floors an unparseable date to an empty string, a different sink this door does not claim`,
  /Number\.isNaN\(t\)\) *return ""/.test(loadKey) && count(loadKey, FLOORED_PARSE) === 0);

// --- Behavioural, valid: the door reproduces the raw parse exactly on every timestamp a caller passes.
const VALID = ["2020-06-15T12:00:00.000Z", "2020-06-15", "2024-01-01T00:00:00Z", "2019-12-31T23:59:59.000Z", "2020-02-29T08:30:00Z"];
const agrees = VALID.every((s) => epochMs(s) === new Date(s).getTime());
ok(`epochMs equals the raw parse for every timestamp the sites pass (${VALID.length} values, incl "${VALID[0]}"→${epochMs(VALID[0])})`,
  agrees && VALID.length >= 4 && epochMs(VALID[0]) === Date.parse(VALID[0]));

// --- Behavioural, must-not-unify: the floor IS the difference — a bad string is NaN raw but zero via
// the door, so routing a comparator or a skip-check through it would change its verdict. ----------------
ok(`a bad string parses to NaN raw yet floors to zero through the door (blind spot the inline sites keep)`,
  Number.isNaN(new Date("not-a-date").getTime()) && epochMs("not-a-date") === 0 && epochMs("") === 0 && epochMs(undefined) === 0 && new Date("not-a-date").getTime() !== epochMs("not-a-date"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
