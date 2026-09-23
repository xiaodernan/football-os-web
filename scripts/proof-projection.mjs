import { createServer } from "vite";

// Pins domain/projection.ts — the "if you train these N×/week for W weeks" engine
// behind /development's projection panel (the same screen whose priorities feed the
// Coach carry, M125). Its whole promise is transparency: the number it shows is the
// SAME diminishing-returns gain the store applies when a session is actually
// completed, replayed over a cadence. So the load-bearing check here is a cross-
// model replay — projecting W×N sessions must land on EXACTLY the attribute value
// you'd get by completing those sessions one at a time through applyFocusGrowth.
// Everything else (purity, focus filtering, per-field formulas, the [1,99] clamp,
// the hasData gate, two hand-computed anchors, and the perSessionGain shape) is
// re-derived independently from the documented model, never copied from the code.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { projectGrowth } = await server.ssrLoadModule("/domain/projection.ts");
const { perSessionGain, applyFocusGrowth } = await server.ssrLoadModule("/domain/training.ts");
const { ATTRIBUTE_DEFS, attributeLabel, overallRating } = await server.ssrLoadModule("/domain/attributes.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const KEYS = ATTRIBUTE_DEFS.map((d) => d.key);
const r1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const val = (v) => Object.fromEntries(KEYS.map((k) => [k, v]));

// A realistic mixed fixture: low first_touch / decision_making (real gaps), all
// values numeric (a saved profile always is — baselineAttributes only emits numbers).
function fixture() {
  const a = val(60);
  a.first_touch = 48;
  a.decision_making = 52;
  return a;
}

// Independent replay of projection.ts's inner loop, using the shared perSessionGain.
function replayTo(from, rating, n) {
  let cur = from;
  for (let i = 0; i < n; i++) cur = clamp(Math.round((cur + perSessionGain(cur, rating)) * 10) / 10, 1, 99);
  return cur;
}
// The completion path the store actually runs, applied N times one session at a time.
function completionTo(attrs, key, rating, n) {
  let cur = { ...attrs };
  for (let i = 0; i < n; i++) cur = applyFocusGrowth(cur, [key], rating).attributes;
  return cur[key];
}

const attrs = fixture();
const p = projectGrowth({ attributes: attrs, focusKeys: ["first_touch", "decision_making"], sessionsPerWeek: 3, weeks: 8, rating: 4 });

// --- purity, determinism, no input mutation ---------------------------------
ok("projectGrowth is deterministic (same input → identical output)",
  JSON.stringify(p) === JSON.stringify(projectGrowth({ attributes: attrs, focusKeys: ["first_touch", "decision_making"], sessionsPerWeek: 3, weeks: 8, rating: 4 })));
const snap = JSON.stringify(attrs);
projectGrowth({ attributes: attrs, focusKeys: ["first_touch"], sessionsPerWeek: 3, weeks: 8, rating: 4 });
ok("projectGrowth never mutates the attributes it is given", JSON.stringify(attrs) === snap);
const fk = ["first_touch", "decision_making", "bogus"];
projectGrowth({ attributes: attrs, focusKeys: fk, sessionsPerWeek: 2, weeks: 3, rating: 4 });
ok("projectGrowth never mutates the focusKeys array it is given", JSON.stringify(fk) === JSON.stringify(["first_touch", "decision_making", "bogus"]));

// --- weeks / sessionsPerWeek normalisation (Math.max(0, Math.round(·))) -----
const norm = projectGrowth({ attributes: attrs, focusKeys: ["first_touch"], sessionsPerWeek: -4, weeks: 8.4, rating: 4 });
ok("negative sessionsPerWeek clamps to 0", norm.sessionsPerWeek === 0);
ok("weeks is rounded to an integer", projectGrowth({ attributes: attrs, focusKeys: ["first_touch"], sessionsPerWeek: 2, weeks: 8.6, rating: 4 }).weeks === 9);
ok("weeks/sessionsPerWeek echo normalised values, never the raw input", norm.weeks === 8 && p.weeks === 8 && p.sessionsPerWeek === 3);

// --- focus filtering keeps only numeric, known keys, in input order ---------
const attrsNonNum = { ...attrs, weak_foot: "n/a" }; // a corrupt value must never be trained
const messy = projectGrowth({ attributes: attrsNonNum, focusKeys: ["first_touch", "bogus_key", "weak_foot", "decision_making"], sessionsPerWeek: 2, weeks: 4, rating: 4 });
ok("focus drops unknown keys and non-numeric attribute values, keeping input order",
  JSON.stringify(messy.items.map((i) => i.key)) === JSON.stringify(["first_touch", "decision_making"]));
ok("items.length equals the count of valid focus keys", messy.items.length === 2);

// --- per-item field formulas -------------------------------------------------
for (const it of p.items) {
  ok(`item ${it.key}: label from attributeLabel, from = the stored attribute`,
    it.label === attributeLabel(it.key) && it.from === attrs[it.key]);
  ok(`item ${it.key}: delta = round(to - from, 1)`, it.delta === r1(it.to - it.from));
  ok(`item ${it.key}: to stays within the [1,99] clamp`, it.to >= 1 && it.to <= 99);
}
ok("training a positive-rating focus never lowers the attribute", p.items.every((it) => it.to >= it.from));

// --- THE load-bearing cross-check: projection == actually completing N sessions
const n = p.weeks * p.sessionsPerWeek;
ok("projection replays perSessionGain exactly weeks×sessionsPerWeek times",
  p.items.every((it) => it.to === replayTo(it.from, p.rating, n)));
ok("projected value equals completing those sessions one-by-one (single source of truth)",
  p.items.every((it) => it.to === completionTo(attrs, it.key, p.rating, n)));
ok("a stronger rating reaches a higher or equal projection than a weaker one (rating 5 ≥ rating 3)",
  ["first_touch", "decision_making"].every((k) => {
    const hi = projectGrowth({ attributes: attrs, focusKeys: [k], sessionsPerWeek: 3, weeks: 8, rating: 5 }).items[0].to;
    const lo = projectGrowth({ attributes: attrs, focusKeys: [k], sessionsPerWeek: 3, weeks: 8, rating: 3 }).items[0].to;
    return hi >= lo;
  }));

// --- projectedAttributes: only focus keys move, everything else preserved ----
ok("projectedAttributes keeps every non-focus attribute verbatim",
  KEYS.filter((k) => !["first_touch", "decision_making"].includes(k) && typeof attrs[k] === "number")
    .every((k) => p.projectedAttributes[k] === attrs[k]));
ok("projectedAttributes sets each focus key to its projected value",
  p.items.every((it) => p.projectedAttributes[it.key] === it.to));
ok("projectedAttributes has no extra keys and none missing",
  Object.keys(p.projectedAttributes).length === Object.keys(attrs).length);

// --- overall figures re-derived from the shared weighting --------------------
ok("overallBefore equals overallRating of the input attributes", p.overallBefore === overallRating(attrs));
ok("overallAfter equals overallRating of the projected attributes", p.overallAfter === overallRating(p.projectedAttributes));
ok("overallDelta equals after minus before", p.overallDelta === p.overallAfter - p.overallBefore);
ok("lifting two focus attributes does not lower overall", p.overallAfter >= p.overallBefore);

// --- hasData gate: config-driven, independent of whether anything actually moved
ok("hasData is true with items, weeks and sessionsPerWeek all positive", p.hasData === true);
ok("weeks=0 → every item lands on its start, hasData false, overall unmoved", (() => {
  const z = projectGrowth({ attributes: attrs, focusKeys: ["first_touch"], sessionsPerWeek: 3, weeks: 0, rating: 4 });
  return z.hasData === false && z.items.every((it) => it.to === it.from && it.delta === 0) && z.overallDelta === 0;
})());
ok("empty focus list → no items, projected equals input, hasData false", (() => {
  const e = projectGrowth({ attributes: attrs, focusKeys: [], sessionsPerWeek: 3, weeks: 8, rating: 4 });
  return e.items.length === 0 && e.hasData === false && JSON.stringify(e.projectedAttributes) === JSON.stringify(Object.fromEntries(Object.entries(attrs))) && e.overallDelta === 0;
})());
ok("rating 0 still reports items (hasData tracks cadence, not movement) but moves nothing", (() => {
  const r = projectGrowth({ attributes: attrs, focusKeys: ["first_touch"], sessionsPerWeek: 3, weeks: 8, rating: 0 });
  return r.items.length === 1 && r.items[0].to === r.items[0].from && r.hasData === true;
})());

// --- clamp boundaries at the extremes ---------------------------------------
ok("a maxed attribute (99) cannot climb further, capped at 99", (() => {
  const a = val(99);
  const m = projectGrowth({ attributes: a, focusKeys: ["stamina"], sessionsPerWeek: 5, weeks: 16, rating: 5 });
  return m.items[0].to === 99;
})());
ok("a very low attribute converges up but never exceeds the 99 ceiling", (() => {
  const a = val(1);
  const m = projectGrowth({ attributes: a, focusKeys: ["stamina"], sessionsPerWeek: 5, weeks: 16, rating: 5 });
  return m.items[0].to > 1 && m.items[0].to <= 99;
})());
ok("a longer block reaches at least as high as a short one (capped monotonicity)", (() => {
  const short = projectGrowth({ attributes: attrs, focusKeys: ["first_touch"], sessionsPerWeek: 3, weeks: 4, rating: 4 }).items[0].to;
  const long = projectGrowth({ attributes: attrs, focusKeys: ["first_touch"], sessionsPerWeek: 3, weeks: 16, rating: 4 }).items[0].to;
  return long >= short;
})());

// --- two hand-computed anchors for the UI's rating=4 path --------------------
// from 60, one session: room=(95-60)/45=0.7778, gain=4×0.5×0.7778=1.5556 → 61.6
const one = projectGrowth({ attributes: val(60), focusKeys: ["passing"], sessionsPerWeek: 1, weeks: 1, rating: 4 });
ok("anchor: 60 → 61.6 after one rating-4 session", one.items[0].to === 61.6);
// second session: room=(95-61.6)/45=0.7422, gain=1.4844 → 63.1
const two = projectGrowth({ attributes: val(60), focusKeys: ["passing"], sessionsPerWeek: 2, weeks: 1, rating: 4 });
ok("anchor: 60 → 63.1 after two rating-4 sessions (compounding, diminishing)", two.items[0].to === 63.1);

// --- the underlying perSessionGain shape (diminishing returns, cap 2) --------
ok("perSessionGain is clamped to the [0,2] hard cap", [1, 30, 50, 60, 90, 99, 100].every((c) => { const g = perSessionGain(c, 5); return g >= 0 && g <= 2; }));
ok("perSessionGain caps a raw-effort low attribute at +2", perSessionGain(1, 5) === 2);
ok("perSessionGain is non-increasing as the attribute rises (diminishing returns)", (() => {
  const gs = [40, 60, 80, 90, 99].map((c) => perSessionGain(c, 4));
  return gs.every((g, i) => i === 0 || gs[i - 1] >= g);
})());
ok("at the 95 room-line the gain rests on the 0.15 floor (rating×0.5×0.15)", Math.abs(perSessionGain(95, 4) - 4 * 0.5 * 0.15) < 1e-9);
ok("rating scales the uncapped gain linearly (5 vs 4 at current 70)", Math.abs(perSessionGain(70, 5) - perSessionGain(70, 4) * (5 / 4)) < 1e-9);
ok("applyFocusGrowth's single session equals one replayed projection step (shared model)", (() => {
  const a = val(60);
  const grown = applyFocusGrowth(a, ["passing"], 4).attributes.passing;
  return grown === replayTo(60, 4, 1);
})());

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
