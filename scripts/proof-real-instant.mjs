// Proof for the "is this stored instant a real time?" door.
//
// The defect class: the question "can this stored instant be read as a time at all" was asked
// nine ways over seven files -- `Number.isNaN(new Date(x).getTime())`, `Number.isNaN(d.getTime())`,
// `Number.isNaN(t)` -- and each of the three is one question in one dialect. The sibling door
// `epochMs` answers a different question (how many milliseconds is this, flooring a value it
// cannot parse to 0) and its own docstring says why the difference matters.
//
// The census charges the family closed: the guard form survives NOWHERE in the app, the door is
// declared once, the readers reach it, and the door's behaviour is the behaviour it replaced --
// including the two edges a rewrite would break: a stored instant that does not parse, and the
// blank string, which `new Date("")` also refuses.
//
// The NUMERIC-STRING check is a different question -- "is this string a number" -- and the app's
// one such site stays inline. The census charges that it stays, because a reader that swept it
// in would have folded a number into a time.
//
// Run: node scripts/proof-real-instant.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-real-instant-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { isRealInstant } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
const READERS = [
  "domain/history.ts", "domain/load.ts", "domain/review.ts", "domain/training.ts",
  "features/history/HistoryPage.tsx", "features/profile/ProfilePage.tsx",
];
// The guard form the door replaced: a NaN check on a parsed instant.
const GUARD = /Number\.isNaN\(\s*(?:new Date\([^)]*\)\.getTime\(\)|[A-Za-z_$][\w$.]*\.getTime\(\)|[A-Za-z_$][\w$.]*)\s*\)/g;
// The numeric-string family, which is a DIFFERENT question and stays inline.
const NUMERIC_STRING = /Number\.isNaN\(\s*Number\(/g;
const DECL = /export const isRealInstant = \(value: string \| number \| Date \| null \| undefined\): boolean =>/;
const CALL = /\bisRealInstant\s*\(/g;
const IMPORT = /import[^;]*\bisRealInstant\b[^;]*from ["']@\/lib\/utils["']/;

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const raw = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const code = Object.fromEntries(carriers.map((f) => [f, raw[f].split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n")]));
const n = (text, re) => (text.match(re) || []).length;

// --- 1. Plants: arm the scan, so a "zero"/"nine" verdict is measured. --------------------------
const pGuard = n("if (Number.isNaN(new Date(s).getTime())) continue;", GUARD);
const pGuardDate = n("if (Number.isNaN(d.getTime())) return '';", GUARD);
const pGuardNum = n("if (Number.isNaN(t)) return '';", GUARD);
const pNumeric = n("if (!Number.isNaN(Number(x))) use(x);", GUARD);
const pNumericOwn = n("if (!Number.isNaN(Number(x))) use(x);", NUMERIC_STRING);
const pDecl = n("export const isRealInstant = (value: string | number | Date | null | undefined): boolean => x;", DECL);
const pCall = n("if (!isRealInstant(t)) return '';", CALL);
const pImport = n('import { isRealInstant } from "@/lib/utils";', IMPORT);
ok(`the scans are armed and the guard shape is what draws the line (the parsed form ${pGuard}, the Date form ${pGuardDate}, the number form ${pGuardNum}, a numeric-string check ${pNumeric} -- which the GUARD scan must NOT charge and the numeric scan reads ${pNumericOwn}; the declaration ${pDecl}, a call ${pCall}, an import ${pImport})`,
  pGuard === 1 && pGuardDate === 1 && pGuardNum === 1 && pNumeric === 0 && pNumericOwn === 1 &&
  pDecl === 1 && pCall === 1 && pImport === 1);

// --- 2. Population floor + subject presence. -------------------------------------------------
const present = READERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(raw, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx, floor 90)`,
  carriers.length >= 90 && present);

// --- 3. THE FAMILY IS CLOSED: the guard form survives nowhere outside the door's own body. -----
// --- The home is excluded and the exclusion is charged: the home now holds TWO doors that ask
// --- the NaN question -- `epochMs` (which floors) and this one (which answers a truth) -- and
// --- both bodies are the check, so the home carries two. ---------------------------------------
const guardByFile = carriers.filter((f) => f !== HOME && n(code[f], GUARD) > 0);
const guardTotal = carriers.reduce((s, f) => s + (f === HOME ? 0 : n(code[f], GUARD)), 0);
const homeGuard = n(code[HOME], GUARD);
ok(`the family is closed: the guard form survives nowhere outside the doors' own bodies (${guardTotal} site(s) outside [${guardByFile.join(",")}]; the home carries ${homeGuard} — TWO doors ask the NaN question there: epochMs, which floors, and isRealInstant, which answers a truth)`,
  guardTotal === 0 && guardByFile.length === 0 && homeGuard === 2);

// --- 4. The numeric-string family is a DIFFERENT question and stays inline. -------------------
const numericByFile = carriers.filter((f) => n(code[f], NUMERIC_STRING) > 0);
const numericTotal = carriers.reduce((s, f) => s + n(code[f], NUMERIC_STRING), 0);
ok(`the numeric-string check is a different question and stays inline (${numericTotal} site(s) in [${numericByFile.join(",")}]; planted reads ${pNumericOwn})`,
  numericTotal === 1 && numericByFile.length === 1);

// --- 5. The door is declared once, in its home, and every reader imports it. ------------------
const declByFile = carriers.filter((f) => n(raw[f], DECL) > 0);
const readerCalls = READERS.map((f) => [f, n(code[f], CALL), n(code[f], IMPORT)]);
const readersOk = readerCalls.every(([, c, i]) => c >= 1 && i >= 1);
ok(`the door is declared exactly once, in the lib/utils home, and all six readers reach it and import it (home ${n(raw[HOME], DECL)}, tree [${declByFile.join(",")}]; ${readerCalls.map(([f, c, i]) => `${f.split("/").pop()}=${c}call/${i}import`).join(", ")})`,
  n(raw[HOME], DECL) === 1 && declByFile.length === 1 && declByFile[0] === HOME && readersOk &&
  readerCalls.length === 6);

// --- 6. BEHAVIOUR: the door answers what the guard did, on every shape and every edge. -------
const strings = ["2026-01-02T03:04:05.000Z", "2026-01-02", "", "not a date", "0"];
const numbers = [0, 1, Date.UTC(2026, 0, 2), NaN, -1];
const dates = [new Date(Date.UTC(2026, 0, 2)), new Date(NaN)];
const asGuard = (v) => {
  if (v instanceof Date) return !Number.isNaN(v.getTime());
  if (typeof v === "number") return !Number.isNaN(v);
  return !Number.isNaN(new Date(v).getTime());
};
const agree =
  strings.every((s) => isRealInstant(s) === asGuard(s)) &&
  numbers.every((v) => isRealInstant(v) === asGuard(v)) &&
  dates.every((d) => isRealInstant(d) === asGuard(d)) &&
  isRealInstant(null) === false && isRealInstant(undefined) === false;
ok(`the door answers what the guard did, on every shape and every edge (${strings.length} strings, ${numbers.length} numbers, ${dates.length} dates, plus null and undefined; a real instant ${isRealInstant("2026-01-02T03:04:05.000Z")}, a blank one ${isRealInstant("")}, an unparseable one ${isRealInstant("not a date")}, a NaN number ${isRealInstant(NaN)})`,
  agree && isRealInstant("2026-01-02T03:04:05.000Z") === true && isRealInstant("") === false &&
  isRealInstant("not a date") === false && isRealInstant(NaN) === false);

// --- 7. MUST-NOT-UNIFY: the door is not `epochMs`. A value it cannot parse is FALSE here and 0
// --- there, and the two are used in opposite places -- a number where one is wanted, a truth
// --- where the other is. NOTE the door inherits `new Date`'s LENIENT parsing, and that is
// --- deliberate: the guard it replaced asked `new Date(x)` the same question, so the door is
// --- faithful. `new Date("42")` parses, and the guard said yes to it too. The numeric-string
// --- check is the one that is a DIFFERENT question, and it stays inline (clause 4). -----------
const epoch = await server.ssrLoadModule("/lib/utils.ts");
ok(`the door is NOT epochMs: a value it cannot parse is FALSE here and 0 there, and the door keeps the guard's own leniency (isRealInstant("not a date") = ${isRealInstant("not a date")} against epochMs("not a date") = ${epoch.epochMs("not a date")}, isRealInstant("") = ${isRealInstant("")} against epochMs("") = ${epoch.epochMs("")})`,
  isRealInstant("not a date") === false && epoch.epochMs("not a date") === 0 && epoch.epochMs("") === 0 &&
  isRealInstant("") === false && isRealInstant("42") === true);

// --- 8. Planted companion for the FALSE above: a real instant must answer TRUE here and a
// --- POSITIVE number there, so the "false" is a measured verdict and not a door that always
// --- says no. A door that answered false for everything would pass clause 7. -------------------
const real = epoch.epochMs("2026-01-02T03:04:05.000Z");
ok(`planted companion: a real instant answers TRUE here and a POSITIVE number there, so the false above is a verdict and not a door that always says no (isRealInstant("2026-01-02T03:04:05.000Z") = ${isRealInstant("2026-01-02T03:04:05.000Z")}, epochMs of the same = ${real}, and the door on that timestamp = ${isRealInstant(real)})`,
  isRealInstant("2026-01-02T03:04:05.000Z") === true && real > 0 && isRealInstant(real) === true);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
