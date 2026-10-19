// Proof for the argmax door — `maxBy` in domain/attributes.ts. The argmax fold (pick the element with the
// greatest figure under a selector, first max kept) was written twice — the scout report's best-value-at
// pick (call dialect: the selector applied to each side) and the career arc's peak point (field dialect:
// a property read on each side) — same contract, so it is a door now (M389).
//
// The census charges both dialects, accumulator-name-agnostic (backreferences — the M387 lesson), across
// the whole tree and asserts the only occurrence left is the door body, so a re-inline at any reader
// reddens it. ai's nearest-to-target pick keeps a similar fold shape but breaks toward the SMALLEST
// distance and an argmin picks the smallest figure — both different contracts, both left uncharged (the
// must-not-unify plants prove exactly that), as is the Math.max(...xs.map(f)) maximum-of-values shape.
// Run: node scripts/proof-maxby.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-maxby-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { maxBy } = await server.ssrLoadModule("/domain/attributes.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/attributes.ts";
const READERS = ["domain/scouting.ts", "domain/careerArc.ts", "features/football/Details.tsx"];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui", "app"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The two argmax dialects, accumulator-name-agnostic: (acc, x) => (SEL(x) > SEL(acc) ? x : acc), where
// SEL is either a call on the element or a property read, and acc/x are any names (backreferences).
const ARGMAX_CALL = /reduce\(\(([a-z]+),\s*([a-z]+)\)\s*=>\s*\(\s*[^\s(]+\(\2\)\s*>\s*[^\s(]+\(\1\)\s*\?\s*\2\s*:\s*\1\s*\)/g;
const ARGMAX_FIELD = /reduce\(\(([a-z]+),\s*([a-z]+)\)\s*=>\s*\(\s*\2\.\w+\s*>\s*\1\.\w+\s*\?\s*\2\s*:\s*\1\s*\)/g;
const argmaxCount = (text) => count(text, ARGMAX_CALL) + count(text, ARGMAX_FIELD);

// --- Plants: arm the census so a "only the door body left" verdict is a measurement, and it refuses ----
// --- look-alikes. A named accumulator (the M387 lesson) is charged; nearest, argmin and Math.max are not.
const plantCall = argmaxCount("const p = pool.reduce((best, cur) => (valueIndex(cur) > valueIndex(best) ? cur : best));");
const plantField = argmaxCount("const peak = points.reduce((best, pt) => (pt.overall > best.overall ? pt : best), points[0]);");
const plantNamed = argmaxCount("const p = pool.reduce((top, x) => (f(x) > f(top) ? x : top));");
const plantConverted = argmaxCount("const p = maxBy(pool, valueIndex);");
const plantNearest = argmaxCount("const p = opts.reduce((p, c) => (Math.abs(c - m) < Math.abs(p - m) ? c : p), opts[0]);");
const plantArgmin = argmaxCount("const p = pool.reduce((best, cur) => (valueIndex(cur) < valueIndex(best) ? cur : best));");
const plantMathMax = argmaxCount("const m = Math.max(...xs.map(f));");
ok(`the argmax census is armed on both dialects and a differently-named accumulator, and refuses the converted call, a nearest-to-target pick, an argmin and the Math.max spread (call ${plantCall}, field ${plantField}, named ${plantNamed}, converted ${plantConverted}, nearest ${plantNearest}, argmin ${plantArgmin}, mathmax ${plantMathMax})`,
  plantCall === 1 && plantField === 1 && plantNamed === 1 && plantConverted === 0 && plantNearest === 0 &&
  plantArgmin === 0 && plantMathMax === 0);

// --- Door declaration: maxBy declared exactly once, in attributes.ts. -----------------------------------
const DECL = /\nexport function maxBy\b/g;
const plantDecl = count(`\nexport function maxBy(xs, f) { return 0; }`, DECL);
const declFiles = carriers.filter((f) => count(src[f], DECL) > 0);
ok(`maxBy is declared exactly once, in the door (planted ${plantDecl}, ${declFiles.join(",") || "none"})`,
  plantDecl === 1 && declFiles.length === 1 && declFiles[0] === HOME);

// --- The door body is the argmax fold, greatest figure wins, first max kept. ----------------------------
const body = (src[HOME].match(/export function maxBy[\s\S]*?return xs\.reduce[^\n]*/) || [""])[0];
ok(`the door's body is the argmax fold — greatest figure wins, first max kept ("${body.replace(/\s+/g, " ").trim()}")`,
  /xs\.reduce\(\(best,\s*x\)\s*=>\s*\(f\(x\)\s*>\s*f\(best\)\s*\?\s*x\s*:\s*best\)\)/.test(body));

// --- Population floor + every reader present. ----------------------------------------------------------
const present = READERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every reader is inside it (${carriers.length} .ts/.tsx files, ${READERS.length} readers present)`,
  carriers.length >= 80 && present);

// --- Convergence completeness: the only argmax in the whole tree is the door body. -----------------------
const treeCount = carriers.reduce((s, f) => s + argmaxCount(src[f]), 0);
const homeCount = argmaxCount(src[HOME]);
ok(`the only argmax in the whole tree is the door body — every reader was converted (tree ${treeCount}, home ${homeCount}; a planted inline would read ${plantCall})`,
  plantCall === 1 && treeCount === 1 && homeCount === 1);

// --- Every reader calls the door and inlines no argmax. --------------------------------------------------
const CALL = /\bmaxBy\(/g;
const perCall = READERS.map((f) => [f, count(src[f], CALL)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
ok(`all ${READERS.length} readers call maxBy and inline no argmax (per-file ${perCall.map(([f, n]) => `${f.split("/").pop()}=${n}`).join(",")}, total ${totalCalls})`,
  perCall.every(([, n]) => n >= 1) && totalCalls >= 3 && READERS.every((f) => argmaxCount(src[f]) === 0));

// --- Behavioural: the door equals both dialects on every sample, first max kept, single safe, empty throws
const POINTS = [
  { age: 20, overall: 70 }, { age: 24, overall: 78 }, { age: 27, overall: 78 }, { age: 30, overall: 74 },
];
const POOL = [
  { id: "a", value: 5_000_000, overall: 80 }, { id: "b", value: 2_000_000, overall: 82 },
  { id: "c", value: 8_000_000, overall: 79 }, { id: "d", value: 2_000_000, overall: 82 },
];
const valueIndex = (p) => (p.value > 0 ? p.overall / (p.value / 1_000_000) : p.overall);
const fieldOk = POINTS.every((xs) => true) &&
  maxBy(POINTS, (pt) => pt.overall).age === 24 &&
  maxBy(POINTS, (pt) => pt.overall) === POINTS.reduce((best, pt) => (pt.overall > best.overall ? pt : best), POINTS[0]);
const callOk =
  maxBy(POOL, valueIndex).id === "b" &&
  maxBy(POOL, valueIndex) === POOL.reduce((best, cur) => (valueIndex(cur) > valueIndex(best) ? cur : best));
const singleOk = maxBy([{ v: 5 }], (x) => x.v).v === 5;
let threw = false;
try { maxBy([], (x) => x); } catch { threw = true; }
ok(`the door equals both dialects on every sample (first max kept on ties — b over the later d), is single-safe and throws on empty like the no-init fold`, fieldOk && callOk && singleOk && threw);

// --- Integration: the two converted sites' shapes — the career peak point and the scout best value. ----
const peak = maxBy(POINTS, (pt) => pt.overall);
const bestValue = maxBy(POOL, valueIndex);
const detailsAge = maxBy(POINTS, (p) => p.overall).age;
ok(`the door reproduces the converted sites' shapes — the career peak point (age 24, overall 78), the scout best value (b, the first max on ties) and the details peak age (24) (peak ${peak.age}/${peak.overall}, best ${bestValue.id}, details ${detailsAge})`,
  peak.age === 24 && peak.overall === 78 && bestValue.id === "b" && detailsAge === 24);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
