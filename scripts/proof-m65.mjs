import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { buildReview } = await server.ssrLoadModule("/domain/review.ts");
const { baselineAttributes } = await server.ssrLoadModule("/domain/attributes.ts");

const DAY = 86400000;
const now = Date.parse("2026-09-22T12:00:00Z");
const iso = (ms) => new Date(ms).toISOString();

const attrs = { ...baselineAttributes("CM", 0.45), game_intelligence: 41 };
const sessions = [
  {
    id: "s1",
    date: iso(now - 1 * DAY),
    status: "completed",
    completedAt: iso(now - 1 * DAY),
    targetMinutes: 40,
    xpAwarded: 60,
    selfRating: 4,
    focusAttributes: ["passing"],
    growth: [{ key: "passing", delta: 0.6 }],
  },
  {
    id: "s2",
    date: iso(now - 3 * DAY),
    status: "completed",
    completedAt: iso(now - 3 * DAY),
    targetMinutes: 30,
    xpAwarded: 45,
    selfRating: 3,
    focusAttributes: ["dribbling"],
    growth: [{ key: "dribbling", delta: 0.3 }],
  },
];
const clip = (at, durationSec, scans) => ({
  at: iso(at),
  durationSec,
  confidence: 78,
  events: [...Array(scans).fill({ kind: "scan" }), { kind: "pass" }, { kind: "touch" }],
  recommendedFocus: ["game_intelligence"],
});
const film = [clip(now - 2 * DAY, 120, 10), clip(now - 5 * DAY, 180, 25), clip(now - 60 * DAY, 200, 12)];

const base = (windowDays, opts = {}) =>
  buildReview({
    nowMs: now,
    windowDays,
    sessions: opts.sessions ?? sessions,
    goals: opts.goals ?? [{ id: "g1", title: "First touch", createdAt: iso(now - 9 * DAY), done: true }],
    progress: opts.progress ?? [
      { date: iso(now - 6 * DAY), overall: 61, xp: 100 },
      { date: iso(now - 1 * DAY), overall: 63, xp: 205 },
    ],
    attributes: attrs,
    streak: opts.streak ?? 4,
    learn: opts.learn ?? [{ at: iso(now - 2 * DAY), quizCorrect: true }],
    film: opts.film ?? film,
  });

const checks = [];
const ok = (name, cond, detail = "") => checks.push([cond ? "PASS" : "FAIL", name, detail]);

const r7 = base(7);
ok("7d window counts only in-window clips", r7.filmClips === 2, `filmClips=${r7.filmClips}`);
ok("7d minutes = (120+180)/60", r7.filmMinutes === 5, `filmMinutes=${r7.filmMinutes}`);
ok("7d detections = 2 in-window clips (35 scans + 4 others)", r7.filmDetections === 39, `filmDetections=${r7.filmDetections}`);
ok(
  "7d scan rate = 35 scans / 5 min",
  Math.abs(r7.filmScanRate - 7) < 0.01,
  `filmScanRate=${r7.filmScanRate}`,
);
ok("trend compares the older and newer in-window half", r7.filmScanTrend === -3.33, `trend=${r7.filmScanTrend}`);

const r90 = base(90);
ok("90d window includes the 60-day clip", r90.filmClips === 3, `filmClips=${r90.filmClips}`);
ok("no lifetime numbers leak into the 7d digest", r7.filmClips !== r90.filmClips);

const texts = r7.insights.map((i) => i.text);
ok(
  "film digest insight present",
  texts.some((t) => t.includes("2 film clips") && t.includes("39 detections") && t.includes("78% mean provider confidence")),
  texts.find((t) => t.includes("film clip")) ?? "(none)",
);
ok(
  "scanning rate insight quotes the real number",
  texts.some((t) => t.startsWith("Scanning off the ball averaged 7.00 per minute")),
  texts.find((t) => t.startsWith("Scanning")) ?? "(none)",
);
ok("older-vs-newer half quoted", texts.some((t) => t.includes("8.33 → 5.00 per minute") && t.includes("(-3.33)")));
ok(
  "film-vs-training mismatch surfaced as a plan",
  r7.insights.some((i) => i.kind === "plan" && i.text.includes("Flagged by the clips but absent from your training")),
  r7.insights.find((i) => i.text.includes("Flagged by"))?.text ?? "(none)",
);

const ev = r7.evidence;
ok("evidence carries the film line", ev.some((e) => e === "Film 2 clips · 5.0 min · 39 detections"), ev.find((e) => e.startsWith("Film")) ?? "(none)");
ok("evidence carries the scanning line", ev.some((e) => e === "Scanning 7.00/min (trend -3.33)"), ev.find((e) => e.startsWith("Scanning")) ?? "(none)");
ok("sources name the film library", r7.sources.some((s) => s.includes("film library")), r7.sources.join(" | "));

const rNoFilm = base(7, { film: [] });
ok("no film -> zeroed fields, no film lines", rNoFilm.filmClips === 0 && rNoFilm.sources.every((s) => !s.includes("film library")));
const thin = { film: [clip(now - 2 * DAY, 120, 10), clip(now - 5 * DAY, 180, 25)] };
const thinBase = { sessions: [], goals: [], progress: [], streak: 0, learn: [] };
const rThinFilm = base(7, { ...thinBase, film: thin.film });
const rThinNone = base(7, { ...thinBase, film: [] });
ok(
  "film is real signal: it lifts confidence on a thin log",
  rThinFilm.confidence > rThinNone.confidence && rThinFilm.confidence <= 30,
  `${rThinNone.confidence}% -> ${rThinFilm.confidence}%`,
);
ok("film insight never invented without clips", !rNoFilm.insights.some((i) => i.text.includes("Scanning")));

ok(
  "recommendation defers to repeated film evidence",
  r7.recommendation?.attributeKey === "game_intelligence" && r7.recommendation.reason.includes("clips repeated"),
  `${r7.recommendation?.attributeKey}: ${r7.recommendation?.reason}`,
);
ok(
  "without film the recommendation is the plain heuristic",
  rNoFilm.recommendation?.reason.includes("untapped") || rNoFilm.recommendation?.reason.includes("progressive overload"),
  rNoFilm.recommendation?.reason ?? "(none)",
);

const r3 = base(3);
ok("single clip -> no trend invented", r3.filmClips === 1 && r3.filmScanTrend === null, `clips=${r3.filmClips} trend=${r3.filmScanTrend}`);
ok("single clip asks for a second instead of a fake trend", r3.insights.some((i) => i.text.includes("analyse a second clip")));

const filmOnly = base(7, { sessions: [] });
ok("film alone still makes a review worth showing", filmOnly.hasData && filmOnly.filmClips === 2);
ok("film-only review keeps the empty-training plan line", filmOnly.insights[0].kind === "plan" && filmOnly.insights[0].text.includes("No sessions completed"));

const kinds = r7.filmKinds.map((k) => `${k.kind}:${k.count}:${k.perMinute}`);
ok("per-kind rates exposed for the panel", kinds.includes("scan:35:7") && kinds.includes("pass:2:0.4"), kinds.join(", "));
ok(
  "recurring focus exposed with its attribute key",
  r7.filmFocus.length === 1 && r7.filmFocus[0].key === "game_intelligence" && r7.filmFocus[0].clips === 2,
  JSON.stringify(r7.filmFocus),
);

const malformed = buildReview({
  nowMs: now,
  windowDays: 7,
  sessions: [],
  goals: [],
  progress: [],
  attributes: attrs,
  streak: 0,
  film: [{ at: iso(now - 2 * DAY), durationSec: 0, confidence: 0, events: [], recommendedFocus: [] }],
});
ok("unusable clip is dropped, not guessed", malformed.filmClips === 0 && !malformed.hasData, `clips=${malformed.filmClips} hasData=${malformed.hasData}`);

for (const [status, name, detail] of checks) console.log(`${status}  ${name}${detail ? `  — ${detail}` : ""}`);
const failed = checks.filter((c) => c[0] === "FAIL").length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
await server.close();
process.exit(failed ? 1 : 0);
