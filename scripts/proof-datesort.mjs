// Proof for the date-sort doors — `byDateDesc` / `byDateAsc` in domain/attributes.ts. The "order a list by
// an ISO date field" comparison was spelled about eight times as `epochMs(b) - epochMs(a)` (footprint,
// history, profile page) or its `new Date(x).getTime() - new Date(y).getTime()` twin (review, filmInsights,
// community ×2, dashboard). Same contract the comparator doors retired in other forms, so it is a door now
// (M384). Both ride the one epochMs door — they do NOT reimplement it.
//
// The census charges the inline date-sort form (either spelling) across the whole tree and asserts the only
// occurrences are the two door bodies — a re-inline at any reader reddens it. The scan is keyed on the
// subtraction shape, not a literal, so a single `epochMs(x)`, a localeCompare on a date string, and the
// converted `byDateDesc(...)` call are all left uncharged (the must-not-unify plants prove exactly that).
// Run: node scripts/proof-datesort.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-datesort-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { byDateDesc, byDateAsc } = await server.ssrLoadModule("/domain/attributes.ts");
const { epochMs } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/attributes.ts";
const READERS = [
  "domain/footprint.ts", "domain/history.ts", "domain/review.ts", "domain/filmInsights.ts",
  "features/community/CommunityHub.tsx", "features/dashboard/Dashboard.tsx", "features/profile/ProfilePage.tsx",
];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui", "app"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// Inline date-sort forms: epochMs of one arg minus epochMs of the other, OR the equivalent new-Date-getTime
// subtraction. Direction (a-b vs b-a) does not matter for the census — both are the same contract.
const EPOCH_DIFF = /epochMs\([^()]*\)\s*-\s*epochMs\([^()]*\)/g;
const NEW_DIFF = /new Date\([^()]*\)\.getTime\(\)\s*-\s*new Date\([^()]*\)\.getTime\(\)/g;
const dateSortCount = (text) => count(text, EPOCH_DIFF) + count(text, NEW_DIFF);

// --- Plants: arm the census so a "zero leftovers" verdict is a measurement, and it refuses look-alikes. -
const plantEpochInline = dateSortCount("const x = epochMs(b.at) - epochMs(a.at);");
const plantNewInline = dateSortCount("const y = new Date(b.date).getTime() - new Date(a.date).getTime();");
const plantLocale = dateSortCount("const z = a.kickoff.localeCompare(b.kickoff);");
const plantSingle = dateSortCount("const w = epochMs(a.date);");
const plantConverted = dateSortCount("const v = byDateDesc(a.at, b.at);");
ok(`the date-sort census is armed on both spellings, refuses a localeCompare and a lone epochMs, and does not charge the converted call (epoch ${plantEpochInline}, new ${plantNewInline}, locale ${plantLocale}, single ${plantSingle}, converted ${plantConverted})`,
  plantEpochInline === 1 && plantNewInline === 1 && plantLocale === 0 && plantSingle === 0 && plantConverted === 0);

// --- Door declarations: byDateDesc and byDateAsc each declared exactly once, in attributes.ts. ---------
const DECL_DESC = /\nexport const byDateDesc\s*=/g;
const DECL_ASC = /\nexport const byDateAsc\s*=/g;
const plantDecl = count(`\nexport const byDateDesc = (a, b) => epochMs(b) - epochMs(a);`, DECL_DESC);
const declDescFiles = carriers.filter((f) => count(src[f], DECL_DESC) > 0);
const declAscFiles = carriers.filter((f) => count(src[f], DECL_ASC) > 0);
ok(`byDateDesc and byDateAsc are each declared exactly once, in the door (planted ${plantDecl}, desc ${declDescFiles.join(",") || "none"}, asc ${declAscFiles.join(",") || "none"})`,
  plantDecl === 1 && declDescFiles.length === 1 && declDescFiles[0] === HOME && declAscFiles.length === 1 && declAscFiles[0] === HOME);

// --- The door bodies ride epochMs, not a reimplemented max/min. ---------------------------------------
const bodyDesc = (src[HOME].match(/export const byDateDesc = [^\n]*/) || [""])[0];
const bodyAsc = (src[HOME].match(/export const byDateAsc = [^\n]*/) || [""])[0];
ok(`the two date doors' bodies are epochMs(b)-epochMs(a) and epochMs(a)-epochMs(b) — they ride the one epochMs door (desc "${bodyDesc.trim()}", asc "${bodyAsc.trim()}")`,
  bodyDesc.includes("epochMs(b) - epochMs(a)") && bodyAsc.includes("epochMs(a) - epochMs(b)"));

// --- Population floor + every reader present. ------------------------------------------------------
const present = READERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every reader is inside it (${carriers.length} .ts/.tsx files, ${READERS.length} readers present)`,
  carriers.length >= 80 && present);

// --- Convergence completeness: the only inline date-sort in the whole tree is the two door bodies. ------
const treeCount = carriers.reduce((s, f) => s + dateSortCount(src[f]), 0);
const homeCount = dateSortCount(src[HOME]);
ok(`the only inline date-sort in the whole tree is the two date-door bodies — every reader was converted (tree ${treeCount}, home ${homeCount}; a planted inline would read ${plantEpochInline})`,
  plantEpochInline === 1 && homeCount === 2 && treeCount === homeCount);

// --- Every reader calls the door and inlines nothing else. --------------------------------------------
const CALL = /\bbyDateDesc\(|\bbyDateAsc\(/g;
const perCall = READERS.map((f) => [f, count(src[f], CALL)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
ok(`all ${READERS.length} readers call byDateDesc/byDateAsc and inline no date-sort (per-file ${perCall.map(([f, n]) => `${f.split("/").pop()}=${n}`).join(",")}, total ${totalCalls})`,
  perCall.every(([, n]) => n >= 1) && totalCalls >= 8 && READERS.every((f) => dateSortCount(src[f]) === 0));

// --- Must-not-unify: a localeCompare on a date string survives inline (blind spot a naive date-door ---
// --- would fold). footballService keeps `kickoff.localeCompare(a.kickoff)` and the planted localeCompare ---
// --- reads 0, so the census charges the subtraction shape, not "a date appears in a comparator". --------
const fsRaw = src["data/footballService.ts"];
const fsLocale = /kickoff\.localeCompare\(a\.kickoff\)/.test(fsRaw);
ok(`a localeCompare on a date string stays inline — the census charges the subtraction shape, not a date in a comparator (footballService keeps kickoff.localeCompare, planted locale ${plantLocale})`,
  fsLocale && plantLocale === 0);

// --- Behavioural: byDateDesc/byDateAsc equal the epochMs subtraction (and the old new-Date subtraction) -
// --- on every sample, so the conversions move no number and ride epochMs exactly. ---------------------
const SAMPLES = [
  ["2024-01-01T00:00:00Z", "2024-06-01T00:00:00Z"],
  ["2020-05-05T12:00:00Z", "2019-01-01T00:00:00Z"],
  ["2023-12-31T23:59:59Z", "2024-01-01T00:00:00Z"],
];
const descOk = SAMPLES.every(([a, b]) => byDateDesc(a, b) === epochMs(b) - epochMs(a));
const ascOk = SAMPLES.every(([a, b]) => byDateAsc(a, b) === epochMs(a) - epochMs(b));
const oldOk = SAMPLES.every(([a, b]) =>
  byDateDesc(a, b) === new Date(b).getTime() - new Date(a).getTime() &&
  byDateAsc(a, b) === new Date(a).getTime() - new Date(b).getTime());
ok(`byDateDesc/byDateAsc equal the epochMs subtraction and the old new-Date subtraction on every sample, so the conversions move no number`, descOk && ascOk && oldOk);

// --- Behavioural, on the converted sites' own shapes: descending for footprint/history/community/profile,
// --- ascending for review/filmInsights — each door call reproduces the old inline number. --------------
const siteChecks = [
  // byDateDesc(a,b) returns epochMs(b) - epochMs(a); the right side is b - a for this (a=jun, b=jan) pair.
  byDateDesc("2024-06-01T00:00:00Z", "2024-01-01T00:00:00Z") === epochMs("2024-01-01T00:00:00Z") - epochMs("2024-06-01T00:00:00Z"),
  // byDateAsc(a,b) returns epochMs(a) - epochMs(b); the right side is a - b for this (a=jan, b=jun) pair.
  byDateAsc("2024-01-01T00:00:00Z", "2024-06-01T00:00:00Z") === epochMs("2024-01-01T00:00:00Z") - epochMs("2024-06-01T00:00:00Z"),
].every(Boolean);
ok(`the door reproduces the old inline number on a live input from each converted shape (descending and ascending family)`, siteChecks);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
