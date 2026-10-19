// Proof for the sum door — `sum` in domain/attributes.ts. The fold (a running total that starts at zero and
// adds each element's figure) was hand-written thirty-four times across the domain, lib, data and the
// feature pages (M386), and eight more escaped the first census by naming their accumulator anything other
// than `s` — `sum`, `a`, `n` (M387 widens the census to any accumulator name and converges those).
//
// The census charges three shapes of the fold across the whole tree — the plain `(<acc>, x) => <acc> + …`
// (accumulator-agnostic via a backreference, so `a`, `n`, `sum` all count), the destructured
// `(<acc>, [, w]) => <acc> + w` and the conditional accumulate `(<acc>, d) => (… ? <acc> + d.load : <acc>)`
// — and asserts the only occurrence left is the door body, so a re-inline at any reader reddens it. The
// scan keys on the fold shape, not a literal: an object-merge reduce, a product reduce, a max reduce and a
// nearest reduce are left uncharged (the must-not-unify plants prove exactly that); a count-reduce IS
// charged (same fold, constant selector). Run: node scripts/proof-sum.mjs
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
  "domain/worldEngine.ts", "data/ai.ts", "features/community/CommunityHub.tsx",
  "features/player/PlayerOS.tsx", "features/profile/ProfilePage.tsx",
  "features/tactical/TacticalStudio.tsx", "features/transfers/TransferCentre.tsx",
  "features/watchlist/WatchlistBoard.tsx", "features/world/DynamicWorld.tsx",
];
// rng's weighted-pick total keeps the fold inline on purpose: lib/rng.ts must stay dependency-free
// (proof-rng's cross-process fingerprint loads it through a bare Node with its own TS stripper, which
// cannot resolve the @/domain alias), so it does not import this door.
const RNG_SURVIVOR = "lib/rng.ts";

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui", "app"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The fold shapes, accumulator-agnostic: the accumulator name is a backreference, so a fold that names its
// accumulator `a`, `n` or `sum` is charged exactly like one that names it `s`. M386's census keyed on `s`
// alone and eight folds escaped through that hole; M387 widened it.
const FOLD = /reduce\(\(([a-z]+),\s*[^)]*\)\s*=>\s*\1\s*\+/g;
const FOLD_CONDITIONAL = /reduce\(\(([a-z]+),\s*[^)]*\)\s*=>[^\n]*\?\s*\1\s*\+/g;
const foldCount = (text) => count(text, FOLD) + count(text, FOLD_CONDITIONAL);

// --- Plants: arm the census so a "only the door body left" verdict is a measurement, and it refuses ----
// --- look-alikes. A count-reduce is charged (same fold, constant selector); object-merge, product, max ----
// --- and nearest reduces are not. The `a`-named and `sum`-named plants are the M386 escape shapes.
const plantA = foldCount("const t = xs.reduce((a, b) => a + b, 0);");
const plantSumNamed = foldCount("const t = xs.reduce((sum, r) => sum + r.v, 0);");
const plantN = foldCount("const t = clips.reduce((n, c) => n + (c.report?.durationSec ?? 0), 0) / 60;");
const plantDestructure = foldCount("const t = entries.reduce((s, [, w]) => s + w, 0);");
const plantConditional = foldCount("const t = xs.reduce((s, d) => (d.ok ? s + d.load : s), 0);");
const plantConverted = foldCount("const t = sum(xs, (x) => x.v);");
const plantObjectMerge = foldCount("const m = xs.reduce((s, x) => ({ ...s, [x.id]: x }), {});");
const plantProduct = foldCount("const t = xs.reduce((chance, r) => chance * (1 - r.p), 1);");
const plantMax = foldCount("const m = pool.reduce((best, cur) => (f(cur) > f(best) ? cur : best));");
const plantNearest = foldCount("const t = opts.reduce((p, c) => (d(c) < d(p) ? c : p), opts[0]);");
const plantCount = foldCount("const n = xs.reduce((s, x) => s + 1, 0);");
ok(`the fold census is armed on every accumulator name (the M386 escape shapes a, sum, n), the destructured and conditional shapes, and the converted call, and refuses object-merge, product, max and nearest reduces while charging a count-reduce (a ${plantA}, sum ${plantSumNamed}, n ${plantN}, destructure ${plantDestructure}, conditional ${plantConditional}, converted ${plantConverted}, object-merge ${plantObjectMerge}, product ${plantProduct}, max ${plantMax}, nearest ${plantNearest}, count ${plantCount})`,
  plantA === 1 && plantSumNamed === 1 && plantN === 1 && plantDestructure === 1 && plantConditional === 1 &&
  plantConverted === 0 && plantObjectMerge === 0 && plantProduct === 0 && plantMax === 0 &&
  plantNearest === 0 && plantCount === 1);

// --- Door declaration: sum declared exactly once, in attributes.ts. ------------------------------------
const DECL = /\nexport function sum\b/g;
const plantDecl = count(`\nexport function sum(xs, f) { return xs.reduce((s, x) => s + f(x), 0); }`, DECL);
const declFiles = carriers.filter((f) => count(src[f], DECL) > 0);
ok(`sum is declared exactly once, in the door (planted ${plantDecl}, ${declFiles.join(",") || "none"})`,
  plantDecl === 1 && declFiles.length === 1 && declFiles[0] === HOME);

// --- The door body is the fold, starting at zero, through the caller's selector. ------------------------
const bodyLine = (src[HOME].match(/export function sum[\s\S]*?return xs\.reduce[^\n]*/) || [""])[0];
ok(`the door's body is the fold through the caller's selector, starting at zero ("${bodyLine.replace(/\s+/g, " ").trim()}")`,
  /xs\.reduce\(\(s,\s*x\)\s*=>\s*s\s*\+\s*f\(x\),\s*0\)/.test(bodyLine));

// --- Population floor + every reader present. ----------------------------------------------------------
const present = READERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every reader is inside it (${carriers.length} .ts/.tsx files, ${READERS.length} readers present)`,
  carriers.length >= 80 && present);

// --- Convergence completeness: the only fold in the whole tree is the door body and rng's survivor. -------
const treeCount = carriers.reduce((s, f) => s + foldCount(src[f]), 0);
const homeCount = foldCount(src[HOME]);
const rngCount = foldCount(src[RNG_SURVIVOR]);
ok(`the only folds left in the whole tree are the door body and rng's weighted-pick total — every reader was converted (tree ${treeCount} = home ${homeCount} + rng ${rngCount}; a planted inline would read ${plantA})`,
  plantA === 1 && treeCount === 2 && homeCount === 1 && rngCount === 1);

// --- rng's survivor is the documented dependency-free fold, not a stray re-inline. ----------------------
const rngLine = (src[RNG_SURVIVOR].match(/[^\n]*entries\.reduce[^\n]*/) || [""])[0];
ok(`rng's survivor is the weighted-pick total inside lib/rng.ts, which stays dependency-free on purpose ("${rngLine.trim()}")`,
  rngLine.includes("entries.reduce") && rngCount === 1);

// --- Every reader calls the door and inlines no fold. ---------------------------------------------------
const CALL = /\bsum\(/g;
const perCall = READERS.map((f) => [f, count(src[f], CALL)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
ok(`all ${READERS.length} readers call sum and inline no fold (per-file ${perCall.map(([f, n]) => `${f.split("/").pop()}=${n}`).join(",")}, total ${totalCalls})`,
  perCall.every(([, n]) => n >= 1) && totalCalls >= 39 && READERS.every((f) => foldCount(src[f]) === 0));

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
const avgRating = sum([4, 3, 5], (r) => r) / 3;
ok(`the door composes with the callers' guards (splitMinutes allocates 90 minutes exactly, the form sum reads 7 and the identity average reads 4) (total ${weightTotal}, rest ${rest}, form ${form}, avg ${avgRating})`,
  weightTotal === 10 && rest >= 0 && rest < weights.length && form === 7 && avgRating === 4);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
