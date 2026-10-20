// Proof for the URL-parameter doors.
//
// The defect: a value in the URL is READER-SUPPLIED. The Matches tab read it with a cast that
// LIED to the type system -- `query.get("status") as "LIVE"` told the compiler the value was
// the literal "LIVE" when it could be any string at all -- so a reader who typed
// `?status=bogus` reached the tab with "bogus" in the state: the status filter matched nothing,
// the list came up empty, and no tab was highlighted. A cast cannot check a value; a door can.
//
// The census charges the family closed, the door's behaviour, and the ONE thing the fold must
// not have done: the app also reads parameters whose PRESENCE matters (a carried mentality, a
// carried formation shape), and those answer null for an absent parameter. A door that folded
// the empty string into them would have taken away the answer those sites are asking for.
//
// Run: node scripts/proof-param.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-param-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { paramText, paramOneOf } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
const READERS = ["features/compare/ComparePage.tsx", "features/football/FootballWorld.tsx"];
// The old spellings: a parameter read with an empty-string default, and a parameter read through
// a cast that asserts a literal type.
const TEXT_DEFAULT = /query\.get\(\s*"[^"]*"\s*\)\s*\?\?\s*""/g;
const LIE_CAST = /query\.get\(\s*"[^"]*"\s*\)\s*as\s*"/g;
// The presence family: a parameter read whose null is the answer.
const PRESENCE = /query\.get\(\s*"/g;
const DECL_TEXT = /export const paramText = \(query: URLSearchParams, name: string\): string =>/;
const DECL_ONE = /export const paramOneOf = <T extends string>\(/;
const CALL_TEXT = /\bparamText\s*\(/g;
const CALL_ONE = /\bparamOneOf\s*\(/g;

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const raw = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const code = Object.fromEntries(carriers.map((f) => [f, raw[f].split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n")]));
const n = (text, re) => (text.match(re) || []).length;

// --- 1. Plants: arm the scan, so a "zero"/"seven" verdict is measured. -------------------------
const pText = n('const q = query.get("a") ?? "";', TEXT_DEFAULT);
const pLie = n('(query.get("status") as "LIVE") || "SCHEDULED"', LIE_CAST);
const pPresence = n('const raw = query.get("f");', PRESENCE);
const pTextDoor = n('const q = paramText(query, "a");', CALL_TEXT);
const pOneDoor = n('paramOneOf(query, "status", MATCH_STATUSES, "SCHEDULED")', CALL_ONE);
const pDeclText = n("export const paramText = (query: URLSearchParams, name: string): string => x;", DECL_TEXT);
const pDeclOne = n("export const paramOneOf = <T extends string>(", DECL_ONE);
ok(`the scans are armed and the old spellings are what they draw (a text default ${pText}, a lying cast ${pLie}, a presence read ${pPresence}; the doors: paramText ${pTextDoor}, paramOneOf ${pOneDoor}, declarations ${pDeclText}/${pDeclOne})`,
  pText === 1 && pLie === 1 && pPresence === 1 && pTextDoor === 1 && pOneDoor === 1 &&
  pDeclText === 1 && pDeclOne === 1);

// --- 2. Population floor + subject presence. -------------------------------------------------
const present = READERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(raw, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx, floor 90)`,
  carriers.length >= 90 && present);

// --- 3. The old spellings are gone: no text default and no lying cast survives in app code. ----
const textByFile = carriers.filter((f) => f !== HOME && n(code[f], TEXT_DEFAULT) > 0);
const lieByFile = carriers.filter((f) => f !== HOME && n(code[f], LIE_CAST) > 0);
const textTotal = carriers.reduce((s, f) => s + (f === HOME ? 0 : n(code[f], TEXT_DEFAULT)), 0);
const lieTotal = carriers.reduce((s, f) => s + (f === HOME ? 0 : n(code[f], LIE_CAST)), 0);
ok(`the old spellings are gone: no parameter read defaults to the empty string and no parameter read is cast to a literal type (${textTotal} text default(s) outside the door [${textByFile.join(",")}]; ${lieTotal} lying cast(s) [${lieByFile.join(",")}])`,
  textTotal === 0 && lieTotal === 0 && textByFile.length === 0 && lieByFile.length === 0);

// --- 4. The PRESENCE family stayed: a parameter whose null is the answer keeps the raw read. --
const presenceSites = carriers.filter((f) => n(code[f], PRESENCE) > 0);
const presenceTotal = carriers.reduce((s, f) => s + n(code[f], PRESENCE), 0);
ok(`the presence family stayed on the raw read: a carried mentality, a carried shape and a filter value still answer null for an absent parameter (${presenceTotal} site(s) over ${presenceSites.length} file(s) [${presenceSites.join(",")}])`,
  presenceTotal === 4 && presenceSites.length === 3);

// --- 5. The doors are declared once, in their home, and the readers reach them. ----------------
const declText = carriers.filter((f) => n(raw[f], DECL_TEXT) > 0);
const declOne = carriers.filter((f) => n(raw[f], DECL_ONE) > 0);
const readerCalls = READERS.map((f) => [f, n(code[f], CALL_TEXT) + n(code[f], CALL_ONE)]);
const readerImports = READERS.map((f) => [f, /import[^;]*\bparam(Text|OneOf)\b[^;]*from ["']@\/lib\/utils["']/.test(code[f])]);
ok(`the doors are declared exactly once each, in the lib/utils home, and both readers reach them and import them (paramText in [${declText.join(",")}], paramOneOf in [${declOne.join(",")}]; ${readerCalls.map(([f, c]) => `${f.split("/").pop()}=${c}`).join(", ")}; imports ${readerImports.map(([f, i]) => `${f.split("/").pop()}=${i ? "yes" : "NO"}`).join(", ")})`,
  declText.length === 1 && declText[0] === HOME && declOne.length === 1 && declOne[0] === HOME &&
  readerCalls.every(([, c]) => c >= 1) && readerImports.every(([, i]) => i));

// --- 6. BEHAVIOUR: the text door answers "" for an absent parameter and the value otherwise;
// --- and the validating door answers one of the allowed values or the caller's fallback. ------
const q = new URLSearchParams("?a=alice&status=LIVE&club=ars");
const qEmpty = new URLSearchParams("");
ok(`the doors answer what they promise: the text door gives "" for an absent parameter and the value otherwise (paramText(qEmpty, "q") = ${JSON.stringify(paramText(qEmpty, "q"))}, paramText(q, "a") = ${JSON.stringify(paramText(q, "a"))}), and the validating door gives one of the allowed values or the fallback (paramOneOf(q, "status", ["LIVE", "SCHEDULED", "FINISHED"], "SCHEDULED") = ${JSON.stringify(paramOneOf(q, "status", ["LIVE", "SCHEDULED", "FINISHED"], "SCHEDULED"))}, and for a value the app does not expect, ${JSON.stringify(paramOneOf(new URLSearchParams("?status=bogus"), "status", ["LIVE", "SCHEDULED", "FINISHED"], "SCHEDULED"))})`,
  paramText(qEmpty, "q") === "" && paramText(q, "a") === "alice" &&
  paramOneOf(q, "status", ["LIVE", "SCHEDULED", "FINISHED"], "SCHEDULED") === "LIVE" &&
  paramOneOf(new URLSearchParams("?status=bogus"), "status", ["LIVE", "SCHEDULED", "FINISHED"], "SCHEDULED") === "SCHEDULED" &&
  paramOneOf(qEmpty, "status", ["LIVE", "SCHEDULED", "FINISHED"], "SCHEDULED") === "SCHEDULED");

// --- 7. THE DEFECT IS CLOSED: the reader who types a status the app does not expect lands on
// --- the tab the app would have chosen, not on an empty list with nothing highlighted. ------
const ALLOWED = ["LIVE", "SCHEDULED", "FINISHED"];
const chosen = (status) => paramOneOf(new URLSearchParams(status ? `?status=${status}` : ""), "status", ALLOWED, "SCHEDULED");
ok(`the defect is closed: a status the reader typed that the app does not expect now lands on the tab the app would have chosen (bogus -> ${chosen("bogus")}, LIVE -> ${chosen("LIVE")}, FINISHED -> ${chosen("FINISHED")}, absent -> ${chosen("")}), and the chosen value is always one of the three the tab strip draws`,
  chosen("bogus") === "SCHEDULED" && chosen("LIVE") === "LIVE" && chosen("FINISHED") === "FINISHED" &&
  chosen("") === "SCHEDULED" && ALLOWED.includes(chosen("bogus")));

// --- 8. MUST-NOT-UNIFY: the validating door is not the text door. A value outside the allowed
// --- set is not passed through, and the text door passes everything through. -------------------
const sneaky = new URLSearchParams("?status=bogus");
ok(`the validating door is not the text door: it refuses a value outside the allowed set while the text door passes it (paramOneOf -> ${JSON.stringify(paramOneOf(sneaky, "status", ALLOWED, "SCHEDULED"))}, paramText -> ${JSON.stringify(paramText(sneaky, "status"))})`,
  paramOneOf(sneaky, "status", ALLOWED, "SCHEDULED") === "SCHEDULED" &&
  paramText(sneaky, "status") === "bogus");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
