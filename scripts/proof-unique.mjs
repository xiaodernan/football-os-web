// Proof for the dedup door — `unique` in domain/attributes.ts. The spread-over-a-fresh-Set dedup was
// written seven times in two spellings (the spread itself and the Array.from spelling) across attributes'
// category list, training's focus attributes, ai's focus/target/last-focus keys, intelligence's phrase
// list, LearnHub's category tabs and PlayerOS's carried focus — every one the same "first-occurrence
// order preserved" contract, so it is a door now (M388).
//
// The census charges both spellings across the whole tree and asserts the only occurrence left is the
// door body, so a re-inline at any reader reddens it. The scan keys on the materializing spellings, not
// on "a Set appears": a membership test (`new Set(ids).has(id)`) and an iteration (`for (const k of
// new Set(keys))`) are left uncharged — the must-not-unify plants prove exactly that. Run:
// node scripts/proof-unique.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-unique-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { unique } = await server.ssrLoadModule("/domain/attributes.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/attributes.ts";
const READERS = [
  "domain/training.ts", "data/ai.ts", "data/intelligence.ts",
  "features/learn/LearnHub.tsx", "features/player/PlayerOS.tsx",
];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui", "app"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The two materializing spellings of the dedup.
const SPREAD = /\[\.\.\.new Set\(/g;
const FROM = /Array\.from\(new Set\(/g;
const dedupCount = (text) => count(text, SPREAD) + count(text, FROM);

// --- Plants: arm the census so a "only the door body left" verdict is a measurement, and it refuses ----
// --- look-alikes. A membership Set and an iteration Set are different contracts, not dedups.
const plantSpread = dedupCount("const u = [...new Set(xs)];");
const plantFrom = dedupCount("const u = Array.from(new Set(xs));");
const plantConverted = dedupCount("const u = unique(xs);");
const plantMembership = dedupCount("const ok = new Set(ids).has(id);");
const plantIteration = dedupCount("for (const k of new Set(keys)) focusMap.set(k, 0);");
ok(`the dedup census is armed on both spellings and the converted call, and refuses a membership Set and an iteration Set (spread ${plantSpread}, from ${plantFrom}, converted ${plantConverted}, membership ${plantMembership}, iteration ${plantIteration})`,
  plantSpread === 1 && plantFrom === 1 && plantConverted === 0 && plantMembership === 0 && plantIteration === 0);

// --- Door declaration: unique declared exactly once, in attributes.ts. ----------------------------------
const DECL = /\nexport function unique\b/g;
const plantDecl = count(`\nexport function unique(xs) { return [...new Set(xs)]; }`, DECL);
const declFiles = carriers.filter((f) => count(src[f], DECL) > 0);
ok(`unique is declared exactly once, in the door (planted ${plantDecl}, ${declFiles.join(",") || "none"})`,
  plantDecl === 1 && declFiles.length === 1 && declFiles[0] === HOME);

// --- The door body is the spread over a fresh Set. ------------------------------------------------------
const bodyLine = (src[HOME].match(/export function unique[\s\S]*?return \[\.\.\.new Set\(xs\)\];/) || [""])[0];
ok(`the door's body is the spread over a fresh Set, first-occurrence order preserved ("${bodyLine.replace(/\s+/g, " ").trim()}")`,
  /\[\.\.\.new Set\(xs\)\]/.test(bodyLine));

// --- Population floor + every reader present. ----------------------------------------------------------
const present = READERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every reader is inside it (${carriers.length} .ts/.tsx files, ${READERS.length} readers present)`,
  carriers.length >= 80 && present);

// --- Convergence completeness: the only dedup in the whole tree is the door body. ------------------------
const treeCount = carriers.reduce((s, f) => s + dedupCount(src[f]), 0);
const homeCount = dedupCount(src[HOME]);
ok(`the only dedup in the whole tree is the door body — every reader was converted, both spellings (tree ${treeCount}, home ${homeCount}; a planted inline would read ${plantSpread})`,
  plantSpread === 1 && treeCount === 1 && homeCount === 1);

// --- Every reader calls the door and inlines no dedup. ---------------------------------------------------
const CALL = /\bunique\(/g;
const perCall = READERS.map((f) => [f, count(src[f], CALL)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
ok(`all ${READERS.length} readers call unique and inline no dedup (per-file ${perCall.map(([f, n]) => `${f.split("/").pop()}=${n}`).join(",")}, total ${totalCalls})`,
  perCall.every(([, n]) => n >= 1) && totalCalls >= 7 && READERS.every((f) => dedupCount(src[f]) === 0));

// --- Behavioural: the door equals both spellings on every sample, order preserved, empty safe. ----------
const SAMPLES = [
  [1, 2, 2, 3, 1],
  ["b", "a", "b", "c", "a"],
  [],
  ["solo"],
  [3, 1, 3, 2, 1, 2],
];
const eqOk = SAMPLES.every((xs) =>
  unique(xs).length === new Set(xs).size && unique(xs).every((v, i) => v === [...new Set(xs)][i]) &&
  unique(xs).every((v, i) => v === Array.from(new Set(xs))[i]));
const orderOk = unique(["b", "a", "b", "c", "a"]).join(",") === "b,a,c";
const emptyOk = unique([]).length === 0;
ok(`the door equals both spellings on every sample, keeps first-occurrence order and is empty-safe`, eqOk && orderOk && emptyOk);

// --- Integration: the converted sites' shapes — dedupe then slice, dedupe a merged list, dedupe a tab list
const carried = unique(["pace", "shot", "pace"]).slice(0, 2);
const focus = unique([...["pace"], ...["shot", "pass"]]).slice(0, 2);
const tabs = ["All", ...unique(["Passing", "Dribbling", "Passing"])];
ok(`the door reproduces the converted sites' shapes — carried focus, merged focus and the category tabs (carried ${carried.join(",")}, focus ${focus.join(",")}, tabs ${tabs.length})`,
  carried.join(",") === "pace,shot" && focus.join(",") === "pace,shot" && tabs.length === 3 && tabs[0] === "All");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
