// Proof for the sum door — `sum` in domain/attributes.ts. The fold (a running total that starts at zero and
// adds each element's figure) was hand-written about thirty times across the domain, lib, data and the
// feature pages — achievements, analytics, attributes itself, career, filmInsights, learn, load, playerDna,
// review, training, worldEngine, rng's weighted pick, ai's session history and several pages. Every one is
// the same "total of a field (or a computed figure) over a list" contract, so it is a door now (M386).
//
// The census charges three shapes of the fold across the whole tree — the plain `(s, x) => s + …`, the
// destructured `(s, [, w]) => s + w` and the conditional accumulate `(s, d) => (… ? s + d.load : s)` — and
// asserts the only occurrence left is the door body, so a re-inline at any reader reddens it. The scan keys
// on the fold shape, not a literal: an object-merge reduce and a max-reduce are left uncharged (the
// must-not-unify plants prove exactly that); a count-reduce IS charged (same fold, constant selector).
// Run: node scripts/proof-sum.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-sum-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { sum } = await server.ssrLoadModule("/domain/attributes.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/attributes.ts";
const READERS = [
  "domain/achievements.ts", "domain/analytics.ts", "domain/career.ts", "domain/filmInsights.ts",
  "domain/learn.ts", "domain/load.ts", "domain/playerDna.ts", "domain/review.ts", "domain/training.ts",
  "domain/worldEngine.ts", "lib/rng.ts", "data/ai.ts", "features/community/CommunityHub.tsx",
  "features/player/PlayerOS.tsx", "features/tactical/TacticalStudio.tsx",
  "features/transfers/TransferCentre.tsx", "features/watchlist/WatchlistBoard.tsx",
  "features/world/DynamicWorld.tsx",
];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui", "app"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The three fold shapes: plain, destructured-accumulator, conditional-accumulate.
const FOLD_PLAIN = /reduce\(\(s,\s*[a-z]+\)\s*=>\s*s\s*\+/g;
const FOLD_DESTRUCTURE = /reduce\(\(s,\s*\[[^\]]*\]\)\s*=>\s*s\s*\+/g;
const FOLD_CONDITIONAL = /reduce\(\(s,\s*[a-z]+\)\s*=>[^\n]*\?\s*s\s*\+/g;
const foldCount = (text) => count(text, FOLD_PLAIN) + count(text, FOLD_DESTRUCTURE) + count(text, FOLD_CONDITIONAL);

// --- Plants: arm the census so a "only the door body left" verdict is a measurement, and it refuses ----
// --- look-alikes. A count-reduce is charged (same fold, constant selector); object-merge and max are not.
const plantPlain = foldCount("const t = xs.reduce((s, x) => s + x.v, 0);");
const plantDestructure = foldCount("const t = entries.reduce((s, [, w]) => s + w, 0);");
const plantConditional = foldCount("const t = xs.reduce((s, d) => (d.ok ? s + d.load : s), 0);");
const plantConverted = foldCount("const t = sum(xs, (x) => x.v);");
const plantConvertedDestructure = foldCount("const t = sum(entries, ([, w]) => w);");
const plantObjectMerge = foldCount("const m = xs.reduce((s, x) => ({ ...s, [x.id]: x }), {});");
const plantMax = foldCount("const m = xs.reduce((s, x) => s > x.v ? s : x.v, 0);");
const plantCount = foldCount("const n = xs.reduce((s, x) => s + 1, 0);");
ok(`the fold census is armed on all three shapes and the converted calls, refuses an object-merge reduce and a max-reduce, and charges a count-reduce (plain ${plantPlain}, destructure ${plantDestructure}, conditional ${plantConditional}, converted ${plantConverted}+${plantConvertedDestructure}, object-merge ${plantObjectMerge}, max ${plantMax}, count ${plantCount})`,
  plantPlain === 1 && plantDestructure === 1 && plantConditional === 1 && plantConverted === 0 &&
  plantConvertedDestructure === 0 && plantObjectMerge === 0 && plantMax === 0 && plantCount === 1);

// --- Door declaration: sum declared exactly once, in attributes.ts. ------------------------------------
const DECL = /\nexport const sum\s*=/g;
const plantDecl = count(`\nexport const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0);`, DECL);
const declFiles = carriers.filter((f) => count(src[f], DECL) > 0);
ok(`sum is declared exactly once, in the door (planted ${plantDecl}, ${declFiles.join(",") || "none"})`,
  plantDecl === 1 && declFiles.length === 1 && declFiles[0] === HOME);

// --- The door body is the fold, starting at zero, through the caller's selector. ------------------------
const bodyLine = (src[HOME].match(/export const sum[\s\S]*?number => [^\n]*/) || [""])[0];
ok(`the door's body is the fold through the caller's selector, starting at zero ("${bodyLine.replace(/\s+/g, " ").trim()}")`,
  /xs\.reduce\(\(s,\s*x\)\s*=>\s*s\s*\+\s*f\(x\),\s*0\)/.test(bodyLine));

// --- Population floor + every reader present. ----------------------------------------------------------
const present = READERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every reader is inside it (${carriers.length} .ts/.tsx files, ${READERS.length} readers present)`,
  carriers.length >= 80 && present);

// --- Convergence completeness: the only fold in the whole tree is the door body. ------------------------
const treeCount = carriers.reduce((s, f) => s + foldCount(src[f]), 0);
const homeCount = foldCount(src[HOME]);
ok(`the only fold in the whole tree is the door body — every reader was converted (tree ${treeCount}, home ${homeCount}; a planted inline would read ${plantPlain})`,
  plantPlain === 1 && treeCount === 1 && homeCount === 1);

// --- Every reader calls the door and inlines no fold. ---------------------------------------------------
const CALL = /\bsum\(/g;
const perCall = READERS.map((f) => [f, count(src[f], CALL)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
ok(`all ${READERS.length} readers call sum and inline no fold (per-file ${perCall.map(([f, n]) => `${f.split("/").pop()}=${n}`).join(",")}, total ${totalCalls})`,
  perCall.every(([, n]) => n >= 1) && totalCalls >= 32 && READERS.every((f) => foldCount(src[f]) === 0));

// --- Behavioural: the door equals the fold on every shape — plain, destructured, conditional, empty. ---
const NESTED = [[["a", 3], ["b", 4]], [["c", 0]]];
const rows = [{ v: 2 }, { v: -3.5 }, { v: 0 }];
const flags = [{ on: true, w: 3 }, { on: false, w: 9 }, { on: true, w: 1 }];
const plainOk = [
  sum([1, 2, 3], (x) => x) === 6,
  sum([], (x) => x) === 0,
  sum([-1.5, 2.25], (x) => x) === 0.75,
  sum(rows, (r) => r.v) === -1.5,
  sum([10, 20, 30], (v) => (v - 20) ** 2) === 200,
].every(Boolean);
const destructureOk = [
  sum(NESTED[0], ([, w]) => w) === 7,
  sum(NESTED.flat(), ([, w]) => w) === 7,
  sum(NESTED[1], ([, w]) => w) === 0,
].every(Boolean);
const conditionalOk = [
  sum(flags, (f) => (f.on ? f.w : 0)) === 4,
  sum(flags, (f) => (f.on ? f.w : 0)) === flags.reduce((s, f) => (f.on ? s + f.w : s), 0),
].every(Boolean);
ok(`the door equals the fold on every converted shape — plain, empty, computed, destructured and conditional accumulate — so the conversions move no number`, plainOk && destructureOk && conditionalOk);

// --- Integration: the door composes with the callers' guards exactly as the inline forms did. -----------
const weights = [5, 2, 3];
const weightTotal = sum(weights, (w) => w) || 1;
const parts = weights.map((w) => Math.floor((90 * w) / weightTotal));
const rest = 90 - sum(parts, (p) => p);
const form = sum(["W", "D", "L", "W"], (r) => (r === "W" ? 3 : r === "D" ? 1 : 0));
ok(`the door composes with the callers' guards (splitMinutes allocates 90 minutes exactly and the form sum reads 7) (total ${weightTotal}, rest ${rest}, form ${form})`,
  weightTotal === 10 && rest >= 0 && rest < weights.length && form === 7);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
