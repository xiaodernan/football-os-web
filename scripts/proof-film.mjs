import { createServer } from "vite";

// Pins domain/filmInsights.ts — buildFilmInsights, the cross-clip library
// aggregation behind the Film Room's "what keeps happening across your clips"
// panel (spec §19). The same object is cited as evidence by the Weekly Review
// (M65) and its clip count feeds the Achievements "Analyst" group (M67), so a
// wrong rate/trend/halves-split silently mislabels real detections the user
// actually made. Rather than hard-coding derived numbers (which re-implement the
// module and go stale), this replays buildFilmInsights' own documented rules over
// hand-built clip libraries: the validity filter, the count-desc/kind-asc byKind
// ordering on UNROUNDED total minutes, the older/newer halves (middle clip dropped
// on odd lengths), the confidence ladder, and the hasData / evidence / sources
// honesty branches. Purity (no input mutation) and determinism are pinned too.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { buildFilmInsights } = await server.ssrLoadModule("/domain/filmInsights.ts");
const { attributeLabel } = await server.ssrLoadModule("/domain/attributes.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const KINDS = ["scan", "touch", "pass", "dribble", "shot", "turn", "press"];
const r2 = (v) => Math.round(v * 100) / 100;
const ev = (...kinds) => kinds.map((kind) => ({ kind }));
const clip = (at, durationSec, confidence, kinds, focus = []) => ({ at, durationSec, confidence, events: ev(...kinds), recommendedFocus: focus });

// ---------------------------------------------------------------------------
// Fixture A — a full four-clip library exercising every aggregate at once.
// Durations 60/120/60/60 -> 300s total (5 min). Confidence 80/90/70/60.
const A = [
  clip("2020-01-01T00:00:00Z", 60, 80, ["scan", "scan", "pass"], ["scanning"]),
  clip("2020-01-02T00:00:00Z", 120, 90, ["scan", "touch"], ["first_touch"]),
  clip("2020-01-03T00:00:00Z", 60, 70, ["pass", "shot"], ["scanning"]),
  clip("2020-01-04T00:00:00Z", 60, 60, ["scan"], ["passing"]),
];
const a = buildFilmInsights(A);

// -- validity + raw totals --------------------------------------------------
ok("A: all four positive-duration clips are counted", a.clips === 4);
ok("A: no write-only analysedSeconds total is exported (minutes is the single duration output)",
  !("analysedSeconds" in a));
ok("A: analysedMinutes is seconds/60 rounded to 2dp", a.analysedMinutes === r2(300 / 60));
ok("A: detections equals the total event count", a.detections === 8 && A.reduce((s, c) => s + c.events.length, 0) === 8);

// -- byKind: every kind present, count-desc then kind-asc, per-minute from the UNROUNDED total
const tally = {};
for (const c of A) for (const e of c.events) tally[e.kind] = (tally[e.kind] ?? 0) + 1;
ok("A: byKind always lists all seven kinds (even zero-count ones)",
  a.byKind.length === 7 && KINDS.every((k) => a.byKind.some((b) => b.kind === k)));
ok("A: each byKind count matches an independent re-tally",
  a.byKind.every((b) => b.count === (tally[b.kind] ?? 0)));
ok("A: byKind perMinute = count / unrounded total minutes (2dp)",
  a.byKind.every((b) => b.perMinute === r2(b.count / (300 / 60))));
ok("A: byKind is ordered by count desc, then kind asc (tiebreak)",
  a.byKind.every((b, i) => i === 0 || (() => {
    const p = a.byKind[i - 1];
    return p.count > b.count || (p.count === b.count && p.kind <= b.kind);
  })()));
ok("A: expected scan-first ordering reproduces from the re-tally",
  a.byKind.map((b) => b.kind).join(",") ===
  [...KINDS].sort((x, y) => (tally[y] ?? 0) - (tally[x] ?? 0) || x.localeCompare(y)).join(","));

// -- headline per-minute figures -------------------------------------------
ok("A: actionsPerMinute = detections / total minutes", a.actionsPerMinute === r2(8 / 5));
ok("A: scanPerMinute = scans / total minutes", a.scanPerMinute === r2((tally.scan) / 5));

// -- older/newer halves: even length -> two disjoint halves of size len/2 ---
// older = clips 1,2 (60+120=180s, 3 scans); newer = clips 3,4 (60+60=120s, 1 scan)
ok("A: olderScanRate = older scans / older minutes", a.olderScanRate === r2(3 / (180 / 60)));
ok("A: newerScanRate = newer scans / newer minutes", a.newerScanRate === r2(1 / (120 / 60)));
ok("A: scanTrend = newer - older (2dp)", a.scanTrend === r2(a.newerScanRate - a.olderScanRate));
ok("A: trend is negative here (scanning fell off in newer clips)", a.scanTrend === r2(0.5 - 1.0) && a.scanTrend < 0);

// -- topFocus: per-clip dedupe, then rank by clip count and label -----------
// scanning×2, first_touch×1, passing×1
const focusCount = {};
for (const c of A) for (const k of new Set(c.recommendedFocus)) focusCount[k] = (focusCount[k] ?? 0) + 1;
ok("A: topFocus counts how many clips flagged each key (deduped within a clip)",
  JSON.stringify(Object.fromEntries(a.topFocus.map((f) => [f.key, f.clips]))) ===
  JSON.stringify({ scanning: 2, first_touch: 1, passing: 1 }));
ok("A: topFocus labels come from attributeLabel, not raw keys",
  a.topFocus.every((f) => f.label === attributeLabel(f.key)));
ok("A: topFocus ranked clip-count desc, then label asc",
  a.topFocus.every((f, i) => i === 0 || (() => {
    const p = a.topFocus[i - 1];
    return p.clips > f.clips || (p.clips === f.clips && p.label <= f.label);
  })()));
ok("A: topFocus leading entry is the twice-flagged 'scanning'", a.topFocus[0]?.key === "scanning" && a.topFocus[0]?.clips === 2);

// -- honesty scaffolding ----------------------------------------------------
ok("A: avgConfidence is the rounded mean over valid clips", a.avgConfidence === Math.round((80 + 90 + 70 + 60) / 4));
ok("A: confidence follows min(85, 20 + 16·clips)", a.confidence === Math.min(85, 20 + 4 * 16));
ok("A: a clip library with detections flips hasData true", a.hasData === true);
ok("A: sources state this is the device's own library + mean confidence",
  a.sources.length === 3 && a.sources.some((s) => /local film library/i.test(s)) && a.sources.some((s) => s.includes(`${a.avgConfidence}%`)));
ok("A: evidence is exactly the four documented lines", a.evidence.length === 4);
ok("A: with >=2 clips the third evidence line is the older→newer trend",
  /→/.test(a.evidence[2]) && a.evidence[2].includes(a.scanTrend >= 0 ? `+${a.scanTrend}` : `${a.scanTrend}`));

// ---------------------------------------------------------------------------
// Fixture B — ODD length: the middle clip is excluded from BOTH halves.
const B = [
  clip("2021-01-01T00:00:00Z", 60, 80, ["scan", "scan", "scan"]), // oldest, 3 scans
  clip("2021-01-02T00:00:00Z", 60, 80, Array(9).fill("scan")), // middle, 9 scans — must be dropped from both halves
  clip("2021-01-03T00:00:00Z", 60, 80, ["scan"]), // newest, 1 scan
];
const b = buildFilmInsights(B);
ok("B: three valid clips counted", b.clips === 3);
ok("B: half=floor(len/2)=1 so older holds only the oldest clip (3/min)", b.olderScanRate === r2(3 / 1));
ok("B: newer holds only the newest clip (1/min) — middle clip excluded", b.newerScanRate === r2(1 / 1));
ok("B: scanTrend ignores the middle clip entirely", b.scanTrend === r2(1 - 3));

// ---------------------------------------------------------------------------
// Fixture C — the validity filter + the zero-detection hasData branch.
const C = [
  null,
  clip("2022-01-01T00:00:00Z", 0, 100, ["scan"]), // zero duration -> dropped
  clip("2022-01-01T00:00:00Z", -30, 100, ["scan"]), // negative -> dropped
  clip("2022-01-05T00:00:00Z", 120, 100, [], ["scanning"]), // valid but NO detections
];
const c = buildFilmInsights(C);
ok("C: only the positive-duration clip survives the filter", c.clips === 1 && c.analysedMinutes === 2);
ok("C: zero-detection clip still yields all-seven byKind rows (all zero)",
  c.byKind.length === 7 && c.byKind.every((k) => k.count === 0 && k.perMinute === 0));
ok("C: a clip with no detections hasData is FALSE (cadence of real findings only)", c.hasData === false);
ok("C: with one valid clip the halves and trend stay null",
  c.olderScanRate === null && c.newerScanRate === null && c.scanTrend === null);
ok("C: recommended focus is reported even with no events", c.topFocus.length === 1 && c.topFocus[0].key === "scanning");
ok("C: the below-two-clip third evidence line asks for a second clip, never the dead 'unavailable' text",
  /second clip/i.test(c.evidence[2]) && !/unavailable/i.test(c.evidence.join(" ")));
ok("C: avgConfidence over the single valid clip", c.avgConfidence === 100 && c.confidence === Math.min(85, 20 + 1 * 16));

// ---------------------------------------------------------------------------
// Empty library — the honest all-zero shape.
const e = buildFilmInsights([]);
ok("empty: zero clips/minutes/detections, confidence 0", e.clips === 0 && e.analysedMinutes === 0 && e.detections === 0 && e.confidence === 0);
ok("empty: byKind still lists all kinds at zero (a legend never loses a row)",
  e.byKind.length === 7 && e.byKind.every((k) => k.count === 0 && k.perMinute === 0));
ok("empty: rates and trend are 0 / null, not NaN",
  e.actionsPerMinute === 0 && e.scanPerMinute === 0 && e.scanTrend === null);
ok("empty: hasData false and the busiest-detection line says none recorded",
  e.hasData === false && e.evidence.some((s) => /No detections/i.test(s)));
ok("empty: topFocus is empty rather than fabricated", e.topFocus.length === 0);

// -- confidence ladder across 1..5 valid clips (cap at 5 clips = 85) --------
const ladder = [1, 2, 3, 4, 5, 6].map((n) =>
  buildFilmInsights(Array.from({ length: n }, (_, i) => clip(`2023-01-0${i + 1}T00:00:00Z`, 60, 50, ["scan"]))).confidence);
ok("confidence climbs 20+16·clips and hard-caps at 85",
  JSON.stringify(ladder) === JSON.stringify([36, 52, 68, 84, 85, 85]));

// ---------------------------------------------------------------------------
// Purity + determinism.
const snap = JSON.stringify(A);
ok("buildFilmInsights never mutates the clip library it is given",
  (buildFilmInsights(A), JSON.stringify(A) === snap));
ok("buildFilmInsights is deterministic (same input → identical output)",
  JSON.stringify(buildFilmInsights(A)) === JSON.stringify(buildFilmInsights(A)));
ok("input order does not change the aggregate (halves sort by analysis time)",
  JSON.stringify(buildFilmInsights(A)) === JSON.stringify(buildFilmInsights([...A].reverse())));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
