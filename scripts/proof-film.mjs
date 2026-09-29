import { createServer } from "vite";
import { readFileSync } from "node:fs";

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
// M235 — `evidence` and `sources` are `RowText`, so no assertion below may compare them to
// English: every reading goes through the app's own `rowLine` + `translate`, the same two a
// screen uses. A hand resolver here would be the second interpreter M232 removed.
const { rowLine } = await server.ssrLoadModule("/domain/rowText.ts");
const { translate } = await server.ssrLoadModule("/i18n/index.tsx");
const LOCALES = ["en", "zh-CN", "zh-TW"];
const say = (loc) => (row) => rowLine(row, (k, v) => translate(loc, k, v));
const sayEn = say("en");
const evidenceEn = (f) => f.evidence.map(sayEn);
const sourcesEn = (f) => f.sources.map(sayEn);

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
ok("A: topFocus rows carry key + clip count only — the dictionary owns the name",
  a.topFocus.every((f) => Object.keys(f).sort().join(",") === "clips,key"));
ok("A: every topFocus key resolves in the attribute name table (a raw key would echo itself)",
  a.topFocus.every((f) => attributeLabel(f.key) !== f.key));
ok("A: topFocus ranked clip-count desc, then key asc",
  a.topFocus.every((f, i) => i === 0 || (() => {
    const p = a.topFocus[i - 1];
    return p.clips > f.clips || (p.clips === f.clips && p.key <= f.key);
  })()));
ok("A: topFocus leading entry is the twice-flagged 'scanning'", a.topFocus[0]?.key === "scanning" && a.topFocus[0]?.clips === 2);

// -- honesty scaffolding ----------------------------------------------------
ok("A: avgConfidence is the rounded mean over valid clips", a.avgConfidence === Math.round((80 + 90 + 70 + 60) / 4));
ok("A: confidence follows min(85, 20 + 16·clips)", a.confidence === Math.min(85, 20 + 4 * 16));
ok("A: a clip library with detections flips hasData true", a.hasData === true);
ok("A: sources state this is the device's own library + mean confidence",
  a.sources.length === 3 && sourcesEn(a).some((s) => /local film library/i.test(s)) && sourcesEn(a).some((s) => s.includes(`${a.avgConfidence}%`)));
ok("A: evidence is exactly the four documented lines", a.evidence.length === 4);
ok("A: with >=2 clips the third evidence line is the older→newer trend",
  /→/.test(sayEn(a.evidence[2])) && sayEn(a.evidence[2]).includes(a.scanTrend >= 0 ? `+${a.scanTrend}` : `${a.scanTrend}`));

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
  /second clip/i.test(sayEn(c.evidence[2])) && !/unavailable/i.test(evidenceEn(c).join(" ")));
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
  e.hasData === false && evidenceEn(e).some((s) => /No detections/i.test(s)));
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

// ---------------------------------------------------------------------------
// M231 — the report's sentences are rows, in the reader's own language.
// The demo pipeline handed the Film Room English it had composed itself: a detection's
// caption, the evidence-frame label ("SCAN @ 12s"), the strengths, and a weakness that named an
// attribute by its English label. Every one of those reaches a screen, so every one is a row now
// — and the film prompt carries the improvement as a KEY, which is what makes the activity
// timeline show the sentence in the language it was built in rather than inside an English one.
const { videoProvider, VIDEO_KINDS, VIDEO_NOTE_IDS, VIDEO_IMPROVEMENT_IDS, VIDEO_KIND_KEY } = await server.ssrLoadModule("/data/video.ts");
const { englishRow } = await server.ssrLoadModule("/data/ai.ts");
const { englishWord } = await server.ssrLoadModule("/i18n/format.ts");
const { parseFilmClips: parseClips } = await server.ssrLoadModule("/domain/filmLibrary.ts");
const KEPT_LATIN = ["Football OS", "ACWR", "DNA"];
const englishLeft = (s) => KEPT_LATIN.reduce((rest, kept) => rest.split(kept).join(" "), s).match(/[A-Za-z][A-Za-z\u2019']*/g) ?? [];
// The leak rule's own eye test, over the very caption M231 fixed: "0 leaks" is also what a
// detector that stopped matching would print.
const LEAK_PLANTS = [
  ["the frame caption M231 fixed", "SCAN @ 12s", true],
  ["the same caption after it", "观察 @ 第 12 秒", false],
  ["a caption whose only Latin is the game's own name", "Football OS 证据帧", false],
];
const leakMissed = LEAK_PLANTS.filter(([, s, want]) => (englishLeft(s).length > 0) !== want);
ok(`the English-leak rule calls the pre-M231 caption a leak and its replacement clean (${LEAK_PLANTS.length} plants, ${leakMissed.map(([n]) => n).join(", ") || "all as declared"})`,
  leakMissed.length === 0);

// Every detection kind is enumerated here AND read out of the provider, so a kind shipped with
// no captions, or a caption row no kind can reach, is a red rather than a gap.
const noteIds = VIDEO_KINDS.flatMap((k) => (VIDEO_NOTE_IDS[k] ?? []).map((id) => [k, id]));
const noteBad = [];
for (const [kind, id] of noteIds) {
  if (!id.startsWith(`vid.note.${kind}.`)) noteBad.push(`${id} does not name its own kind ${kind}`);
  for (const loc of LOCALES) {
    const words = translate(loc, id);
    if (words === id || !words.trim()) noteBad.push(`${id} has no ${loc} row`);
    else if (loc !== "en" && englishLeft(words).length) noteBad.push(`${loc} ${id} → ${words}`);
  }
}
ok(`each of the ${VIDEO_KINDS.length} detections carries captions of its own, every one a row in all ${LOCALES.length} locales (${noteIds.length} ids, ${noteBad.slice(0, 3).join(" | ") || "clean"})`,
  noteIds.length === VIDEO_KINDS.length * 3 && noteBad.length === 0);
const codeKinds = VIDEO_KINDS.filter((k) => translate("zh-CN", VIDEO_KIND_KEY[k]) === VIDEO_KIND_KEY[k]);
ok(`and a detection is named by a row rather than by its code on a 简体中文 screen (${VIDEO_KINDS.map((k) => `${k}=${translate("zh-CN", VIDEO_KIND_KEY[k])}`).join(" ")})`,
  codeKinds.length === 0 && new Set(VIDEO_KINDS.map((k) => VIDEO_KIND_KEY[k])).size === VIDEO_KINDS.length);

const ATTRS = { passing: 61, first_touch: 58, dribbling: 66, shooting: 54, pace: 71, stamina: 63, strength: 60, vision: 64, positioning: 57, tackling: 44, defensive_awareness: 46, decision_making: 59, work_rate: 68, agility: 70, balance: 62, jumping: 55, heading: 52, crossing: 60, long_passing: 58, finishing: 53, composure: 60, leadership: 50, teamwork: 66, discipline: 64, aggression: 55, anticipation: 58, concentration: 61, communication: 52, coordination: 65, reaction: 69, acceleration: 72, strength_endurance: 60, weak_foot: 48, set_pieces: 51 };
const report = await videoProvider.analyze({ fileId: "m231", fileName: "clip.mp4", sizeBytes: 4096, attrs: ATTRS });
const reportRows = [...report.strengths, ...report.weaknesses, ...report.improvements, ...report.events.map((e) => e.note), ...report.frames.map((f) => f.label)];
const reportBad = [];
for (const row of reportRows) {
  if (!row || !("key" in row)) { reportBad.push(`a value row reached the screen: ${JSON.stringify(row)}`); continue; }
  for (const loc of LOCALES) {
    const shown = say(loc)(row);
    if (/[{}]/.test(shown)) reportBad.push(`${loc} ${row.key} left a placeholder: ${shown}`);
    if (loc !== "en" && englishLeft(shown).length) reportBad.push(`${loc} ${row.key} → ${shown}`);
  }
}
ok(`every sentence of a real report is a key that reads in all ${LOCALES.length} locales (${reportRows.length} rows over ${report.events.length} detections, ${reportBad.slice(0, 3).join(" | ") || "clean"})`,
  reportRows.length >= 8 && reportBad.length === 0 &&
  VIDEO_IMPROVEMENT_IDS.every((id) => report.improvements.some((r) => "key" in r && r.key === id)));

// The film prompt is one row with two readings (M223) and the improvement it names is the row
// the panel above prints (M231): the coach is sent English, the reader's timeline is not.
const promptBad = [];
const impIds = report.improvements.map((r) => ("key" in r ? r.key : ""));
for (const id of impIds) {
  if (translate("zh-CN", id) === id) promptBad.push(`${id} has no 简体中文 row`);
  for (const loc of LOCALES) if (/[{}]/.test(translate(loc, id))) promptBad.push(`${loc} ${id} asks for variables no key var can pass: ${translate(loc, id)}`);
}
const prompt = { key: "ai.filmAnalysisPrompt", vars: { improvement: impIds[0], focus: report.recommendedFocus.join(",") } };
if (englishRow(prompt) !== say("en")(prompt)) promptBad.push(`the coach is sent “${englishRow(prompt)}” but the English row reads “${say("en")(prompt)}”`);
for (const loc of ["zh-CN", "zh-TW"]) if (englishLeft(say(loc)(prompt)).length) promptBad.push(`${loc} prompt → ${say(loc)(prompt)}`);
ok(`the film prompt carries the improvement as a key, so the timeline row is the reader's own words while the coach still gets English (${promptBad.slice(0, 3).join(" | ") || say("zh-CN")(prompt)})`,
  promptBad.length === 0 && englishRow(prompt).includes(translate("en", impIds[0])) && say("zh-CN")(prompt).includes(translate("zh-CN", impIds[0])));

// M235 — the aggregation panel's own four evidence lines and three provenance sources are rows
// too. `FilmRoom.tsx` printed them as `{insights.evidence.map((e) => …{e})}`: an expression, so
// the raw-UI scan saw no literal at all while the prose audit counted twelve English literals
// here and capped them. Both gates were measuring the debt instead of stopping it, and the
// reader got English in every locale.
const fmRows = [a, c, e].flatMap((f) => [...f.evidence, ...f.sources]);
const fmBad = [];
for (const row of fmRows) {
  if (!row || !("key" in row)) { fmBad.push(`a value row reached the panel: ${JSON.stringify(row)}`); continue; }
  for (const loc of LOCALES) {
    const shown = say(loc)(row);
    if (/[{}]/.test(shown)) fmBad.push(`${loc} ${row.key} left a placeholder: ${shown}`);
    if (loc !== "en" && englishLeft(shown).length) fmBad.push(`${loc} ${row.key} → ${shown}`);
  }
}
ok(`the film panel's evidence and provenance are keys that read in all ${LOCALES.length} locales (${fmRows.length} rows, ${fmBad.slice(0, 3).join(" | ") || "clean"})`,
  fmBad.length === 0 && fmRows.every((r) => r && "key" in r) &&
  a.evidence.length === 4 && a.sources.length === 3);

// …and the busiest-detection line names the kind by `vid.kind.*`, the same seven-key table the
// Film Room's event list and the evidence-frame captions read — before this it interpolated the
// stored code, which no dictionary could translate.
const kindBad = VIDEO_KINDS.filter((k) => LOCALES.some((loc) => translate(loc, VIDEO_KIND_KEY[k]) === VIDEO_KIND_KEY[k]));
ok(`the busiest-evidence line names its detection by row rather than by the code the record stored (${say("zh-CN")(a.evidence[1])})`,
  kindBad.length === 0 && "key" in a.evidence[1] && a.evidence[1].key === "fi.ev.busiest" &&
  say("en")(a.evidence[1]).includes(translate("en", VIDEO_KIND_KEY.scan)) &&
  !say("en")(a.evidence[1]).includes("Most frequent detection: scan"));

// …and the seam only counts if the screen takes it. A first draft of M235 rendered `‹ {e}` — an
// expression, so both source-level gates in proof-i18n saw no literal at all and nothing went red
// while the reader was shown the key id in all three locales. Nothing loads a .tsx here, so this
// reads the render sites directly: the evidence list, the provenance line and the detection-kind
// badge in both panels have to hand their row to `rowLine`/`VIDEO_KIND_KEY`, not to `String`.
const srcAt = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
const mapBody = (src, anchor) => {
  const at = src.indexOf(anchor);
  if (at < 0) return null;
  const open = src.indexOf("(", at);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") { if (--depth === 0) return src.slice(open, i); }
  }
  return null;
};
const seamBad = [];
for (const [rel, anchors] of [
  ["features/film/FilmRoom.tsx", ["insights.evidence.map", "insights.sources.map"]],
  ["features/review/ReviewPage.tsx", ["review.evidence.map", "review.sources.map"]],
]) {
  const src = srcAt(rel);
  for (const anchor of anchors) {
    const body = mapBody(src, anchor);
    if (body === null) seamBad.push(`${rel} no longer renders ${anchor}`);
    else if (!body.includes("rowLine(")) seamBad.push(`${rel} ${anchor} no longer reads through rowLine`);
  }
  const badgeLines = src.split("\n").filter((l) => l.includes("VIDEO_KIND_KEY["));
  if (badgeLines.length === 0) seamBad.push(`${rel} no longer names a detection through VIDEO_KIND_KEY`);
  else if (badgeLines.some((l) => !/\bt\(\s*VIDEO_KIND_KEY\[/.test(l))) seamBad.push(`${rel} badge not translated: ${badgeLines.find((l) => !/\bt\(\s*VIDEO_KIND_KEY\[/.test(l)).trim()}`);
}
ok(`the film and weekly panels read every one of those rows through the seam instead of printing the id (${seamBad.slice(0, 3).join(" | ") || "4 render sites + 2 badges"})`,
  seamBad.length === 0);


// A clip stored before this milestone holds plain strings where a row is expected, and
// `rowLine` throws on a string. The hydration boundary repairs them as values — the words are
// the writer's — so an old library still reads instead of crashing the panel that filled it.
const legacy = [{ clipId: "c1", addedAt: "2020-01-01T00:00:00Z", report: { fileId: "c1", fileName: "old.mp4", durationSec: 60, provider: "demo-video-v1", demo: true, strengths: ["Keeps the head up"], weaknesses: ["Body orientation lags"], improvements: ["Scan more"], events: [{ t: 3, kind: "scan", note: "Head check", confidence: 0.7 }], frames: [{ t: 3, label: "SCAN @ 3s" }], confidence: 70, recommendedFocus: ["scanning"] } }];
let legacyBad = "";
let repaired = [];
let legacyReads = "";
try {
  repaired = parseClips(legacy);
  legacyReads = repaired.length === 1
    ? [rowLine(repaired[0].report.strengths[0], englishWord), rowLine(repaired[0].report.events[0].note, englishWord), rowLine(repaired[0].report.frames[0].label, englishWord)].join(" | ")
    : "";
} catch (e) {
  legacyBad = String(e.message);
}
ok(`a clip stored before the report was rows is repaired at the hydration boundary and still reads (${legacyBad || legacyReads})`,
  repaired.length === 1 && legacyReads === "Keeps the head up | Head check | SCAN @ 3s");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
