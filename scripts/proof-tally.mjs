// Proof for the tally door — `tally` in domain/attributes.ts. The tally idiom (set the key to its current
// count plus one, defaulting the current count to zero) was hand-written five times across filmInsights'
// event-kind and recurring-focus counts, matchProbability's scoreline counts, review's focus counts and
// CommunityHub's focus counts — every one the same "occurrence tally, zero-initialised, first-occurrence
// insertion order" contract, so it is a door now (M391).
//
// The census charges the idiom — a Map.set whose value is the same map's get of the same key, nullish-or-
// logical-defaulted to zero, plus one — across the whole tree and asserts the only occurrence left is the
// door body, so a re-inline at any reader reddens it. The scan keys on the set/get pair with the default,
// not on "a set happens": a plain set, an object-property count and a get without the plus-one are left
// uncharged (the must-not-unify plants prove exactly that). Run: node scripts/proof-tally.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-tally-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { tally } = await server.ssrLoadModule("/domain/attributes.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/attributes.ts";
const READERS = [
  "domain/filmInsights.ts", "domain/matchProbability.ts",
  "domain/review.ts", "features/community/CommunityHub.tsx",
];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui", "app"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The tally idiom: map.set(key, (map.get(key) <default> 0) + 1), the set key and the get key the same
// expression, and the default either the nullish ?? or the logical || (both mean zero for a count).
const TALLY = /(\w+)\.set\(([^,]+),\s*\(\1\.get\(\2\)\s*(?:\?\?|\|\|)\s*0\)\s*\+\s*1\)/g;
const tallyCount = (text) => count(text, TALLY);

// --- Plants: arm the census so a "only the door body left" verdict is a measurement, and it refuses ----
// --- look-alikes. Both default spellings are charged (same contract); a plain set and an object-property
// --- count are not.
const plantTally = tallyCount("for (const k of ks) m.set(k, (m.get(k) ?? 0) + 1);");
const plantTallyOr = tallyCount("for (const k of ks) m.set(k, (m.get(k) || 0) + 1);");
const plantConverted = tallyCount("const m = tally(xs, (x) => x.k);");
const plantPlainSet = tallyCount("m.set(k, v);");
const plantObjectCount = tallyCount("obj[k] = (obj[k] ?? 0) + 1;");
const plantGetOnly = tallyCount("const n = (m.get(k) ?? 0);");
ok(`the tally census is armed on both default spellings and the converted call, and refuses a plain set, an object-property count and a bare get (nullish ${plantTally}, logical ${plantTallyOr}, converted ${plantConverted}, plain ${plantPlainSet}, object ${plantObjectCount}, get-only ${plantGetOnly})`,
  plantTally === 1 && plantTallyOr === 1 && plantConverted === 0 && plantPlainSet === 0 &&
  plantObjectCount === 0 && plantGetOnly === 0);

// --- Door declaration: tally declared exactly once, in attributes.ts. -----------------------------------
const DECL = /\nexport function tally\b/g;
const plantDecl = count(`\nexport function tally(xs, f) { return new Map(); }`, DECL);
const declFiles = carriers.filter((f) => count(src[f], DECL) > 0);
ok(`tally is declared exactly once, in the door (planted ${plantDecl}, ${declFiles.join(",") || "none"})`,
  plantDecl === 1 && declFiles.length === 1 && declFiles[0] === HOME);

// --- The door body is the tally idiom, zero-initialised. --------------------------------------------------
const bodyLine = (src[HOME].match(/export function tally[\s\S]*?return xs\.reduce[^\n]*/) || [""])[0];
ok(`the door's body is the tally idiom — set the key to its current count plus one, defaulted to zero ("${bodyLine.replace(/\s+/g, " ").trim()}")`,
  /m\.set\(f\(x\),\s*\(m\.get\(f\(x\)\)\s*\?\?\s*0\)\s*\+\s*1\)/.test(bodyLine));

// --- Population floor + every reader present. ----------------------------------------------------------
const present = READERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every reader is inside it (${carriers.length} .ts/.tsx files, ${READERS.length} readers present)`,
  carriers.length >= 80 && present);

// --- Convergence completeness: the only tally in the whole tree is the door body. ------------------------
const treeCount = carriers.reduce((s, f) => s + tallyCount(src[f]), 0);
const homeCount = tallyCount(src[HOME]);
ok(`the only tally in the whole tree is the door body — every reader was converted (tree ${treeCount}, home ${homeCount}; a planted inline would read ${plantTally})`,
  plantTally === 1 && treeCount === 1 && homeCount === 1);

// --- Every reader calls the door and inlines no tally. ----------------------------------------------------
const CALL = /\btally\(/g;
const perCall = READERS.map((f) => [f, count(src[f], CALL)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
ok(`all ${READERS.length} readers call tally and inline no tally (per-file ${perCall.map(([f, n]) => `${f.split("/").pop()}=${n}`).join(",")}, total ${totalCalls})`,
  perCall.every(([, n]) => n >= 1) && totalCalls >= 5 && READERS.every((f) => tallyCount(src[f]) === 0));

// --- Behavioural: the door equals the idiom on every sample, counts, insertion order, empty safe. -------
const SAMPLES = [
  ["a", "b", "a", "c", "a"],
  [],
  ["solo"],
  ["x", "x", "y", "x", "y", "z"],
];
const oldLoop = (xs) => {
  const m = new Map();
  for (const k of xs) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
};
const eqOk = SAMPLES.every((xs) => {
  const viaDoor = tally(xs, (k) => k);
  const viaLoop = oldLoop(xs);
  return viaDoor.size === viaLoop.size &&
    [...viaDoor.entries()].every(([k, n], i) => n === [...viaLoop.entries()][i][1] && k === [...viaLoop.entries()][i][0]);
});
const orderOk = [...tally(["a", "b", "a", "c", "a"], (k) => k).keys()].join(",") === "a,b,c";
const countOk = tally(["a", "b", "a", "c", "a"], (k) => k).get("a") === 3;
const emptyOk = tally([], (k) => k).size === 0;
ok(`the door equals the old loop on every sample, counts occurrences, keeps first-occurrence insertion order and is empty-safe`, eqOk && orderOk && countOk && emptyOk);

// --- Integration: the converted sites' shapes — event kinds, scorelines and focus tallies. --------------
const events = [{ kind: "shot" }, { kind: "scan" }, { kind: "shot" }, { kind: "shot" }];
const kindCounts = tally(events, (e) => e.kind);
const scores = tally([2, 1, 2, 3, 2].map((n) => `${n}-0`), (s) => s);
const focus = tally([["pace"], ["pace", "shot"], ["shot"]].flat(), (k) => k);
ok(`the door reproduces the converted sites' shapes — the event-kind counts, the scoreline counts and the focus tally (shot ${kindCounts.get("shot")}, 2-0 ${scores.get("2-0")}, pace ${focus.get("pace")}, shot ${focus.get("shot")})`,
  kindCounts.get("shot") === 3 && scores.get("2-0") === 3 && focus.get("pace") === 2 && focus.get("shot") === 2);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
