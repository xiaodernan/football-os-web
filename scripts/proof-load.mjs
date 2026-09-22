import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { buildLoad, ACUTE_DAYS, CHRONIC_DAYS, ZONE_LABEL } = await server.ssrLoadModule("/domain/load.ts");

// Fixed, midday "now" so day-window boundaries (7d / 28d) never straddle a
// partial day — every session below sits unambiguously inside or outside each
// window.
const DAY = 86400000;
const nowMs = Date.parse("2026-09-23T12:00:00Z");

// A completed session `daysAgo` with the given exercise minutes and self-RPE.
// sessionLoad = round(minutes * selfRating); we always set selfRating so the
// sessionIntensity fallback is not exercised here.
const mk = (daysAgo, minutes, rpe) => ({
  id: `s-${daysAgo}-${minutes}-${rpe}`,
  date: new Date(nowMs - daysAgo * DAY).toISOString(),
  completedAt: new Date(nowMs - daysAgo * DAY).toISOString(),
  status: "completed",
  exercises: minutes > 0 ? [{ minutes }] : [],
  targetMinutes: 0,
  selfRating: rpe,
  focusAttributes: [],
});

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// 1. No sessions: honest empty state, no invented baseline.
let L = buildLoad({ nowMs, sessions: [] });
ok("empty: hasData false", L.hasData === false);
ok("empty: zone none", L.zone === "none");
ok("empty: acwr null", L.acwr === null);
ok("empty: recommendation null", L.recommendation === null);
ok("empty: daily empty", L.daily.length === 0);
ok("empty: monotony null", L.monotony === null && L.strain === null);
ok("empty: sources are 3 fixed strings", L.sources.length === 3);
ok("empty: zone label exists", ZONE_LABEL.none === "No data");

// 2. Only an out-of-window (>28d) session is ignored entirely.
L = buildLoad({ nowMs, sessions: [mk(40, 40, 3)] });
ok("40d-old session: hasData false", L.hasData === false);
ok("40d-old session: zone none", L.zone === "none");

// 3. A future-dated session (completedAt after now) is filtered out.
L = buildLoad({ nowMs, sessions: [mk(-10, 40, 3)] });
ok("future session: hasData false", L.hasData === false);

// 4. Single in-window session: exact Session-RPE load + acute/chronic means.
//    load = round(40 * 3) = 120 in the last 7d; acute=round(120/7)=17,
//    chronic=round(120/28)=4, ACWR=round(17/4*100)/100=4.25 → high spike.
L = buildLoad({ nowMs, sessions: [mk(0, 40, 3)] });
ok("single: hasData true", L.hasData === true);
ok("single: one daily bucket", L.daily.length === 1);
ok("single: weekLoad 120", L.weekLoad === 120);
ok("single: acute 17", L.acute === 17);
ok("single: chronic 4", L.chronic === 4);
ok("single: acwr 4.25", L.acwr === 4.25);
ok("single: zone high", L.zone === "high");
ok("single: recommendation present", L.recommendation !== null);
ok("single: recommendation confidence 60", L.recommendation.confidence === 60);
// weekly monotony for loads [0,0,0,120]: mean 30, sd ~51.96, ratio 0.58.
ok("single: monotony 0.58", L.monotony === 0.58);
ok("single: strain 17", L.strain === 17);

// 5. minutes falls back to targetMinutes when a session has no exercises.
L = buildLoad({ nowMs, sessions: [{ ...mk(0, 0, 4), targetMinutes: 30 }] });
ok("fallback: weekLoad uses targetMinutes*rating (120)", L.weekLoad === 120);

// 6. Even weekly volume → ACWR ≈ 1.0 → optimal band.
//    four identical 140-load sessions at days 0/9/18/27: acuteTotal=140,
//    chronicTotal=560 → acute=chronic=20 → acwr 1.0.
L = buildLoad({ nowMs, sessions: [mk(0, 35, 4), mk(9, 35, 4), mk(18, 35, 4), mk(27, 35, 4)] });
ok("even: acute 20", L.acute === 20);
ok("even: chronic 20", L.chronic === 20);
ok("even: acwr 1.0", L.acwr === 1);
ok("even: zone optimal", L.zone === "optimal");

// 7. Heavy earlier, light this week → ACWR < 0.8 → underloaded.
//    20 in the last 7d, 140+140 earlier: acute=round(20/7)=3, chronic=round(300/28)=11 → 0.27.
L = buildLoad({ nowMs, sessions: [mk(1, 10, 2), mk(15, 35, 4), mk(22, 35, 4)] });
ok("under: acute 3", L.acute === 3);
ok("under: chronic 11", L.chronic === 11);
ok("under: acwr 0.27", L.acwr === 0.27);
ok("under: zone under", L.zone === "under");

// 8. Evidence is a real, non-empty trace tied to the records.
L = buildLoad({ nowMs, sessions: [mk(0, 40, 3)] });
ok("evidence lists the tracked session", L.evidence.some((x) => /Tracked sessions: 1/.test(x)));
ok("evidence cites the ACWR value", L.evidence.some((x) => /4\.25/.test(x)));

// 9. Daily buckets are sorted ascending by date.
L = buildLoad({ nowMs, sessions: [mk(27, 35, 4), mk(0, 35, 4), mk(18, 35, 4)] });
const dates = L.daily.map((d) => d.date);
ok("daily sorted ascending", JSON.stringify(dates) === JSON.stringify([...dates].sort()));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
