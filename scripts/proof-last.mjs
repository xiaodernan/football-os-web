// Proof for the last-element door — `last` in domain/attributes.ts. The index form and the slice form
// were hand-written ten times across history's day buckets, review's progress window, scouting's
// worst-edge picks (twice), rng's weighted-pick fallback, the profile's last result and last session,
// the dynamic world's latest season step, the details' final arc point and onboarding's surname initial
// — every one the same "final element, undefined when empty" contract, so it is a door now (M390).
//
// The census charges both spellings across the whole tree and asserts the only occurrences left are the
// door body and footballSeed's surname split (another session's in-flight file, left untouched), so a
// re-inline at any reader reddens it. The scan keys on the last-element shapes, not on indexing in
// general: a first-element read, a penultimate read and a pop() are left uncharged (the must-not-unify
// plants prove exactly that). Run: node scripts/proof-last.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-last-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { last } = await server.ssrLoadModule("/domain/attributes.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/attributes.ts";
const READERS = [
  "domain/history.ts", "domain/review.ts", "domain/scouting.ts",
  "features/profile/ProfilePage.tsx", "features/world/DynamicWorld.tsx",
  "features/football/Details.tsx", "features/onboarding/Onboarding.tsx",
];
const SURVIVOR = "data/footballSeed.ts";
// rng's weighted-pick fallback keeps the index form inline on purpose: lib/rng.ts must stay
// dependency-free (proof-rng's cross-process fingerprint loads it through a bare Node with its own TS
// stripper, which cannot resolve the @/domain alias), so it does not import this door.
const RNG_SURVIVOR = "lib/rng.ts";

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui", "app"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The two last-element spellings: the index form (dotted paths allowed on both sides) and the slice form.
const INDEX = /\w+(?:\.\w+)*\[\w+(?:\.\w+)*\.length\s*-\s*1\]/g;
const SLICE = /\.slice\(-1\)\[0\]/g;
const lastCount = (text) => count(text, INDEX) + count(text, SLICE);

// --- Plants: arm the census so a "only the door body and the survivor left" verdict is a measurement, --
// --- and it refuses look-alikes. A first read, a penultimate read and a pop are different contracts.
const plantIndex = lastCount("const x = xs[xs.length - 1];");
const plantSlice = lastCount("const x = xs.slice(-1)[0];");
const plantDotted = lastCount("const x = a.b[a.b.length - 1];");
const plantConverted = lastCount("const x = last(xs);");
const plantFirst = lastCount("const x = xs[0];");
const plantPenult = lastCount("const x = xs[xs.length - 2];");
const plantPop = lastCount("const x = xs.pop();");
ok(`the last census is armed on both spellings (index, slice, dotted) and the converted call, and refuses a first read, a penultimate read and a pop (index ${plantIndex}, slice ${plantSlice}, dotted ${plantDotted}, converted ${plantConverted}, first ${plantFirst}, penult ${plantPenult}, pop ${plantPop})`,
  plantIndex === 1 && plantSlice === 1 && plantDotted === 1 && plantConverted === 0 &&
  plantFirst === 0 && plantPenult === 0 && plantPop === 0);

// --- Door declaration: last declared exactly once, in attributes.ts. ------------------------------------
const DECL = /\nexport function last\b/g;
const plantDecl = count(`\nexport function last(xs) { return xs[xs.length - 1]; }`, DECL);
const declFiles = carriers.filter((f) => count(src[f], DECL) > 0);
ok(`last is declared exactly once, in the door (planted ${plantDecl}, ${declFiles.join(",") || "none"})`,
  plantDecl === 1 && declFiles.length === 1 && declFiles[0] === HOME);

// --- The door body is the index read, undefined when empty. ---------------------------------------------
const bodyLine = (src[HOME].match(/export function last[\s\S]*?return xs\[xs\.length\s*-\s*1\];/) || [""])[0];
ok(`the door's body is the index read — final element, undefined when empty ("${bodyLine.replace(/\s+/g, " ").trim()}")`,
  /xs\[xs\.length\s*-\s*1\]/.test(bodyLine));

// --- Population floor + every reader present. ----------------------------------------------------------
const present = READERS.concat([HOME, SURVIVOR]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every reader and the survivor are inside it (${carriers.length} .ts/.tsx files, ${READERS.length} readers + survivor present)`,
  carriers.length >= 80 && present);

// --- Convergence completeness: only the door body, footballSeed's surname split and rng's fallback remain.
const treeCount = carriers.reduce((s, f) => s + lastCount(src[f]), 0);
const homeCount = lastCount(src[HOME]);
const seedCount = lastCount(src[SURVIVOR]);
const rngCount = lastCount(src[RNG_SURVIVOR]);
ok(`the only last-element reads left are the door body, footballSeed's surname split (another session's in-flight file, left untouched) and rng's weighted-pick fallback (which stays dependency-free on purpose) — every reader was converted (tree ${treeCount} = home ${homeCount} + seed ${seedCount} + rng ${rngCount}; a planted inline would read ${plantIndex})`,
  plantIndex === 1 && treeCount === 3 && homeCount === 1 && seedCount === 1 && rngCount === 1);

// --- The rng survivor is the documented dependency-free fallback, not a stray re-inline. -----------------
const rngLine = (src[RNG_SURVIVOR].match(/[^\n]*entries\[entries\.length\s*-\s*1\][^\n]*/) || [""])[0];
ok(`rng's survivor is the weighted-pick fallback inside lib/rng.ts, which stays dependency-free on purpose ("${rngLine.trim()}")`,
  rngLine.includes("entries[entries.length - 1]") && rngCount === 1);

// --- Every reader calls the door and inlines no last-element read. --------------------------------------
const CALL = /\blast\(/g;
const perCall = READERS.map((f) => [f, count(src[f], CALL)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
ok(`all ${READERS.length} readers call last and inline no last-element read (per-file ${perCall.map(([f, n]) => `${f.split("/").pop()}=${n}`).join(",")}, total ${totalCalls})`,
  perCall.every(([, n]) => n >= 1) && totalCalls >= 9 && READERS.every((f) => lastCount(src[f]) === 0));

// --- The survivor is the documented split-word form, not a stray re-inline. ------------------------------
const seedLine = (src[SURVIVOR].match(/[^\n]*\.slice\(-1\)\[0\][^\n]*/) || [""])[0];
ok(`footballSeed's survivor is the surname split (the last word of a name), another session's in-flight file ("${seedLine.trim()}")`,
  seedLine.includes("split(") && seedLine.includes(".slice(-1)[0]"));

// --- Behavioural: the door equals both spellings on every sample, does not mutate, undefined when empty.
const SAMPLES = [[1, 2, 3], ["a"], [], [true, false], [{ v: 1 }, { v: 2 }]];
const eqOk = SAMPLES.every((xs) => {
  const viaIndex = xs[xs.length - 1];
  const viaSlice = xs.slice(-1)[0];
  return last(xs) === viaIndex && last(xs) === viaSlice;
});
const noMutateOk = (() => { const xs = [1, 2, 3]; last(xs); return xs.length === 3 && xs[2] === 3; })();
const emptyOk = last([]) === undefined;
ok(`the door equals both spellings on every sample, does not mutate its input and is undefined on empty`, eqOk && noMutateOk && emptyOk);

// --- Integration: the converted sites' shapes — a guarded bucket append, a guarded read and a rename-safe
// --- rename of the dynamic world's local (which shadows the door name inside its component). -----------
const groups = [{ day: "2024-01-01", items: [1] }];
const lastDay = last(groups);
const appended = lastDay && lastDay.day === "2024-01-01" ? lastDay.items.push(2) : 0;
const latest = [{ avgOverall: 78, marketTotal: 5 }, { avgOverall: 80, marketTotal: 7 }];
const avgNow = last(latest)?.avgOverall ?? 0;
ok(`the door reproduces the converted sites' shapes — the guarded day-bucket append and the dynamic world's latest-season read (appended ${appended}, avg ${avgNow})`,
  appended === 2 && avgNow === 80);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
