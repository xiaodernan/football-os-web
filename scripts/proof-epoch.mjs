// Proof for the shared epoch-parse door (lib/utils.ts's `epochMs`). An ISO-ish timestamp string is
// turned into epoch milliseconds so a list can be ordered by it, a record can be tested for recency,
// and a "last activity" figure can be compared to zero. The door was drawn out of three private `ts`
// helpers (footprint's and Profile's byte for byte, history's a hair shorter) and has since collected
// the demo anchor and the community age figure. Identical today — so no order or figure a reader sees
// moves — but a parse-and-floor convention spelled several ways that part company the moment one drops
// the isNaN floor or forgets the empty string.
//
// The census keys on the FLOOR (`Number.isNaN(t) ? 0`), and that anchor is load-bearing because four
// look-alike parses must NOT be routed through this door. Each lane is counted from the walked bytes
// below, and the four lanes plus the door's own body/comment are pinned to the measured total, so a
// new bare parse has to land in a named lane or redden this proof:
//   · the VALIDITY-CHECK lane (five sites: history ×2 with the parse inline, plus load's chronic
//     window, review's withinWindow and training's missed-session test) uses the NaN to SKIP or
//     REJECT a record. Feed it epochMs and it never returns NaN, so the skip never fires and a
//     corrupt record leaks in. Not the door.
//   · the DAY-KEY lane (load's private dayKey) floors an unparseable date to "" — a display key, not a
//     numeric 0. A sibling with a different sink (M353 gave it its own door).
//   · the WINDOW-PREDICATE lane (load's two daily windows — one inline, one bound to `t` on the next
//     line — service's ±2-day demo window and ReviewPage's progress filter) is a bare parse whose NaN
//     makes a `>=`/`<` comparison false — a record a bad date excludes. Flooring to 0 would instead
//     sweep it INTO every window that starts at or before the epoch. A different computation.
//   · the LATEST-ACTIVITY lane (CommunityHub's four Math.max-of-parses sites, the statement's two
//     sides over two lines) reads "newest of the thread's stamps", which its Math.max grouping
//     answers even when a stamp is bad. This is the lane the old bare-comparator note described; after
//     M384 every ISO-date SORT comparator rides byDateDesc/byDateAsc (proof-datesort owns that
//     census), so this Math.max shape is what remains.
// Only `Number.isNaN(…) ? 0` marks the door; the bare/validity/day-key/window parses charge other
// scans and survive un-floored, which the census measures rather than assumes.
// Run: node scripts/proof-epoch.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { epochMs } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
// Every file that reads the door in source, with exact per-file call pins. domain/attributes is here
// because the byDateDesc/byDateAsc door bodies themselves ride epochMs (M384) — the door reaches the
// eight former sort comparators one door down, which is why history.ts no longer imports it directly.
const CONSUMERS = [
  "domain/attributes.ts", "domain/footprint.ts",
  "features/profile/ProfilePage.tsx", "features/community/CommunityHub.tsx",
  "data/footballSeed.ts", "data/footballService.ts",
];
const CALL_PINS = {
  "domain/attributes.ts": 4, "domain/footprint.ts": 1,
  "features/profile/ProfilePage.tsx": 1, "features/community/CommunityHub.tsx": 1,
  "data/footballSeed.ts": 2, "data/footballService.ts": 1,
};

// Walk the shipped source roots. scripts/ is NOT walked, so the plants below are the reference the
// scans are armed against, never a second charge in the census population.
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n"].flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;
const treeCount = (re) => carriers.reduce((s, f) => s + count(src[f], re), 0);

// Every parse-to-epoch call, floored or not — the raw population the door is drawn out of.
const RAW_GETTIME = /new Date\([^)]*\)\.getTime\(\)/g;
// The door's signature: a parse whose NaN result is floored to a numeric zero.
const FLOORED_PARSE = /Number\.isNaN\([^)]*\) *\? *0\b/g;
const DECL_EPOCH = /\nexport const epochMs[ \t]*=/g;
const IMPORT_EPOCH = /import[^;]*\bepochMs\b[^;]*from ["']@\/lib\/utils["']/g;
const CALL_EPOCH = /\bepochMs\(/g;
// The lanes the door must not claim, keyed by the shapes that carry them. The validity lane excludes
// the day-key sink and the door's own `? 0 : t` floor, so the four lanes below partition the surviving
// population instead of double-counting it: validity (NaN rejects a record), day-key (NaN floors to ""),
// window-predicate (NaN makes a `>=`/`<` false, so a bad date EXCLUDES the record), and the
// latest-activity Math.max grouping (which answers "newest stamp" even when a stamp is bad).
const VALIDITY_INLINE = /Number\.isNaN\(new Date\([^)]*\)\.getTime\(\)\)/g;
const VALIDITY_T = /Number\.isNaN\(t\)(?!\) *return "")(?! *\? *0)/g;
const DAYKEY_SINK = /Number\.isNaN\(t\)\) *return ""/g;
const WINDOW_INLINE = /new Date\([^)]*\)\.getTime\(\)[^;\n]{0,60}?(?:>=|<=|>|<) *(?:start|fromMs|from|end|2 \* DAY_MS)\b/g;
const LATEST_MAX = /Math\.max\(new Date\([^)]*\)\.getTime\(\)/g;
const LATEST_SIDE = /Math\.max\(new Date\([^)]*\)\.getTime\(\)/g;
// The one bare parse no lane pattern can see inline: load's daily loop assigns `t` on one line and
// compares it on the next, so it is pinned by file (load's fourth raw site) rather than by shape.
// [file, raw occurrences] — the whole surviving population, which must sum to the measured total.
const RAW_PINS = [
  ["domain/history.ts", 2], ["domain/load.ts", 4], ["domain/review.ts", 1], ["domain/training.ts", 1],
  ["data/footballService.ts", 1], ["lib/utils.ts", 2], ["features/community/CommunityHub.tsx", 4],
  ["features/review/ReviewPage.tsx", 1],
];

// --- Plants: arm every scan so a "once" or "gone" verdict is a measurement. --------------------
const plantRaw = count(`const t = new Date(s).getTime();`, RAW_GETTIME);
const plantFloor = count(`return Number.isNaN(t) ? 0 : t;`, FLOORED_PARSE);
// A validity-check parse must NOT read as the door (it uses the NaN, never floors it to a 0 value).
const plantValidity = count(`if (Number.isNaN(new Date(x).getTime())) continue;`, FLOORED_PARSE);
const plantValidityLane = count(`if (Number.isNaN(new Date(x.at).getTime())) continue;`, VALIDITY_INLINE);
const plantValidityT = count(`if (Number.isNaN(t) || t > fromMs) continue;`, VALIDITY_T);
const plantDayKey = count(`if (Number.isNaN(t)) return "";`, DAYKEY_SINK);
const plantWindow = count(`daily.reduce((s, d) => (new Date(d.date + "T00:00:00Z").getTime() >= fromMs ? s + d.load : s), 0);`, WINDOW_INLINE);
const plantLatest = count(`Math.max(new Date(b.at).getTime(), ...b.comments.map((c) => new Date(c.at).getTime()))`, LATEST_MAX);
const plantDecl = count(`\nexport const epochMs = (iso?: string): number => {`, DECL_EPOCH);
const plantImport = count(`import { cn, epochMs } from "@/lib/utils";`, IMPORT_EPOCH);
ok(`the scans are armed and the validity-check exclusion bites (raw ${plantRaw}, floor ${plantFloor}, validity ${plantValidity}, lanes inline ${plantValidityLane}, t-bound ${plantValidityT}, day-key ${plantDayKey}, window ${plantWindow}, latest ${plantLatest}, decl ${plantDecl}, import ${plantImport})`,
  plantRaw === 1 && plantFloor === 1 && plantValidity === 0 && plantValidityLane === 1 && plantValidityT === 1
  && plantDayKey === 1 && plantWindow === 1 && plantLatest === 1 && plantDecl === 1 && plantImport === 1);

// --- Population floor + subject presence (a blind walk reads 0 and would pass a negative claim). --
const present = CONSUMERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx)`,
  carriers.length >= 80 && present);

// --- Structural: the door is declared exactly once, in lib/utils, and nowhere else. ------------
const declByFile = carriers.filter((f) => count(src[f], DECL_EPOCH) > 0);
ok(`epochMs is declared exactly once, in the door (home ${count(src[HOME], DECL_EPOCH)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_EPOCH) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- No module outside the door still floors an epoch parse to a numeric zero (the three private
// --- `ts` helpers are gone; planted floor reads 1 so the single-count bites). -------------------------
const flooredByFile = carriers.filter((f) => count(src[f], FLOORED_PARSE) > 0);
const flooredTotal = treeCount(FLOORED_PARSE);
ok(`no module outside the door floors a parse to zero — footprint, history and Profile import it instead (${flooredByFile.join(",")}; planted floor reads ${plantFloor})`,
  plantFloor === 1 && flooredByFile.length === 1 && flooredByFile[0] === HOME && count(src[HOME], FLOORED_PARSE) === 1 && flooredTotal === 1);

// --- Door body: parse + .getTime() + a Number.isNaN→0 floor + the falsy guard. --------------------
const doorBody = (src[HOME].match(/export const epochMs[\s\S]*?\n\};/) || [""])[0];
ok(`the door body parses, floors NaN to zero and short-circuits a missing string`,
  /new Date\(iso\)\.getTime\(\)/.test(doorBody) && /Number\.isNaN\([^)]*\) *\? *0/.test(doorBody) && /!iso/.test(doorBody) && doorBody.length > 40);

// --- Every consumer imports the door. ------------------------------------------------------------
const importing = CONSUMERS.filter((f) => count(src[f], IMPORT_EPOCH) >= 1);
ok(`all ${CONSUMERS.length} door readers import epochMs from @/lib/utils (${importing.length}/${CONSUMERS.length})`,
  importing.length === CONSUMERS.length);

// --- Every consumer reads the door at its pinned count — an import that nothing calls is not a reader.
const calls = Object.fromEntries(CONSUMERS.map((f) => [f, count(src[f], CALL_EPOCH)]));
const totalCalls = Object.values(calls).reduce((s, n) => s + n, 0);
ok(`each consumer calls epochMs at its exact pinned count — attributes' four are the two byDate door bodies plus the two the bodies' doc comment names (read ${CONSUMERS.map((f) => `${f.split("/").pop()}=${calls[f]}`).join(", ")}, total ${totalCalls}, pinned 10)`,
  CONSUMERS.every((f) => calls[f] === CALL_PINS[f]) && totalCalls === 10);

// --- Must-not-unify, lane census: every surviving bare parse is charged to a named lane, and the four
// --- lanes plus the door's own body/comment sum to the measured raw population, which the per-file
// --- pins also close — so a new bare parse has to land in a lane or redden this proof. ---------------
const validityInline = treeCount(VALIDITY_INLINE);
const validityT = treeCount(VALIDITY_T);
const dayKeyTotal = treeCount(DAYKEY_SINK);
const windowTotal = treeCount(WINDOW_INLINE);
const latestOpeners = treeCount(LATEST_MAX);
// That one statement spans two lines (its `- Math` / `Math.max` split across the break), so the four
// parses are charged by the file's own raw count and the opener shape is the witness beside it.
const latestTotal = count(src["features/community/CommunityHub.tsx"], RAW_GETTIME);
const rawTotal = treeCount(RAW_GETTIME);
const doorSites = count(src[HOME], RAW_GETTIME);
const loadSrc = src["domain/load.ts"];
const loadRaw = count(loadSrc, RAW_GETTIME);
// Load holds one site of each inline lane; whatever its raw count is left after those three is the
// bound-variable read (the daily loop assigns `t`, then compares it on the next line).
const loadBound = loadRaw - count(loadSrc, DAYKEY_SINK) - count(loadSrc, VALIDITY_T) - count(loadSrc, WINDOW_INLINE);
const accounted = validityInline + validityT + dayKeyTotal + windowTotal + latestTotal + doorSites + loadBound;
const rawPinTotal = RAW_PINS.reduce((s, [, n]) => s + n, 0);
const rawPinHolds = RAW_PINS.every(([f, n]) => count(src[f], RAW_GETTIME) === n);
ok(`every bare parse is charged to a lane — validity ${validityInline} inline (history) + ${validityT} t-bound (load, review, training), day-key ${dayKeyTotal} (load), window-predicate ${windowTotal} inline + 1 bound (load), latest-activity ${latestTotal} (CommunityHub), door body+comment ${doorSites} — and they sum to the measured raw ${rawTotal} (per-file pins ${rawPinTotal})`,
  validityInline === 2 && validityT === 3 && dayKeyTotal === 1 && windowTotal === 3 && latestTotal === 4 && latestOpeners === 2
  && doorSites === 2 && loadRaw === 4 && loadBound === 1 && accounted === rawTotal && rawTotal === 16 && rawPinHolds && rawPinTotal === 16
  && plantValidityLane === 1 && plantValidityT === 1 && plantDayKey === 1 && plantWindow === 1 && plantLatest === 1);

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
// --- the door, so routing a comparator or a skip-check through it would change its verdict. ----------------
ok(`a bad string parses to NaN raw yet floors to zero through the door (blind spot the inline sites keep)`,
  Number.isNaN(new Date("not-a-date").getTime()) && epochMs("not-a-date") === 0 && epochMs("") === 0 && epochMs(undefined) === 0 && new Date("not-a-date").getTime() !== epochMs("not-a-date"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);