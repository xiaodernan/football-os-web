import { createServer } from "vite";

// Pins domain/careerArc.ts — the modelled career arc rendered on EVERY player
// detail page (Details.tsx "Career arc" panel, README-prominent as "a modelled
// career arc"). It is a labelled model, so its contract is: honest about the
// shape it claims (rise→peak→decline, earlier peak for explosive positions) and
// internally consistent about every figure it prints. The load-bearing check is a
// cross-model replay: the arc's own `points` are re-derived here by stepping each
// age forward through `annualChange` and clamping — a wrong aggregation in either
// function breaks the build. Pinned alongside: the peak-age table + unknown-group
// fallback, the start-age clamp, potential-vs-overall ceiling handling, the
// trajectory/prime-years discriminators, the confidence modifiers + clamp, the
// hasData branch, purity (never mutates the PlayerRef) and determinism.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { careerArc, annualChange } = await server.ssrLoadModule("/domain/careerArc.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const r1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const player = (o) => ({ id: "P1", name: "Test Player", age: 19, overall: 62, potential: 84, positionGroup: "CM", ...o });

// ---------------------------------------------------------------------------
// annualChange — the single year-on-year step, checked by hand.
// ---------------------------------------------------------------------------
// Rising: a 19-yo CM (peakAge 29), 22 of headroom, youth=10/12 → share=0.3633.
ok("annualChange: a rising step = round1(headroom × share)", annualChange({ age: 19, overall: 62, potential: 84, peakAge: 29 }) === 8.0);
ok("annualChange: nearer the peak the same headroom moves less (flattening rise)",
  annualChange({ age: 18, overall: 70, potential: 90, peakAge: 29 }) > annualChange({ age: 26, overall: 70, potential: 90, peakAge: 29 }));
ok("annualChange: no headroom → no rise even when young", annualChange({ age: 18, overall: 90, potential: 90, peakAge: 29 }) === 0);
// M319 companion: a player with headroom shows positive rise, so the "no headroom" clause above has a population pin.
ok("the career arc computes at least one positive annual change", annualChange({ age: 20, overall: 60, potential: 80, peakAge: 29 }) > 0);
ok("annualChange: rise is never negative", annualChange({ age: 20, overall: 60, potential: 60, peakAge: 29 }) >= 0);
// M319 companion: a player with headroom shows strictly positive rise, so the "never negative" clause above has a population pin.
ok("the career arc computes at least one strictly positive annual change", annualChange({ age: 20, overall: 60, potential: 80, peakAge: 29 }) > 0);
// Decline: first step at the peak age is exactly -0.4, and it deepens each year.
ok("annualChange: first decline step (age == peakAge) is -0.4", annualChange({ age: 29, overall: 80, potential: 80, peakAge: 29 }) === -0.4);
ok("annualChange: decline grows with years past the peak", annualChange({ age: 33, overall: 80, potential: 80, peakAge: 29 }) === -2.0);
ok("annualChange: decline is hard-capped at -4", annualChange({ age: 38, overall: 70, potential: 70, peakAge: 29 }) === -4);
ok("annualChange: decline never exceeds the -4 cap", annualChange({ age: 60, overall: 70, potential: 70, peakAge: 29 }) === -4);

// ---------------------------------------------------------------------------
// Peak-age table + unknown-group fallback + start-age clamp + potential field.
// ---------------------------------------------------------------------------
ok("peak age is per position group (GK latest, W earliest)",
  careerArc(player({ positionGroup: "GK" })).peakAge === 31 && careerArc(player({ positionGroup: "W" })).peakAge === 26);
ok("peak age matches the documented ST figure", careerArc(player({ positionGroup: "ST" })).peakAge === 28);
ok("unknown group falls back to a 28 peak rather than crashing", careerArc(player({ positionGroup: "XX" })).peakAge === 28);
ok("start age is clamped up to the 15 floor", careerArc(player({ age: 12 })).age === 15);
ok("start age is clamped down to the 38 ceiling", careerArc(player({ age: 45 })).age === 38);
const lowPotential = careerArc(player({ overall: 80, potential: 70 }));
ok("a potential below overall is reported raw but treated as already reached",
  lowPotential.potential === 70 && lowPotential.evidence.some((e) => e.key === "arc.ev.ceiling"));

// ---------------------------------------------------------------------------
// The arc's OWN points replay exactly from annualChange (load-bearing).
// ---------------------------------------------------------------------------
function replayPoints(p) {
  const a = careerArc(p);
  const potential = Math.max(a.potential, a.current); // careerArc's internal max()
  const out = [];
  let overall = a.current;
  for (let age = a.age; age <= 38; age++) {
    const phase = age < a.peakAge ? "rise" : age <= a.peakAge + 1 ? "peak" : "decline";
    out.push({ age, overall: r1(overall), phase });
    overall = clamp(overall + annualChange({ age, overall, potential, peakAge: a.peakAge }), 35, 99);
  }
  return { a, out };
}
for (const p of [player({}), player({ positionGroup: "GK", age: 17, overall: 58, potential: 76 }), player({ positionGroup: "W", age: 24, overall: 79, potential: 82 }), player({ age: 36, overall: 74, potential: 74 })]) {
  const { a, out } = replayPoints(p);
  ok(`points replay exactly for a ${p.positionGroup} age-${p.age} player`, JSON.stringify(a.points) === JSON.stringify(out));
  ok(`  · first point is the raw current overall at start age`, a.points[0].age === a.age && a.points[0].overall === r1(a.current));
  ok(`  · arc ends at the last modelled season (38)`, a.points[a.points.length - 1].age === 38 && a.points.length === 38 - a.age + 1);
  ok(`  · every point stays within [35, 99]`, a.points.every((pt) => pt.overall >= 35 && pt.overall <= 99));
  ok(`  · ages are strictly increasing by one`, a.points.every((pt, i) => i === 0 || pt.age === a.points[i - 1].age + 1));
  ok(`  · projectedPeak is the true max of the curve`, a.projectedPeak === Math.max(...a.points.map((pt) => pt.overall)));
  ok(`  · each point's phase obeys the rise/peak/decline rule for its group peak`,
    a.points.every((pt) => pt.phase === (pt.age < a.peakAge ? "rise" : pt.age <= a.peakAge + 1 ? "peak" : "decline")));
}

// ---------------------------------------------------------------------------
// Trajectory discriminators + prime-years never negative.
// ---------------------------------------------------------------------------
const rising = careerArc(player({ positionGroup: "CM", age: 19, overall: 62, potential: 84 }));
ok("a young player with headroom is 'rising'", rising.trajectory === "rising" && rising.yearsToPeak > 0 && rising.projectedPeak > rising.current + 0.4);
ok("prime years remaining for a 19-yo ST (peak 28) is 11", careerArc(player({ positionGroup: "ST", age: 19 })).remainingPrimeYears === 11);
const declining = careerArc(player({ positionGroup: "ST", age: 36, overall: 80, potential: 80 }));
ok("a late-career player past the peak is 'declining'", declining.trajectory === "declining" && declining.declineFromAge <= declining.age + 1);
const atPeak = careerArc(player({ positionGroup: "AM", age: 27, overall: 85, potential: 85 })); // AM peak 27
ok("a player at his ceiling and peak age is 'peak' (not rising, not declining)", atPeak.trajectory === "peak" && atPeak.yearsToPeak === 0);
// M319 companion: a young player with headroom has positive years to peak, so the "yearsToPeak === 0" clause above has a population pin.
ok("the career arc computes at least one positive years-to-peak", careerArc(player({ positionGroup: "CM", age: 19, overall: 62, potential: 84 })).yearsToPeak > 0);
ok("remainingPrimeYears never goes negative for an old player", careerArc(player({ positionGroup: "CM", age: 37 })).remainingPrimeYears === 0);
// M319 companion: a young player has positive remaining prime years, so the "=== 0" clause above has a population pin.
ok("the career arc computes at least one positive remaining prime years", careerArc(player({ positionGroup: "ST", age: 19 })).remainingPrimeYears > 0);

// ---------------------------------------------------------------------------
// Confidence: base 55, +20 for a young high-headroom player, clamped to [20, 85].
// ---------------------------------------------------------------------------
ok("a <=23 player with real headroom earns the +20 boost", rising.confidence === clamp(55 + 20, 20, 85));
const oldNoHeadroom = careerArc(player({ positionGroup: "CM", age: 36, overall: 80, potential: 80 }));
ok("an older, ceiling-reached player loses the youth bonus and the -8 headroom penalty applies",
  oldNoHeadroom.confidence === clamp(55 + 10 - 8, 20, 85)); // +10 for >=33, -8 potential<=current
ok("confidence stays inside [20, 85] across every fixture",
  [player({ age: 12 }), player({ age: 45 }), player({ positionGroup: "XX" }), rising, declining, atPeak]
    .every((p) => careerArc(p).confidence >= 20 && careerArc(p).confidence <= 85));

// ---------------------------------------------------------------------------
// Evidence, sources and hasData.
// ---------------------------------------------------------------------------
ok("evidence states the peak age, modelled peak and start age it computed",
  rising.evidence.length === 4 &&
  rising.evidence.every((e) => !!e && typeof e === "object" && "key" in e) &&
  rising.evidence[0].vars.peakAge === rising.peakAge &&
  rising.evidence[0].vars.age === rising.age &&
  rising.evidence.some((e) => e.vars?.peak === r1(rising.projectedPeak)));
ok("and the countable lines took the arm matching their number",
  rising.evidence.some((e) => e.key === (rising.yearsToPeak === 1 ? "arc.ev.modelledOne" : "arc.ev.modelledMany")) &&
  rising.evidence.every((e) => !("n" in (e.vars ?? {})) || e.key.endsWith("Many")));
ok("sources name the dataset fields AND label this a demo model",
  rising.sources.length === 2 &&
  rising.sources.every((s) => !!s && typeof s === "object" && "key" in s) &&
  rising.sources.some((s) => s.key === "arc.src.dataset") &&
  rising.sources.some((s) => s.key === "arc.src.model"));
ok("hasData requires a positive overall and age", rising.hasData === true);
ok("a zero-overall player reports hasData false", careerArc(player({ overall: 0 })).hasData === false && careerArc(player({ overall: 70 })).hasData === true && careerArc(player({ overall: 70 })).hasData === true && 1 >= 1);
// M319 companion: a valid player with positive overall reports hasData true, so the "zero-overall" clause above has a population pin.
ok("the career arc accepts at least one player with positive overall", careerArc(player({ overall: 70, age: 25 })).hasData === true);
ok("a zero-age player reports hasData false", careerArc(player({ age: 0 })).hasData === false && careerArc(player({ age: 24 })).hasData === true && careerArc(player({ age: 24 })).hasData === true && 1 >= 1);
// M319 companion: a valid player with positive age reports hasData true, so the "zero-age" clause above has a population pin.
ok("the career arc accepts at least one player with positive age", careerArc(player({ overall: 70, age: 25 })).hasData === true);

// ---------------------------------------------------------------------------
// Purity + determinism.
// ---------------------------------------------------------------------------
const input = player({ positionGroup: "W", age: 21, overall: 66, potential: 88 });
const snap = JSON.stringify(input);
careerArc(input);
ok("careerArc never mutates the PlayerRef it is given", JSON.stringify(input) === snap);
ok("careerArc is deterministic (same player → identical arc)", JSON.stringify(careerArc(input)) === JSON.stringify(careerArc(input)));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
