// Proof for the shared index-a-list-by-`id` door (`indexById`, declared once in lib/utils.ts:17 as
// `return new Map(list.map((x) => [x.id, x]))`). Eleven call sites across six consumers (analytics,
// learn, worldEngine, footballSeed, footballService, LearnHub) read the door, yet scripts/ never proved
// it was declared once, re-spelled nowhere outside its body, and imported by every caller — the same
// census debt M363/M371/M372 paid for the round family, now for the by-id index door. Purely additive:
// edits NO shipped source and NO lib/utils door.
//
// indexById shares ONLY the exact `[<x>.id, <x>]`-into-a-`new Map` shape. Five sibling map-builders
// live in the tree and MUST NOT be folded, each charged zero by the door's scan:
//   · derived-value maps — `[c.id, { ...c, clubIds: [] }]` keys by id but indexes a TRANSFORMED row, not
//     the item itself (footballSeed). The scan requires the value to be the same identifier as the key.
//   · non-id-keyed maps — `[m.clubId, m]`, `[f.key, f.sessions]`, `[s.bucket, s.avg]` index by a
//     different field (and some a different value). The scan anchors on `.id`.
//   · `Object.fromEntries(x.map((o) => [o.id, o]))` — the SAME indexing but a plain-Object return; a
//     `.get`/`.size`-less shape, so folding it onto indexById would change the type every caller holds.
// scripts/ and dev/ are not walked, so the plants arm the scans; a re-spelled `new Map(list.map((x) =>
// [x.id, x]))` in ANY shipped file other than the door's own home reddens the convergence clause. The
// door's docstring ALSO spells the idiom, so the convergence census excludes HOME (the door cannot be
// charged as its own stray).
// Run: node scripts/proof-index-by-id.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Vite SSR module-runner waits on the shared dep-optimizer a concurrent build/writer dev-server churn
// (.vite/deps lock stalls ssrLoadModule at the 60s timeout). Defenses: an owned per-PID cacheDir OUTSIDE
// the repo plus noDiscovery/empty include so Node resolves clsx externally and the witness arms' children
// never collide.
const server = await createServer({
  cacheDir: join(tmpdir(), `proof-index-by-id-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { indexById } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "ui", "app", "i18n"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The index-by-id idiom in its inlined spelling: a `new Map(` whose payload is `LIST.map(<param> =>
// [<param>.id, <param>])`. The LIST source allows one nested paren level (`getClubs().map(...)`) so a
// caller that maps over a call result is never blind-spotted. KEY = `<param>.id`, VALUE = `<param>`
// itself (backreference), so a transformed value `[x.id, {...x}]` or a non-id key `[m.clubId, m]` reads
// zero. The `new Map(` prefix rejects the plain-Object `Object.fromEntries([x.id, x])` spelling.
const LISTARG = String.raw`(?:[^()]|\([^()]*\))*`;
const ID_IDIOM = new RegExp(
  "new Map\\(\\s*" + LISTARG + "\\.map\\(\\s*\\(?\\s*(\\w+)\\s*\\)?\\s*=>\\s*\\[\\1\\.id,\\s*\\1\\s*\\]\\s*\\)\\s*\\)",
  "g");
const NEW_MAP = /new Map\(/g;                        // the naive census a "merge all maps" fold would use
const DECL_INDEXBYID = /\bexport function indexById\b/g;
const IMPORT_INDEXBYID = /import[^;]*\bindexById\b[^;]*from ["']@\/lib\/utils["']/g;
const CALL_INDEXBYID = /\bindexById\(/g;             // invocations only: `indexById<T...>(` and `, indexById` lack `indexById(`.
// The door's own return line, pinned literally. ID_IDIOM alone would accept ANY param name and any list
// variable, so it cannot say "the door still IS the idiom this app's eleven callers replaced"; the literal
// half pins that spelling. The two halves charge different things, so both are planted below.
const BODY_EXACT = /return new Map\(list\.map\(\(x\) => \[x\.id, x\]\)\);/;
const doorReturn = (src[HOME].match(/return new Map\([^\n]*/) || [""])[0];

// --- Plants: arm every scan so a "once"/"only"/"survives" verdict is a measurement, never an empty set. ---
const pDecl = count(`\nexport function indexById<T>(list: readonly T[]) {}`, DECL_INDEXBYID);
const pImport = count(`import { clamp, indexById } from "@/lib/utils";`, IMPORT_INDEXBYID);
const pCall = count(`const m = indexById(clubs);`, CALL_INDEXBYID);
const pIdiom = count(`const m = new Map(list.map((x) => [x.id, x]));`, ID_IDIOM);
const pIdiomDeep = count(`const m = new Map(getClubs().map((x) => [x.id, x]));`, ID_IDIOM); // LIST is a call
// Must-not-unify siblings the indexById census must charge ZERO:
const sDerived = count(`const m = new Map(cs.map((c) => [c.id, { ...c, clubIds: [] }]));`, ID_IDIOM); // value transformed
const sOtherKey = count(`const m = new Map(ms.map((m) => [m.clubId, m]));`, ID_IDIOM);                 // non-id key
const sKeyValue = count(`const m = new Map(fs.map((f) => [f.key, f.sessions]));`, ID_IDIOM);           // non-id key + non-item value
const sObject = count(`const m = Object.fromEntries(xs.map((x) => [x.id, x]));`, ID_IDIOM);            // plain-Object return
const sObjectArmed = count(`const m = Object.fromEntries(xs.map((x) => [x.id, x]));`, /Object\.fromEntries\(/g);
// Body-guard plants: the literal half of clause 4 must ACCEPT the shipped spelling and refuse a
// transformed value; the shape half must refuse it too, yet ACCEPT a renamed param the literal refuses.
// Without this pair clause 4 could be a never-matching regex (paid: the first draft pinned one `)` short
// and was red on a green tree).
const bShip = BODY_EXACT.test(doorReturn) && count(doorReturn, ID_IDIOM) === 1;
const bMutantValue = BODY_EXACT.test(`return new Map(list.map((x) => [x.id, { ...x }]));`) === false && count(`return new Map(list.map((x) => [x.id, { ...x }]));`, ID_IDIOM) === 0;
const bMutantParam = BODY_EXACT.test(`return new Map(items.map((o) => [o.id, o]));`) === false && count(`return new Map(items.map((o) => [o.id, o]));`, ID_IDIOM) === 1;
ok(`the indexById scans are armed (decl ${pDecl}, import ${pImport}, call ${pCall}, idiom ${pIdiom}, idiom-over-call ${pIdiomDeep}) and every map sibling reads uncharged by ID_IDIOM (derived-value ${sDerived}, other-key ${sOtherKey}, key-value ${sKeyValue}, object-form ${sObject}) while the object scan arms it (${sObjectArmed}); the body guard reads 1/0 on the door and a transformed value, and the shape scan still arms a renamed param the literal refuses (${bShip}/${bMutantValue}/${bMutantParam})`,
  pDecl === 1 && pImport === 1 && pCall === 1 && pIdiom === 1 && pIdiomDeep === 1 &&
  sDerived === 0 && sOtherKey === 0 && sKeyValue === 0 && sObject === 0 && sObjectArmed === 1 &&
  bShip && bMutantValue && bMutantParam);

// --- Population floor + subject presence (a blind walk would read an empty tree and pass a negative claim). ---
const present = [HOME, "domain/analytics.ts", "domain/learn.ts", "domain/worldEngine.ts"].every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and the indexById consumers are inside it (${carriers.length} .ts/.tsx, floor 80)`,
  carriers.length >= 80 && present);

// --- Structural: the indexById door is declared exactly once, and only in its home. ---
const declByFile = carriers.filter((f) => count(src[f], DECL_INDEXBYID) > 0);
ok(`indexById is declared exactly once, in the lib/utils door (home ${count(src[HOME], DECL_INDEXBYID)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_INDEXBYID) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- Body guard: the door's return line IS the exact idiom the eleven callers replaced. ---
ok(`the door body IS the index-by-id idiom (body "${doorReturn.trim()}")`,
  BODY_EXACT.test(doorReturn.trim()) && count(doorReturn, ID_IDIOM) === 1);

// --- Convergence completeness: OUTSIDE the door's home (whose docstring also spells the idiom), no shipped ---
// --- file re-inlines it. Even though four other files build a `new Map(`, NONE of them re-spells the index ---
// --- door — the blind spot a naive "any new Map(" census would swallow. HOME excluded because the door cannot ---
// --- be charged as its own stray. (M425 took the Data Room's map away with it: the screen reads the domain's ---
// --- forecast now, so it no longer indexes the metrics itself.) ---
const idiomFiles = carriers.filter((f) => count(src[f], ID_IDIOM) > 0);
const strays = idiomFiles.filter((f) => f !== HOME);
const otherNewMapFiles = carriers.filter((f) => f !== HOME && count(src[f], NEW_MAP) >= 1);
const plantStray = count(`const m = new Map(list.map((x) => [x.id, x]));`, ID_IDIOM);
ok(`the index-by-id idiom survives only in the door's home (idiom carriers ${idiomFiles.join(",")}; non-home strays ${strays.length}; ${otherNewMapFiles.length} other files build a new Map yet NONE re-spell the door; a planted stray would read ${plantStray})`,
  plantStray === 1 && idiomFiles.length === 1 && idiomFiles[0] === HOME && strays.length === 0 && otherNewMapFiles.length >= 4);

// --- Derived consumer census: every shipped file that CALLS indexById IMPORTS it (HOME's declaration line ---
// --- spells `indexById<` not `indexById(`, so it is not its own caller). The set is derived from the bytes. ---
const callers = carriers.filter((f) => f !== HOME && count(src[f], CALL_INDEXBYID) >= 1);
const orphanCallers = callers.filter((f) => count(src[f], IMPORT_INDEXBYID) === 0);
const totalCalls = callers.reduce((s, f) => s + count(src[f], CALL_INDEXBYID), 0);
ok(`every external caller of indexById imports it and the door has wide reach (${callers.length} files, ${callers.map((f) => f.split("/").pop()).join(",")}; orphans ${orphanCallers.length}; total external calls ${totalCalls})`,
  callers.length >= 4 && orphanCallers.length === 0 && totalCalls >= 10);

// --- Must-not-unify in the tree: the four real map-builders OUTSIDE the door are each a different indexing ---
// --- contract, charged zero by ID_IDIOM, so no "all maps are the same" merge would fold them onto indexById. ---
const mapSites = ["domain/review.ts", "domain/transfers.ts", "data/footballSeed.ts", "data/footballService.ts"];
const siblingUncharged = mapSites.every((f) => !Object.prototype.hasOwnProperty.call(src, f) || count(src[f], ID_IDIOM) === 0);
ok(`the four non-index Map spellings are real map-builders the door leaves uncharged (review/transfers/footballSeed/footballService each new Map(...) yet ID_IDIOM reads them ${mapSites.map((f) => (src[f] ? count(src[f], ID_IDIOM) : "absent")).join(",")})`,
  siblingUncharged && otherNewMapFiles.length >= 4);

// --- Must-not-unify return type: indexById returns a Map (.get/.size); the same indexing via ---
// --- Object.fromEntries returns a plain Object — a caller that swapped them would call .get on an Object. ---
const asMap = indexById([{ id: "a", v: 1 }, { id: "b", v: 2 }]);
const asObject = Object.fromEntries([{ id: "a", v: 1 }].map((x) => [x.id, x]));
ok(`indexById returns a Map while the object-form indexing returns a plain Object (Map: ${asMap instanceof Map} .get→${asMap.get("a")?.v}; Object: ${asObject instanceof Map ? "Map" : "Object"} .get→${typeof asObject.get})`,
  asMap instanceof Map && typeof asMap.get === "function" && !(asObject instanceof Map) && typeof asObject.get !== "function" && asObject["a"].v === 1);

// --- Must-not-unify key identity: indexById keys ONLY by `.id`; indexing the same list by another field is a ---
// --- different door. A clubId map misses the id lookup the door serves. ---
const rows = [{ id: "p1", clubId: "c9" }, { id: "p2", clubId: "c9" }];
const byId2 = indexById(rows);
const byClub = new Map(rows.map((r) => [r.clubId, r]));
ok(`indexById keys by .id (get("p1") hits, get("c9") misses) while a clubId-keyed map is a different door (byClub.get("p1")=${byClub.get("p1")})`,
  byId2.has("p1") && !byId2.has("c9") && byClub.has("c9") && !byClub.has("p1"));

// --- Behavioural: indexById reproduces `new Map(list.map((x) => [x.id, x]))` exactly — same size, same ---
// --- .get per id, last-duplicate-wins — so any future fold onto the door changes no lookup a caller does. ---
const dup = [{ id: "a", v: 1 }, { id: "a", v: 9 }, { id: "b", v: 2 }];
const ref = new Map(dup.map((x) => [x.id, x]));
const got = indexById(dup);
ok(`indexById reproduces the inline idiom exactly (size ${got.size}==${ref.size}, last-dup-wins get("a").v=${got.get("a").v}, per-id .get equal across ${[...ref.keys()].length} ids)`,
  got.size === ref.size && got.get("a").v === 9 && [...ref.keys()].every((k) => got.get(k) === ref.get(k)));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
