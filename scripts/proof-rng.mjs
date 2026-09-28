// M210 — a proof for lib/rng.ts, the generator every seeded claim in Demo Mode leans on.
//
// The module's header promises one thing: "every Demo Mode result is reproducible from a seed".
// Until now that promise was checked only sideways — whichever consumer happened to assert a
// golden value. This file pins the primitives themselves: the hash against an independent
// from-spec FNV-1a implementation, the generator's state and seed-collapse behaviour, the exact
// index math of every helper at the boundary draws, the weight intervals, and the two claims the
// app as a whole rests on (no unseeded draw anywhere, and no export nobody calls).
//
// Where an expectation is a NUMBER it is measured here and printed in the clause name, because
// the runner only shows detail on failure. Where behaviour is unreachable through the shipped
// generator (a draw of exactly 1, an empty array) the clause says so instead of pretending to
// forbid it.
import { createServer } from "vite";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log(`ok   ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const R = await server.ssrLoadModule("/lib/rng.ts");
const { hashString, makeRng, rngInt, rngFloat, pick, weightedPick } = R;
const SRC = readFileSync(join(root, "lib", "rng.ts"), "utf8");

// ---------------------------------------------------------------------------
// 0 · what the module declares about itself
// ---------------------------------------------------------------------------
const DECL = {
  offset: /h\s*=\s*(2166136261|0x811c9dc5)/.test(SRC),
  prime: /Math\.imul\(h,\s*(16777619|0x01000193)/.test(SRC),
  increment: /(0x6d2b79f5|1831565813)/.test(SRC),
  divisor: /\/\s*4294967296/.test(SRC),
  mulberryName: /mulberry32/.test(SRC),
};
ok(`the module names the algorithms it claims (FNV offset basis, FNV prime ${DECL.prime ? "16777619" : "?"}, mulberry32 increment, 2^32 divisor: ${Object.values(DECL).filter(Boolean).length}/5 declared)`,
  Object.values(DECL).every(Boolean), JSON.stringify(DECL));
const INC = 0x6d2b79f5; // read from the same declaration above, used to derive a state edge below

// ---------------------------------------------------------------------------
// 1 · hashString — an independent implementation, not a copy of the shipped one
// ---------------------------------------------------------------------------
// From the FNV-1a spec, byte-wise, using BigInt arithmetic so it shares no operation with
// Math.imul / >>> 0 in the module under test.
function fnvBytes(str) {
  let h = 0x811c9dc5n;
  for (const b of new TextEncoder().encode(str)) {
    h ^= BigInt(b);
    h = (h * 0x01000193n) & 0xffffffffn;
  }
  return Number(h);
}
const SEEDS = ["", "a", "b", "foobar", "hello", "football-os", "Manchester City", "Silva", "t-race-prem", "m7|3086677262", "video-3|clip.mp4|1024000"];
const DISAGREE = SEEDS.filter((s) => hashString(s) !== fnvBytes(s));
ok(`hashString agrees with a from-spec FNV-1a implementation on all ${SEEDS.length - DISAGREE.length} ASCII seeds tried (${DISAGREE.length} disagreements)`,
  DISAGREE.length === 0, DISAGREE.join(","));
ok(`hashString("") is the offset basis ${0x811c9dc5} — an empty seed is a defined stream, not zero and not an error`,
  hashString("") === 2166136261, String(hashString("")));
ok(`hashString("a") = ${hashString("a")} = 0x${hashString("a").toString(16)}, FNV-1a's published single-byte vector 0xe40c292c`,
  hashString("a") === 3826002220);
{
  const cjk = "足球";
  ok(`a non-ASCII seed hashes over UTF-16 code units, not UTF-8 bytes (${cjk}: shipped ${hashString(cjk)} vs byte-FNV ${fnvBytes(cjk)}) — the streams differ, both are stable`,
    hashString(cjk) !== fnvBytes(cjk) && hashString(cjk) === hashString(cjk));
}
{
  let lo = Infinity, hi = -Infinity, bad = 0;
  for (let i = 0; i < 20000; i++) {
    const h = hashString("s" + i);
    if (!Number.isInteger(h) || h < 0 || h >= 2 ** 32) bad++;
    lo = Math.min(lo, h); hi = Math.max(hi, h);
  }
  ok(`20 000 seeds all land in the unsigned 32-bit range (min ${lo}, max ${hi}, ${bad} outside)`, bad === 0);
  const seen = new Set();
  for (let i = 0; i < 200000; i++) seen.add(hashString("s" + i));
  ok(`200 000 sequential seeds produce ${seen.size} distinct hashes (0 collisions at this scale — the app's seed space is far smaller)`, seen.size === 200000);
  const base = "Arsenal vs Chelsea";
  const near = new Set(Array.from({ length: 100 }, (_, i) => hashString(base + i)));
  ok(`one trailing character changes the hash every time (${near.size}/100 distinct over "${base}0…99")`, near.size === 100);
}

// ---------------------------------------------------------------------------
// 2 · makeRng — state, seeds, and the reproducibility claim
// ---------------------------------------------------------------------------
{
  const a = makeRng("pair"), b = makeRng("pair");
  let diverged = -1;
  for (let i = 0; i < 500; i++) if (a() !== b()) { diverged = i; break; }
  ok(`two generators from one seed produce the same 500 draws (diverged at ${diverged === -1 ? "never" : diverged})`, diverged === -1);
  const one = Array.from({ length: 8 }, makeRng("advance"));
  ok(`one generator advances instead of repeating (8 draws, ${new Set(one).size} distinct)`, new Set(one).size === 8);
  ok("the string path is exactly the numeric path over hashString, for 12 seeds",
    ["alpha", "", "football-os", "m7", "t-race-prem", "Silva", "pl", "liga", "x".repeat(200), "视频", "1|2|3", "seed"].every((s) => makeRng(s)() === makeRng(hashString(s))()));
}
{
  const collapses = [
    [-1, 4294967295],
    [3.7, 3],
    [NaN, 0],
    [-0.5, 0],
  ].filter(([x, y]) => JSON.stringify(Array.from({ length: 6 }, makeRng(x))) === JSON.stringify(Array.from({ length: 6 }, makeRng(y))));
  ok(`a numeric seed is a 32-bit unsigned slot, so it collapses: ${collapses.length}/4 measured (-1≡4294967295, 3.7≡3, NaN≡0, -0.5≡0) — every call site in the app passes a string, so no live stream depends on a fractional or signed seed`,
    collapses.length === 4);
}
{
  const zeroSeed = 2 ** 32 - INC; // the state that wraps to 0 on the first advance
  ok(`a draw of exactly 0 is attainable: makeRng(${zeroSeed})() === ${makeRng(zeroSeed)()} (state wraps to 0), while its neighbour ${zeroSeed + 1} draws ${makeRng(zeroSeed + 1)().toFixed(6)} — so the range is closed at the bottom`,
    makeRng(zeroSeed)() === 0 && makeRng(zeroSeed + 1)() !== 0);
}
{
  const f = makeRng("range");
  let lo = 1, hi = 0;
  const set = new Set();
  for (let i = 0; i < 200000; i++) { const v = f(); lo = Math.min(lo, v); hi = Math.max(hi, v); set.add(v); }
  ok(`200 000 draws stay in [0,1) — measured min ${lo.toExponential(3)}, max ${hi.toFixed(9)}, ${set.size} distinct, ${[...set].filter((v) => v >= 1).length} at or above 1`,
    lo >= 0 && hi < 1 && set.size > 199000);
  let s = 0, s2 = 0;
  const g = makeRng("moments"), n = 200000;
  for (let i = 0; i < n; i++) { const v = g(); s += v; s2 += v * v; }
  const mean = s / n, variance = s2 / n - mean * mean;
  ok(`the draws look uniform rather than merely in range (mean ${mean.toFixed(5)} vs 0.5, variance ${variance.toFixed(5)} vs ${1 / 12})`,
    Math.abs(mean - 0.5) < 0.005 && Math.abs(variance - 1 / 12) < 0.002);
}
{
  // The header's promise is cross-process: a fresh Node, loading the .ts through its own type
  // stripper (a different module pipeline from the browser's), must produce the same stream.
  const CHILD = `import("file:///" + process.env.RNG_PATH.replace(/\\\\/g, "/")).then((m) => {
  const f = m.makeRng("alpha");
  let acc = 0;
  for (let i = 0; i < 200; i++) { const v = f(); acc = (acc * 31 + Math.round(v * 1e9)) | 0; }
  process.stdout.write(JSON.stringify({ keys: Object.keys(m).sort().join(","), acc, first: m.makeRng("alpha")(), hash: m.hashString("foobar") }));
}).catch((e) => { process.stdout.write(JSON.stringify({ error: String(e && e.message).slice(0, 200) })); });`;
  let child = null, spawnError = "";
  try {
    child = JSON.parse(execFileSync(process.execPath, ["-e", CHILD], {
      cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
      env: { ...process.env, RNG_PATH: join(root, "lib", "rng.ts") },
    }).trim());
  } catch (e) { spawnError = String(e && e.message).slice(0, 200); }
  const parentAcc = (() => { const f = makeRng("alpha"); let acc = 0; for (let i = 0; i < 200; i++) acc = (acc * 31 + Math.round(f() * 1e9)) | 0; return acc; })();
  ok(`a second process (bare node + its own TS stripper) reproduces the same 200-draw fingerprint${child ? `: ${child.acc} === ${parentAcc}` : ""}`,
    !!child && child.acc === parentAcc, spawnError || JSON.stringify(child));
  ok(`the same second process reads the same export set${child ? ` (${child.keys})` : ""}`,
    !!child && child.keys === Object.keys(R).sort().join(","), spawnError || JSON.stringify(child));
  ok(`and the same hash for a known seed${child ? ` (foobar → ${child.hash})` : ""}`,
    !!child && child.hash === hashString("foobar") && child.hash === 3214735720, spawnError || JSON.stringify(child));
}

// ---------------------------------------------------------------------------
// 3 · rngInt / rngFloat — index math, through a scripted draw rather than a lucky one
// ---------------------------------------------------------------------------
const at = (v) => () => v;
{
  const table = [[0, 3], [0.25, 4], [0.5, 6], [0.75, 8], [1 - Number.EPSILON / 2, 9]];
  const got = table.map(([v]) => rngInt(at(v), 3, 9));
  ok(`rngInt is inclusive at both ends: draws ${table.map((t) => t[0]).join(", ")} over [3,9] → ${got.join(", ")} (min at 0, max at the largest draw below 1)`,
    JSON.stringify(got) === JSON.stringify(table.map((t) => t[1])));
  ok(`a single-value range always returns it (rngInt(·,5,5) on 3 draws → ${[0, 0.5, 0.99].map((v) => rngInt(at(v), 5, 5)).join(",")})`,
    [0, 0.5, 0.99].every((v) => rngInt(at(v), 5, 5) === 5));
  const escaped = rngInt(at(1), 3, 9);
  const maxDraw = (() => { let hi = 0; const f = makeRng("range"); for (let i = 0; i < 200000; i++) hi = Math.max(hi, f()); return hi; })();
  ok(`a draw of exactly 1 WOULD leave the range (rngInt(1,3,9) = ${escaped}), and the shipped generator never produces one (${200000} draws, largest ${maxDraw.toFixed(9)}) — so the range claim holds for real rngs and only for them`,
    escaped === 10 && maxDraw < 1);
  const reversed = [0, 0.25, 0.5, 0.75, 1 - Number.EPSILON / 2].map((v) => rngInt(at(v), 9, 3));
  ok(`reversed bounds are not normalised: rngInt(·,9,3) yields ${reversed.join(",")} — values above the "max", which is why a bound derived from a possibly-empty list would show up as a wrong value rather than a crash`,
    reversed.every((v) => v >= 4 && v <= 9));
  ok(`non-integer bounds round outward (rngInt(0.9999, 1, 2.5) = ${rngInt(at(0.9999), 1, 2.5)} > 2.5)`, rngInt(at(0.9999), 1, 2.5) === 3);
  ok(`a NaN bound propagates rather than clamping (${rngInt(at(0.5), NaN, 9)})`, Number.isNaN(rngInt(at(0.5), NaN, 9)));
  const f = makeRng("edges");
  const seen = new Set();
  for (let i = 0; i < 50000; i++) seen.add(rngInt(f, 0, 9));
  ok(`every bucket is actually reached: 50 000 draws over [0,9] produced ${seen.size} distinct values (${[...seen].sort((a, b) => a - b).join(",")})`,
    seen.size === 10 && Math.min(...seen) === 0 && Math.max(...seen) === 9);
  const g = makeRng("neg");
  let lo = 99, hi = -99;
  for (let i = 0; i < 50000; i++) { const v = rngInt(g, -8, -3); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  ok(`negative ranges stay inside (50 000 draws over [-8,-3] → ${lo}…${hi}), the shape worldEngine's age bands use`, lo === -8 && hi === -3);
}
{
  ok(`rngFloat is [min,max) at the bottom and reaches the top only at a draw of 1 (at(0)→${rngFloat(at(0), 3, 9)}, at(0.25)→${rngFloat(at(0.25), 3, 9)}, at(1)→${rngFloat(at(1), 3, 9)})`,
    rngFloat(at(0), 3, 9) === 3 && rngFloat(at(0.25), 3, 9) === 4.5 && rngFloat(at(1), 3, 9) === 9);
  const f = makeRng("rf");
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 200000; i++) { const v = rngFloat(f, -2, 5); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  ok(`200 000 real draws over [-2,5] span ${lo.toFixed(7)}…${hi.toFixed(7)} and never touch 5`, lo >= -2 && hi < 5);
}

// ---------------------------------------------------------------------------
// 4 · pick — the helper that types a lie for an empty array
// ---------------------------------------------------------------------------
{
  const ARR = ["a", "b", "c", "d", "e"];
  const draws = [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1 - Number.EPSILON / 2];
  const mismatched = draws.filter((v) => pick(at(v), ARR) !== ARR[Math.floor(v * ARR.length)]);
  ok(`pick returns exactly arr[floor(draw × length)] for ${draws.length - mismatched.length}/${draws.length} scripted draws (${mismatched.join(",") || "no mismatch"})`,
    mismatched.length === 0);
  const buckets = {};
  for (const v of draws) { const k = pick(at(v), ARR); buckets[k] = (buckets[k] || 0) + 1; }
  ok(`the sweep visits all ${ARR.length} buckets, ${ARR.map((c) => `${c}:${buckets[c] || 0}`).join(" ")}, in the order the boundaries imply (${draws.map((v) => pick(at(v), ARR)).join("")})`,
    ARR.every((c) => buckets[c] > 0) && draws.map((v) => pick(at(v), ARR)).join("") === "aabccddee");
  const src = [...ARR];
  pick(at(0.5), src); pick(at(0.99), src);
  ok(`pick never mutates or reorders what it was given (${JSON.stringify(src)})`, JSON.stringify(src) === JSON.stringify(ARR));
  const f = makeRng("pick");
  let bad = 0;
  for (let i = 0; i < 100000; i++) if (!ARR.includes(pick(f, ARR))) bad++;
  ok(`100 000 real draws never leave the array (${bad} out-of-bounds)`, bad === 0);
  ok(`an empty array yields ${String(pick(at(0.5), []))} while the signature says T — unreachable for the app's literal pools, and the reason the census clause below exists`,
    pick(at(0), []) === undefined && pick(at(0.5), []) === undefined);
}

// ---------------------------------------------------------------------------
// 5 · weightedPick — interval edges, zero weights, and proportionality
// ---------------------------------------------------------------------------
{
  const W = [["x", 3], ["y", 1], ["z", 6]]; // total 10 → x (0,0.3], y (0.3,0.4], z (0.4,1]
  const sweep = [0, 0.001, 0.29, 0.3, 0.31, 0.39, 0.4, 0.999, 1 - Number.EPSILON / 2].map((v) => [v, weightedPick(at(v), W)]);
  // The expectation is derived from the interval claim itself, not typed from a run:
  // cumulative weight 3/4/10 over the total 10, and a draw lands on the first entry whose
  // cumulative it has not yet passed.
  let cum = 0;
  const edges = W.map(([v, w]) => [v, (cum += w) / 10]);
  const expected = sweep.map(([d]) => edges.find(([, top]) => d <= top)[0]).join("");
  ok(`an entry's interval is (previous cumulative, its own cumulative]: draws ${sweep.map((s) => s[0]).join(" ")} → ${sweep.map((s) => s[1]).join("")} against the derived ${expected} (${edges.map(([v, t]) => `${v}≤${t}`).join(" ")})`,
    sweep.map((s) => s[1]).join("") === expected && expected === "xxxxyyyzz");
  const counted = {};
  for (let i = 0; i <= 1000; i++) { const v = weightedPick(at(i / 1000), [["a", 4], ["b", 0], ["c", 6]]); counted[v] = (counted[v] || 0) + 1; }
  ok(`a zero weight is unreachable: 1001 scripted draws over [[a,4],[b,0],[c,6]] → ${JSON.stringify(counted)}`, counted.b === undefined && counted.a === 401);
  ok(`except at the exact boundary: a LEADING zero-weight entry is taken by a draw of exactly 0 (${weightedPick(at(0), [["never", 0], ["always", 5]])}), the "${"<="}" in the loop's exit test`,
    weightedPick(at(0), [["never", 0], ["always", 5]]) === "never" && weightedPick(at(0.001), [["never", 0], ["always", 5]]) === "always");
  ok(`all-zero weights fall through to the first entry (${weightedPick(at(0), [["a", 0], ["b", 0]])}) rather than returning nothing`,
    weightedPick(at(0), [["a", 0], ["b", 0]]) === "a");
  let threw = "";
  try { weightedPick(at(0), []); } catch (e) { threw = e.constructor.name; }
  ok(`an empty entry list THROWS where pick returns undefined (${threw || "did not throw"}) — the two helpers refuse differently, so a call site cannot rely on either`,
    threw === "TypeError");
  ok(`negative weights are not validated: [[a,5],[b,-5]] totals 0 and yields ${weightedPick(at(0.5), [["a", 5], ["b", -5]])} at both extremes`,
    weightedPick(at(0.5), [["a", 5], ["b", -5]]) === "a" && weightedPick(at(0.9), [["a", 5], ["b", -5]]) === "a");
  const entries = [["a", 5], ["b", -5]];
  ok(`weightedPick does not touch its entries (${JSON.stringify(entries)})`, JSON.stringify(entries) === JSON.stringify([["a", 5], ["b", -5]]));
  const f = makeRng("wp");
  const c = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < 120000; i++) c[weightedPick(f, W)]++;
  const p = { x: c.x / 120000, y: c.y / 120000, z: c.z / 120000 };
  ok(`120 000 real draws track the declared weights: ${p.x.toFixed(4)} / ${p.y.toFixed(4)} / ${p.z.toFixed(4)} against 0.30 / 0.10 / 0.60 (each within 0.01)`,
    Math.abs(p.x - 0.3) < 0.01 && Math.abs(p.y - 0.1) < 0.01 && Math.abs(p.z - 0.6) < 0.01);
  // The engine's own shape: two float weights that are never 0 (Math.max(0.2, …) floors them).
  const fw = [["H", 0.7], ["A", 0.3]];
  ok(`float weights partition the same way — the Simulation Lab's chance-side pick reaches both arms (${[0, 0.5, 0.9].map((v) => weightedPick(at(v), fw)).join(",")})`,
    weightedPick(at(0), fw) === "H" && weightedPick(at(0.9), fw) === "A");
}

// ---------------------------------------------------------------------------
// 6 · the module's own surface: no export without a call site
// ---------------------------------------------------------------------------
const APP_DIRS = ["data", "domain", "features", "components", "i18n", "lib", "store", "hooks", "src", "functions", "ui"];
function appFiles(dir = "", out = []) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return out;
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) appFiles(rel, out);
    else if (/\.tsx?$/.test(e.name)) out.push(rel);
  }
  return out;
}
const FILES = appFiles().filter((f) => f !== "lib/rng.ts");
const DECLARED = [...SRC.matchAll(/export function (\w+)/g)].map((m) => m[1]);
const RUNTIME_EXPORTS = Object.keys(R).sort();
ok(`lib/rng.ts declares ${DECLARED.length} exports and the loaded module offers the same set (${DECLARED.slice().sort().join(", ")})`,
  JSON.stringify(DECLARED.slice().sort()) === JSON.stringify(RUNTIME_EXPORTS));
{
  const callSites = DECLARED.map((name) => {
    let n = 0;
    for (const f of FILES) n += (readFileSync(join(root, f), "utf8").match(new RegExp(`(?<![.\\w$])${name}\\s*[(<]`, "g")) || []).length;
    return { name, n };
  });
  const dead = callSites.filter((c) => c.n === 0);
  ok(`every export is called by app source — ${callSites.map((c) => `${c.name}×${c.n}`).join(", ")} across ${FILES.length} files (${dead.length} dead)`,
    dead.length === 0, dead.map((d) => d.name).join(","));
  ok(`the two functions this milestone removed are gone, not hidden: shuffle=${String(R.shuffle)} · seededAttribute=${String(R.seededAttribute)} (measured 0 call sites repo-wide before removal)`,
    R.shuffle === undefined && R.seededAttribute === undefined);
}
{
  const random = [];
  for (const f of FILES) if (/Math\.random\s*\(/.test(readFileSync(join(root, f), "utf8"))) random.push(f);
  ok(`no app source draws unseeded randomness (${random.length ? random.join(",") : `0 of ${FILES.length} .ts/.tsx files mention Math.random`} — "reproducible from a seed" is a property of the whole tree, not of this module)`,
    random.length === 0);
}

// ---------------------------------------------------------------------------
// 7 · consumers: the bounds the generator is asked for, and the pools it picks from
// ---------------------------------------------------------------------------
// An index into a side-selected list must derive its bound from that same list. Two sites in
// domain/matchEngine.ts asked the HOME squad how long the AWAY squad was; both squads are 11 by
// construction, so the answer happened to be right and the result is byte-identical after the
// fix. "Happened to be right" is the defect.
const IDENT_INDEX = /([A-Za-z_$][\w$]*)\s*\[\s*\(?\s*rngInt\(\s*[^,]+,\s*0\s*,\s*(?:Math\.min\(\s*\d+\s*,\s*)?([A-Za-z_$][\w$]*)\.length/g;
const TERNARY_INDEX = /\(\s*[^?:()]+\?\s*([A-Za-z_$][\w$]*)\s*:\s*([A-Za-z_$][\w$]*)\s*\)\s*\[\s*\(?\s*rngInt\(\s*[^,]+,\s*0\s*,\s*(?:Math\.min\(\s*\d+\s*,\s*)?([A-Za-z_$][\w$]*)\.length/g;
function aliasing(text) {
  const bad = [];
  let m;
  IDENT_INDEX.lastIndex = 0;
  while ((m = IDENT_INDEX.exec(text))) if (m[1] !== m[2]) bad.push(`${m[1]} indexed by ${m[2]}.length`);
  TERNARY_INDEX.lastIndex = 0;
  while ((m = TERNARY_INDEX.exec(text))) bad.push(`(${m[1]} : ${m[2]}) indexed by ${m[3]}.length`);
  return bad;
}
{
  const planted = [
    ["legal  x[rngInt(rng, 0, x.length - 1)]", "const v = x[rngInt(rng, 0, x.length - 1)];", 0],
    ["legal  x[rngInt(rng, 0, Math.min(3, x.length - 1))]", "const v = x[rngInt(rng, 0, Math.min(3, x.length - 1))];", 0],
    ["illegal y indexed by x.length", "const v = y[rngInt(rng, 0, x.length - 1)];", 1],
    ["illegal (isHome ? a : b) indexed by a.length", "const v = (isHome ? a : b)[rngInt(rng, 0, a.length - 1)];", 1],
    ["illegal, capped ternary site", "const v = (isHome ? homeNames : awayNames)[rngInt(rng, 0, Math.min(3, homeNames.length - 1))];", 1],
  ];
  const wrong = planted.filter(([label, src, expect]) => aliasing(src).length !== expect);
  ok(`the aliasing scanner is tested both ways on ${planted.length - wrong.length}/${planted.length} planted spellings (2 legal, 3 illegal, including the two shapes that shipped)`,
    wrong.length === 0, wrong.map((w) => w[0]).join("; "));
  const all = FILES.map((f) => [f, aliasing(readFileSync(join(root, f), "utf8"))]).filter(([, b]) => b.length);
  const sites = FILES.reduce((n, f) => n + (readFileSync(join(root, f), "utf8").match(IDENT_INDEX) || []).length, 0);
  ok(`no array index in app source derives its bound from another array (${sites} identifier-shaped index sites read, ${all.length} mismatched: ${all.map(([f, b]) => `${f} ${b.join(" / ")}`).join(" | ") || "none"})`,
    all.length === 0 && sites >= 5);
}
// A broken generator can stop a consumer module from loading at all (the seed data layer builds
// the world with it on import). That is a result to report, not a reason to die with no tally.
async function tryLoad(p) {
  try { return { mod: await server.ssrLoadModule(p), err: "" }; }
  catch (e) { return { mod: null, err: `${p}: ${String(e && e.message).split("\n")[0].slice(0, 140)}` }; }
}
{
  const { mod: SVC, err } = await tryLoad("/data/footballService.ts");
  if (!SVC) ok(`the seed data layer boots on the shipped generator — it did not (${err})`, false);
  else {
    const comps = SVC.footballProvider.competitions();
    const empty = comps.filter((c) => !Array.isArray(c.clubIds) || c.clubIds.length === 0).map((c) => c.id);
    ok(`worldEngine's pick(rng, comp.clubIds) never faces an empty pool: ${comps.length} competitions, smallest ${Math.min(...comps.map((c) => c.clubIds?.length ?? 0))} clubs (${empty.length} empty: ${empty.join(",") || "none"})`,
      comps.length > 0 && empty.length === 0);
  }
}
{
  const { mod: A, err: aErr } = await tryLoad("/domain/attributes.ts");
  const { mod: TR, err: trErr } = await tryLoad("/domain/training.ts");
  if (!A || !TR) ok(`attributes and training load on the shipped generator — they did not (${aErr}${trErr})`, false);
  else {
    const { ATTRIBUTE_KEYS } = A;
    const { buildSession, SUPPORTED_MINUTES } = TR;
  const bad = [];
  for (const key of ATTRIBUTE_KEYS) {
    for (const minutes of [SUPPORTED_MINUTES[0], SUPPORTED_MINUTES[SUPPORTED_MINUTES.length - 1]]) {
      let s;
      try {
        s = buildSession({ id: `k-${key}-${minutes}`, date: "2026-09-12", targetMinutes: minutes, focusAttributes: [key], group: "CM" });
      } catch (e) { bad.push(`${key}@${minutes} threw ${e.message.slice(0, 40)}`); continue; }
      if (!s.exercises.length || s.exercises.some((e) => !e || !e.label || !(e.minutes > 0))) bad.push(`${key}@${minutes} produced ${JSON.stringify(s.exercises.map((e) => e && e.label))}`);
    }
  }
  ok(`buildSession's pick/fallback chain yields a real session for every attribute key at both minute extremes — no undefined drill survives (${ATTRIBUTE_KEYS.length} keys × 2 bounds = ${ATTRIBUTE_KEYS.length * 2} sessions, ${bad.length} malformed; this checks shape only, not duration fit)`,
    ATTRIBUTE_KEYS.length >= 10 && bad.length === 0, bad.slice(0, 3).join(" | "));
  }
}
{
  const { mod: ME, err: meErr } = await tryLoad("/domain/matchEngine.ts");
  if (!ME) ok(`the match engine loads on the shipped generator — it did not (${meErr})`, false);
  const { simulateMatch } = ME || {};
  const team = (name, overall, attack, midfield, defense) => ({
    name, overall, attack, midfield, defense,
    possessionBias: 0.5, press: 0.5, tempo: 0.5, fatigue: 0.2, morale: 0.1, form: 0,
  });
  let digest = 0, events = 0, emptyPlayer = 0, threw = "";
  const scorers = new Set();
  for (let i = 0; ME && i < 400; i++) {
    let r;
    try {
      r = simulateMatch({
        seed: `m${i}`,
        home: team("H" + i, 60 + (i % 20), 55 + (i % 30), 58 + (i % 25), 50 + (i % 28)),
        away: team("A" + i, 58 + ((i * 3) % 22), 60 - (i % 25), 55 + (i % 20), 52 + (i % 22)),
      });
    } catch (e) { threw = `match ${i}: ${String(e && e.message).split("\n")[0].slice(0, 90)}`; break; }
    for (const e of r.timeline) {
      events++;
      if (typeof e.player !== "string" || e.player.length === 0) emptyPlayer++;
      if (e.type === "GOAL") scorers.add(e.player);
    }
    const j = JSON.stringify(r);
    for (let k = 0; k < j.length; k++) digest = (digest * 31 + j.charCodeAt(k)) | 0;
  }
  ok(`${events} events over a 400-match battery carry a real player name (${emptyPlayer} empty or undefined, ${scorers.size} distinct scorers${threw ? `, the engine threw: ${threw}` : ""}) — the away-indexed-by-home-length sites produced no visible damage only because both squads are 11`,
    emptyPlayer === 0 && events > 1000 && scorers.size > 100 && !threw);
  // The digest folds JSON.stringify(SimResult), so it moves both when the engine draws
  // differently AND when the shape it returns changes. M225 changed the shape on purpose:
  // `summary` became rows and the goal `detail` a row, because the three lines were English
  // composed in a domain module. Before re-deriving, that was checked to be shape-only, not
  // draw order: rendering every result back to the old English through the EN column (whose
  // sim.sum.*/sim.ev.goal rows are byte-identical to the old sentences) still folds to
  // 966604149 — see dev/m225/rng-digest.mjs, which prints both numbers side by side. So this
  // constant is the same battery over the new payload, and the instruction stands: a future
  // move here is a change to the draw ORDER unless the same reconstruction says otherwise.
  ok(`that battery reproduces digest ${digest}: the M225 re-derivation, taken only after re-rendering every result to the old English still folded to the pinned 966604149 (shape changed, draws did not)`,
    digest === -691102317, String(digest));
}

await server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
