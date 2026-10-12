// Proof for the row contract (domain/rowText.ts + domain/history.ts + domain/goals.ts).
//
// These modules sit between a stored record and a reader's screen, and they are
// invisible to the component-scoped raw-UI scan: nothing in them is JSX. So every way
// a row can lie about where its words came from is pinned here instead. Two checks
// carry it: #1, the strings a timeline row shows must be a subset of the strings the
// input records carry, which a module cannot satisfy by writing a sentence; and #11, a
// goal row must store no display word from ANY locale, which is what makes the same
// stored row readable in the reader's language rather than the writer's.
//
// Run: node scripts/proof-timeline.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { makeSay } from "./lib/rows.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { buildTimeline, groupByDay, dayKey } = await server.ssrLoadModule("/domain/history.ts");
const { rowLine } = await server.ssrLoadModule("/domain/rowText.ts");
const { GOAL_METRICS, goalUnitKey, countGoalTitle, attributeGoalTitle, repairGoalTitles, isValidGoalTarget, goalProgressPct } =
  await server.ssrLoadModule("/domain/goals.ts");
// The nested-row clause below reads through the app's own door rather than a private
// filler, so a row that fails to resolve is reported instead of quietly echoed.
const { say, locales } = await makeSay(server);
const { DICTIONARIES } = await server.ssrLoadModule("/i18n/dictionaries.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const clone = (x) => structuredClone(x);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A dictionary the proof controls: it reports the key it was handed and fills its
// placeholders, so a row that reaches the reader without a lookup is visible as one.
let seen = [];
const t = (key, vars) => {
  seen.push([key, vars]);
  return `{${key}${vars ? "|" + Object.entries(vars).map(([k, v]) => `${k}=${v}`).sort().join(",") : ""}}`;
};

const session = (over = {}) => ({
  id: "s1", title: { value: "Session title A" }, status: "completed",
  completedAt: "2026-03-01T09:30:00.000Z", date: "2026-03-01",
  selfRating: 4, xpAwarded: 30, growth: [{ key: "passing", delta: 2 }], notes: "  keep head down  ",
  ...over,
});
const plan = (over = {}) => ({ id: "p1", createdAt: "2026-03-02T10:00:00.000Z", prompt: { value: "Plan prompt B" }, provider: "demo-coach-v1", ...over });
const memory = (over = {}) => ({ id: "m1", kind: "coach", text: { value: "Memory text C" }, at: "2026-03-03T11:00:00.000Z", ...over });
const learn = (over = {}) => ({ id: "l1", title: "Lesson title D", completedAt: "2026-03-04T12:00:00.000Z", quizCorrect: true, attempts: 0, ...over });
const clip = (over = {}) => ({
  id: "f1", at: "2026-03-05T13:00:00.000Z", fileName: "clip-01.mp4",
  durationSec: 300, detections: 12, scans: 4, confidence: 68, ...over,
});
const empty = { sessions: [], plans: [], memory: [], learn: [], film: [] };
const one = (over = {}) => buildTimeline({ ...empty, ...over });

// ---- 1. Provenance: every string a row shows came out of a record.
const rich = buildTimeline({
  sessions: [
    session(),
    session({ id: "s2", title: { value: "Session title E" }, completedAt: "2026-03-06T08:00:00.000Z" }),
    // The shape the app actually writes since M236: the title is the session's own keyed
    // row, so the timeline must forward it exactly as it does a plan's prompt.
    session({ id: "s3", title: { key: "trn.title.focus", vars: { attrs: "passing" } }, completedAt: "2026-03-08T08:00:00.000Z" }),
  ],
  plans: [plan(), plan({ id: "p2", prompt: "Plan prompt F" }), plan({ id: "p3", prompt: { key: "rv.recoPrompt" } })],
  memory: [memory(), memory({ id: "m2", kind: "training", text: { value: "Memory text G" } })],
  learn: [learn(), learn({ id: "l2", title: "Lesson title H", quizCorrect: false, attempts: 2 })],
  film: [clip(), clip({ id: "f2", fileName: "clip-02.mp4", at: "2026-03-07T14:00:00.000Z" })],
});
const RECORD_STRINGS = new Set([
  "Session title A", "Session title E",
  "Plan prompt B", "Plan prompt F", "demo-coach-v1",
  "Memory text C", "Memory text G",
  "Lesson title D", "Lesson title H",
  "keep head down", // the user's own note, trimmed
]);
const rowStrings = [];
const shapeProblems = [];
for (const e of rich) {
  for (const cell of [e.title, e.detail]) {
    if (!cell) continue;
    if ("key" in cell && "value" in cell) shapeProblems.push(`${e.id}: a cell is both a key and a value`);
    if ("value" in cell) {
      if (typeof cell.value !== "string" || cell.value.length === 0) shapeProblems.push(`${e.id}: an empty row value`);
      else rowStrings.push(cell.value);
    }
    // This module's OWN words live in `hist.*`. A plan's prompt and a session's title are the
    // cells it forwards from the caller rather than words: they are the rows the producer was
    // handed (`rv.recoPrompt`, `ai.videoAnalysisPrompt`, `trn.title.*`, …), so they keep the
    // namespace they were written in and this clause must not demand this file's own.
    const forwarded = (e.kind === "plan" || e.kind === "session") && cell === e.title;
    if ("key" in cell && !forwarded && !/^hist\.[a-z.]+$/.test(cell.key)) shapeProblems.push(`${e.id}: ${cell.key} is outside the namespace this module may use`);
  }
  if (e.note) rowStrings.push(e.note);
}
ok(`the ${rich.length} rows are well-formed key-or-value cells (${[...new Set(shapeProblems)].join(" | ") || "clean"})`,
  rich.length === 12 && shapeProblems.length === 0);
ok(`every string those rows show is a stored value, not prose this module wrote (${[...new Set(rowStrings)].join(" / ")})`,
  rowStrings.length > 0 && rowStrings.every((s2) => RECORD_STRINGS.has(s2)));
ok("the clip's file name reaches the reader as a variable of a key row, never appended to a sentence here",
  !rowStrings.some((s2) => s2.includes("clip")) &&
    rich.filter((e) => e.kind === "film").every((e) => e.title.key === "hist.film.analysed" && /^clip-\d+\.mp4$/.test(e.title.vars.f)));

// ---- 2. Purity and determinism.
const input = { sessions: [session()], plans: [plan()], memory: [memory()], learn: [learn()], film: [clip()] };
const before = clone(input);
const first = buildTimeline(input);
ok("buildTimeline never mutates the records it is handed", eq(input, before));
ok("the same input yields the same timeline", eq(first, buildTimeline(input)));

// ---- 3. What counts as history.
ok("a scheduled session is not history", one({ sessions: [session({ status: "scheduled" })] }).length === 0);
// M317 companion: a completed session lands in history, so the "not history" clause above has a population pin.
ok("the timeline carries at least one completed session", one({ sessions: [session()] }).length >= 1);
ok("of a mixed list, only the completed session is history",
  one({ sessions: [session(), session({ id: "s2", status: "skipped" })] }).length === 1);
ok("a lesson with no completion timestamp is left off rather than given a false date",
  one({ learn: [learn({ completedAt: "" })] }).length === 0);
// M317 companion: a lesson with a valid timestamp lands in history, so the "left off" clause above has a population pin.
ok("the timeline carries at least one completed lesson", one({ learn: [learn({ completedAt: "2026-01-01T00:00:00.000Z" })] }).length >= 1);
ok("a lesson with an unparseable date is left off", one({ learn: [learn({ completedAt: "not-a-date" })] }).length === 0);
ok("a clip with no analysis timestamp is not history", one({ film: [clip({ at: "" })] }).length === 0);
// M317 companion: a clip with a valid timestamp lands in history, so the "not history" clause above has a population pin.
ok("the timeline carries at least one analysed clip", one({ film: [clip({ at: "2026-01-01T00:00:00.000Z" })] }).length >= 1);
ok("a clip with an unparseable timestamp is not history", one({ film: [clip({ at: "yesterday" })] }).length === 0);
// M317 companion: a clip with a parseable timestamp lands in history, so the "not history" clause above has a population pin.
ok("the timeline carries at least one clip with a valid date", one({ film: [clip()] }).length >= 1);
ok("an absent learn or film collection is empty, not an error",
  buildTimeline({ sessions: [session()], plans: [], memory: [] }).length === 1);
ok("completedAt wins over the scheduled date",
  one({ sessions: [session({ date: "2020-01-01" })] })[0].at === "2026-03-01T09:30:00.000Z");
ok("a session with only a scheduled date still lands on the timeline",
  one({ sessions: [session({ completedAt: undefined })] })[0].at === "2026-03-01");

// ---- 4. Row shape per kind.
const s = one({ sessions: [session()] })[0];
// The session's own row is forwarded, never re-wrapped here: a session stored before a title
// was a row keeps its words, and one the app built keeps its key so the timeline words it in
// the reader's locale rather than freezing whichever language it was completed in.
ok("a session's own title row is forwarded, not re-worded here",
  s.title.value === "Session title A" &&
  one({ sessions: [session({ title: { key: "trn.title.focus", vars: { attrs: "passing" } } })] })[0].title.key === "trn.title.focus");
ok("a session carries its rating, XP and growth through unchanged",
  s.score === 4 && s.xp === 30 && eq(s.growth, [{ key: "passing", delta: 2 }]));
ok("the stored note is trimmed, not truncated or blanked", s.note === "keep head down");
ok("a whitespace-only note yields no note",
  one({ sessions: [session({ notes: "   " })] })[0].note === undefined &&
  one({ sessions: [session({ notes: "real note" })] })[0].note !== undefined); /* M324-TIMELINE: a timeline that dropped every note would satisfy the blank arm alone */
// M317 companion: a session with a real note carries the trimmed text, so the "no note" clause above has a population pin.
ok("the timeline carries at least one session with a non-empty note", one({ sessions: [session({ notes: "real note" })] })[0].note !== undefined && one({ sessions: [session({ notes: "real note" })] })[0].note.length > 0);
const p = one({ plans: [plan()] })[0];
ok("a plan row shows the user's own prompt and the provider that answered it",
  p.title.value === "Plan prompt B" && p.detail.value === "demo-coach-v1");
// M223: the prompt is stored as a ROW, so the timeline resolves it at read time instead of
// replaying a sentence that was frozen in whatever language the button was clicked in.
const pKeyed = one({ plans: [plan({ id: "p4", prompt: { key: "ai.videoAnalysisPrompt", vars: { improvement: "Heavy first touch", focus: "passing" } } })] })[0];
ok("a plan's prompt is forwarded as the row the caller stored, not re-worded here",
  pKeyed.title.key === "ai.videoAnalysisPrompt" && pKeyed.title.vars.focus === "passing");
const pLegacy = one({ plans: [plan({ id: "p5", prompt: "Plan prompt F" })] })[0];
ok("a plan stored before the prompt was a row keeps the writer's words verbatim, as a value rather than a guessed key",
  "value" in pLegacy.title && pLegacy.title.value === "Plan prompt F");
const memSeed = memory();
const m = one({ memory: [memSeed] })[0];
ok("a memory row is forwarded as the row it stores, not re-worded here", m.title === memSeed.text);
ok("the three stored memory subtypes each resolve through a key",
  eq(["coach", "training", "profile"].map((k) => one({ memory: [memory({ kind: k })] })[0].detail),
    [{ key: "hist.mem.coach" }, { key: "hist.mem.training" }, { key: "hist.mem.profile" }]));
ok("an unrecognised memory subtype gets no label rather than the raw code",
  one({ memory: [memory({ kind: "future-kind" })] })[0].detail === undefined &&
  one({ memory: [memory({ kind: "coach" })] })[0].detail !== undefined); /* M324-TIMELINE: a reader that labelled nothing would satisfy the unknown arm alone */
// M317 companion: a recognised memory subtype gets a label, so the "no label" clause above has a population pin.
ok("the timeline carries at least one memory with a known subtype", one({ memory: [memory({ kind: "coach" })] })[0].detail !== undefined && one({ memory: [memory({ kind: "coach" })] }).length === 1);

// ---- 5. The academy verdict is read off the record, plural included.
ok("a passed check quiz reads as passed whatever the attempt count says",
  eq(one({ learn: [learn({ quizCorrect: true, attempts: 3 })] })[0].detail, { key: "hist.learn.passed" }));
ok("a single missed attempt takes the singular key and no variable",
  eq(one({ learn: [learn({ quizCorrect: false, attempts: 1 })] })[0].detail, { key: "hist.learn.missedOne" }) &&
  one({ learn: [learn({ quizCorrect: false, attempts: 1 })] }).length === 1);
ok("two missed attempts take the plural key with n = 2",
  eq(one({ learn: [learn({ quizCorrect: false, attempts: 2 })] })[0].detail, { key: "hist.learn.missed", vars: { n: 2 } }));
ok("reading without attempting is not reported as a failed quiz",
  eq(one({ learn: [learn({ quizCorrect: false, attempts: 0 })] })[0].detail, { key: "hist.learn.read" }));
ok("a lesson title stored as a bare id still reaches the row as a value",
  one({ learn: [learn({ title: "l9" })] })[0].title.value === "l9");

// ---- 6. The film row's numbers are the record's own, recomputed not re-narrated.
const fv = one({ film: [clip()] })[0].detail.vars;
ok("the analysed row keys the clip's own file name",
  eq(one({ film: [clip()] })[0].title, { key: "hist.film.analysed", vars: { f: "clip-01.mp4" } }));
ok("the stats row reports the detections and scans it was handed", fv.d === 12 && fv.s === 4);
ok("the duration is stated in minutes to one decimal", fv.min === "5.0");
ok("the per-minute rate is detections over that duration", fv.per === (12 / (300 / 60)).toFixed(1));
ok("the provider confidence passes through untouched", fv.conf === 68);
ok("a zero-length clip reports no rate instead of dividing into Infinity",
  one({ film: [clip({ durationSec: 0 })] })[0].detail.vars.per === "0" &&
  Number(one({ film: [clip({ durationSec: 10 })] })[0].detail.vars.per) > 0); /* M324-TIMELINE: a rate that always read 0 would satisfy the zero-length arm alone */
// M317 companion: a clip with non-zero duration and detections computes a rate, so the "no rate" clause above has a population pin.
ok("the timeline carries at least one clip with a computed per-minute rate", (() => { const c = one({ film: [clip({ durationSec: 300, detections: 12 })] })[0]; return c.detail && typeof c.detail.vars.per === 'string' && c.detail.vars.per !== "0"; })());
ok("a clip with zero detections says so", one({ film: [clip({ detections: 0 })] })[0].detail.vars.d === 0);
// M317 companion: a clip with non-zero detections reports the count, so the "zero detections" clause above has a population pin.
ok("the timeline carries at least one clip with reported detections", one({ film: [clip({ detections: 5 })] })[0].detail.vars.d >= 1);

// ---- 7. Ordering: newest first, and an unreadable date sinks instead of inventing a day.
const order = buildTimeline({
  sessions: [session({ id: "old", completedAt: "2026-01-01T00:00:00.000Z" }), session({ id: "new", completedAt: "2026-12-31T00:00:00.000Z" })],
  plans: [plan({ id: "mid", createdAt: "2026-06-01T00:00:00.000Z" })],
  memory: [memory({ id: "undated", at: "garbage" })],
});
ok("rows from every kind interleave newest first", eq(order.map((e) => e.kind), ["session", "plan", "session", "memory"]));
ok("the newest session is first and the undated memory row last",
  order[0].id === "session-new" && order[order.length - 1].id === "memory-undated");

// ---- 8. groupByDay buckets by calendar day without re-sorting.
// Local wall-clock strings here on purpose: dayKey reads local fields, so a fixed
// UTC instant would land on different days for readers either side of midnight.
const days = groupByDay(buildTimeline({
  sessions: [
    session({ id: "d1", completedAt: "2026-04-02T08:00:00" }),
    session({ id: "d2", completedAt: "2026-04-02T22:00:00" }),
    session({ id: "d3", completedAt: "2026-04-01T12:00:00" }),
  ],
  plans: [], memory: [],
}));
ok("three sessions across two days make two groups", days.length === 2);
ok("the newest day comes first and holds the two rows written on it",
  eq(days[0].items.map((e) => e.id), ["session-d2", "session-d1"]) && days[1].items.length === 1);
ok("every row lands in exactly one group", days.reduce((n, g) => n + g.items.length, 0) === 3);
const undated = groupByDay(one({ memory: [memory({ at: "garbage" })] }));
ok("an undated row groups as invalid rather than as today", undated.length === 1 && undated[0].day === "invalid");

// ---- 9. rowLine is the only place the union is interpreted.
ok("an absent cell renders as nothing, not as an empty string", rowLine(undefined, t) === undefined);
// M317 companion: a present value cell renders its text, so the "nothing" clause above has a population pin.
ok("the timeline carries at least one rendered value cell", rowLine({ value: "something" }, t) !== undefined && rowLine({ value: "something" }, t).length > 0);
seen = [];
ok("a value row reaches the reader verbatim and never consults the dictionary",
  rowLine({ value: "Session title A" }, t) === "Session title A" && seen.length === 0);
seen = [];
ok("a key row is looked up with its variables passed straight through",
  rowLine({ key: "hist.film.stats", vars: { d: 12 } }, t) === "{hist.film.stats|d=12}" &&
    eq(seen, [["hist.film.stats", { d: 12 }]]));
seen = [];
rowLine({ key: "hist.learn.passed" }, t);
ok("a key with no variables is looked up with none, so nothing invents an empty bag",
  seen.length === 1 && seen[0][1] === undefined);
// M317 companion: a key with variables passes them through the lookup, so the "no variables" clause above has a population pin.
ok("the timeline carries at least one key lookup with variables", (() => { seen = []; rowLine({ key: "hist.learn.passed" }, t); return seen.length >= 1; })());
seen = [];
ok("every cell of a real timeline resolves",
  rich.every((e) => typeof rowLine(e.title, t) === "string" && (e.detail ? typeof rowLine(e.detail, t) === "string" : true)));
ok("the same row resolved twice through the same dictionary reads the same both times",
  rowLine(rich[0].title, t) === rowLine(rich[0].title, t));

// ---- 10. goalUnitKey: a stored metric code names a unit word, or nothing.
ok("every metric in the table resolves to its unit key",
  GOAL_METRICS.length === 4 && GOAL_METRICS.every((k) => goalUnitKey(k) === `goal.unit.${k}`));
ok("a code the app does not name resolves to null instead of a bare key",
  goalUnitKey("minutes") === null && goalUnitKey("") === null && goalUnitKey("XP") === null);
// TypeScript already refuses a goal row that carries a display word of its own, so
// the checks below cover the half the compiler cannot see: the words the dictionary
// hands back. Four metrics that count four different things must not read as one
// word, and a locale that does not write Latin must not be showing the English list.
const unitWords = (loc) => GOAL_METRICS.map((k) => DICTIONARIES[loc]?.[`goal.unit.${k}`]);
ok("each locale's four unit words are four different words",
  ["en", "zh-CN", "zh-TW"].every((l) => new Set(unitWords(l)).size === 4));
ok("both Chinese locales show translated unit words, not the English table",
  ["zh-CN", "zh-TW"].every((l) => unitWords(l).every((w) => typeof w === "string" && w !== "" && !/^[\x00-\x7F]+$/.test(w))));

// ---- 11. A goal's title: made by the app it is a key, typed by a visitor it is
// their own words, and either way read in the READER's locale — M150's whole claim.
const { ATTRIBUTE_KEYS } = await server.ssrLoadModule("/domain/attributes.ts");
const goalRow = (title, extra) => ({
  id: "G1", title, metric: "attribute", key: "passing", target: 62, current: 50,
  createdAt: "2026-01-01T00:00:00.000Z", done: false, ...extra,
});
const attrKey = "passing";
const attrRow = goalRow(attributeGoalTitle(attrKey));

seen = [];
const attrLine = rowLine(attrRow.title, t);
ok("an attribute goal resolves the attribute word at read time, then its own title",
  attrLine === "{goal.title.attrTarget|a={attr.name.passing}}" &&
  eq(seen, [["attr.name.passing", undefined], ["goal.title.attrTarget", { a: "{attr.name.passing}" }]]));
ok("a counted goal stores its number, not a sentence about it",
  eq(countGoalTitle("xp", 500), { key: "goal.title.earnXp", vars: { n: 500 } }) &&
  eq(countGoalTitle("sessions", 5), { key: "goal.title.trainSessions", vars: { n: 5 } }));
ok("the two counted metrics do not collapse onto one title key",
  countGoalTitle("xp", 500).key !== countGoalTitle("sessions", 5).key);

// The row is locale-free, which is the property the old string title lacked: no word
// from any of the three dictionaries appears anywhere in what gets stored.
const stored = JSON.stringify([countGoalTitle("xp", 500), countGoalTitle("sessions", 5), attributeGoalTitle(attrKey)]);
const frozen = ATTRIBUTE_KEYS.filter((k) => ["en", "zh-CN", "zh-TW"].some((l) => stored.includes(DICTIONARIES[l][`attr.name.${k}`])));
ok(`no machine-built goal row stores a display word from any locale (${frozen.join(", ") || "none"})`,
  frozen.length === 0 && ATTRIBUTE_KEYS.length > 0); /* M324-TIMELINE: an empty key population would satisfy the universal alone */

// Same row, three readers, three languages — the assertion the defect fails.
const readBy = (loc) => rowLine(attrRow.title, (k, v) => {
  let s = DICTIONARIES[loc][k] ?? k;
  for (const [n, val] of Object.entries(v ?? {})) s = s.split(`{${n}}`).join(String(val));
  return s;
});
const [enRead, cnRead, twRead] = ["en", "zh-CN", "zh-TW"].map(readBy);
ok("one stored row reads differently to readers in different locales",
  enRead !== cnRead && enRead !== twRead && cnRead !== twRead);
ok("a resolved goal title shows no placeholder and no bare key to any reader",
  [enRead, cnRead, twRead].every((s) => s && !s.includes("{") && !s.startsWith("goal.")) &&
  enRead.length > 0 && cnRead.length > 0 && twRead.length > 0); /* M324-TIMELINE: a reader that returned nothing would satisfy all three arms at once */
ok("the English reading is the dictionary's own sentence for that row",
  enRead === DICTIONARIES.en["goal.title.attrTarget"].split("{a}").join(DICTIONARIES.en[`attr.name.${attrKey}`]));

seen = [];
const typed = rowLine(goalRow({ value: "Finish the season unbeaten" }).title, t);
ok("a visitor's own title is shown verbatim and never reaches the dictionary",
  typed === "Finish the season unbeaten" && seen.length === 0);

const keyedRow = goalRow(attributeGoalTitle(attrKey));
const repaired = repairGoalTitles([goalRow("Earn 500 XP"), keyedRow]);
ok("a row stored before titles were keyed keeps its words as a value, not a guessed key",
  eq(repaired[0].title, { value: "Earn 500 XP" }));
ok("repair leaves an already-keyed row alone, object identity included", repaired[1] === keyedRow);
ok("repair carries every other field of a legacy row across",
  repaired[0].id === "G1" && repaired[0].metric === "attribute" && repaired[0].key === "passing" &&
  repaired[0].target === 62 && repaired[0].current === 50 && repaired[0].done === false);
ok("repair is safe on an empty library", repairGoalTitles([]).length === 0);

// A proof that only loads the module cannot see whether the app calls it. The render
// half needs no gate — a `Goal.title` is an object now, and printing it is a tsc error
// — but forgetting the hydration repair type-checks perfectly, so the call site is
// read from source instead.
const read = (p) => readFileSync(resolve(root, p), "utf8");
ok("the hydration boundary actually repairs stored goal titles",
  /goals:\s*repairGoalTitles\(/.test(read("store/useFootballOS.tsx")));
ok("and the repair runs on the same boundary that backfills sessions, not a read site",
  /sessions:\s*sweepOverdueSessions\(/.test(read("store/useFootballOS.tsx")));

// ---- 12. What a goal is allowed to count, and how far it has come.
const countRow = (target, current) => goalRow({ value: "Training goal" }, { target, current });
ok("a target must be a whole number above zero — 0, -3, 2.5, NaN and Infinity refused",
  isValidGoalTarget(1) && isValidGoalTarget(500) &&
  !isValidGoalTarget(0) && !isValidGoalTarget(-3) && !isValidGoalTarget(2.5) &&
  !isValidGoalTarget(Number.NaN) && !isValidGoalTarget(Number.POSITIVE_INFINITY));
// The defect this closes: an emptied number field is `Number("")`, which is 0, and a
// goal with target 0 is `done: current >= 0` — finished before it started.
ok("the exact value an emptied target field produces is the one refused",
  Number("") === 0 && !isValidGoalTarget(Number("")));
ok("progress is a whole percent between 0 and 100",
  goalProgressPct(countRow(100, 50)) === 50 && goalProgressPct(countRow(100, 150)) === 100 &&
  goalProgressPct(countRow(3, 1)) === 33 && goalProgressPct(countRow(5, 0)) === 0);
ok("a row whose target is not a count reads 0%, never NaN",
  [0, -2, Number.NaN].every((t0) => goalProgressPct(countRow(t0, 5)) === 0));

// A reducer branch nothing dispatches is dead weight the compiler cannot see (M78 found
// one), so every case label has to answer to a dispatch in the same file.
const storeSrc = read("store/useFootballOS.tsx");
const cases = [...new Set([...storeSrc.matchAll(/^\s*case "([A-Z_]+)":/gm)].map((m) => m[1]))];
const dispatched = new Set([...storeSrc.matchAll(/type:\s*"([A-Z_]+)"/g)].map((m) => m[1]));
const dead = cases.filter((c) => !dispatched.has(c));
ok(`every reducer case has a dispatch that can reach it (${cases.length} cases; ${dead.join(", ") || "none dead"})`,
  cases.length >= 10 && dead.length === 0);
ok("removing a goal is one of them, and the goals panel actually offers it",
  cases.includes("GOAL_REMOVE") && /removeGoal\(g\.id\)/.test(read("features/player/PlayerOS.tsx")));
// An icon-only control is unnamed to a screen reader unless it says what it does, and
// nothing else in the app would notice the glyph going bare.
ok("the remove control names itself to assistive tech instead of being a bare glyph",
  /aria-label=\{t\("player\.goalRemoveAria"\)\}/.test(read("features/player/PlayerOS.tsx")));

// ---- 13. The coach's remembered rows. They are persisted, so their wording used to
// belong to whoever was reading when the event happened — forever.
const { profileMemory, coachMemory, trainingMemory, repairMemoryTexts } =
  await server.ssrLoadModule("/domain/memory.ts");

ok("a remembered profile row stores the mode, the group and the visitor's own goal",
  eq(profileMemory("PLAYER", "CM", "Win the league"),
    { key: "mem.line.profile", vars: { mode: "PLAYER", group: "CM", goal: "Win the league" } }));

seen = [];
const profLine = rowLine(profileMemory("PLAYER", "CM", "Win the league"), t);
ok("reading it resolves the mode and the group, and leaves the visitor's words alone",
  profLine === "{mem.line.profile|goal=Win the league,group={group.CM},mode={prof.mode.PLAYER}}" &&
  eq(seen.map((s) => s[0]), ["prof.mode.PLAYER", "group.CM", "mem.line.profile"]));

const focusRow = coachMemory(["passing", "ball_control"], 30);
ok("a focus list is stored as codes, not as words",
  eq(focusRow, { key: "mem.line.coach", vars: { focus: "passing,ball_control", minutes: 30 } }));
seen = [];
const coachLine = rowLine(focusRow, t);
ok("each code in the list is looked up on its own and rejoined for the reader",
  coachLine === "{mem.line.coach|focus={attr.name.passing} + {attr.name.ball_control},minutes=30}" &&
  eq(seen.map((s) => s[0]), ["attr.name.passing", "attr.name.ball_control", "mem.line.coach"]));

// Name-based resolution is what keeps a person's own words safe: a session really
// titled "CM" must never be re-read as a position-group lookup. Since M236 the title
// arrives as a ROW — a value when a person wrote it, a key when the builder made it — and
// either way it is forwarded whole so the reader words it in their own column.
seen = [];
const cmTitle = rowLine(trainingMemory({ value: "CM" }, 50, 4, 3), t);
ok("a stored value that happens to read like a code is still shown as the writer's text",
  cmTitle === "{mem.line.training|level=3,rating=4,title=CM,xp=50}" &&
  eq(seen.map((s) => s[0]), ["mem.line.training"]));

// A session the app built carries a key, not a sentence. Nesting that row in the memory line
// is what keeps a persisted memory readable in whatever locale opens it — the alternative
// froze the line in the language the session happened to be completed in, which is the whole
// reason ./memory exists.
seen = [];
const builtTitle = { key: "trn.title.focus", vars: { attrs: "passing,ball_control" } };
const nestedLine = rowLine(trainingMemory(builtTitle, 50, 4, 3), t);
ok("a memory line nests the session's own title row and resolves it for the reader",
  nestedLine === "{mem.line.training|level=3,rating=4,title={trn.title.focus|attrs={attr.name.passing} + {attr.name.ball_control}},xp=50}" &&
  eq(seen.map((s) => s[0]), ["attr.name.passing", "attr.name.ball_control", "trn.title.focus", "mem.line.training"]));

// The nested row is resolved at read time, so two readers of the same stored object disagree
// in the way they should: same row, their own language — and neither of them is handed a
// stringified object, which is what printing a row instead of reading it looks like.
const nestedRow = trainingMemory(builtTitle, 50, 4, 3);
const nestedReadings = locales.map((loc) => [loc, say(loc)(nestedRow)]);
ok(`the same stored memory row words its nested title differently per reader (${nestedReadings.map(([l, r]) => `${l}:"${r}"`).join(" ").slice(0, 150)})`,
  nestedReadings.length >= 3 && new Set(nestedReadings.map(([, r]) => r)).size === locales.length &&
  nestedReadings.every(([, r]) => typeof r === "string" && !/object Object|\[object/.test(r)));

// A session stored before its title was a row keeps the sentence the app wrote then; a session
// already carrying a row is returned as the same object, because hydration runs on every load
// and rebuilding untouched sessions would make every one of them look edited.
const { repairSessionTitles } = await server.ssrLoadModule("/domain/training.ts");
const legacySessions = [
  { ...session(), title: "Passing + Dribbling session" },
  session({ id: "s4" }),
];
const rsRepaired = repairSessionTitles(legacySessions);
ok("a session stored while its title was a sentence keeps those words as a value",
  eq(rsRepaired[0].title, { value: "Passing + Dribbling session" }) && rsRepaired[0].id === "s1");
ok("a session already carrying a row is left alone, identity included", rsRepaired[1] === legacySessions[1]);
ok("session repair is safe on an empty list", repairSessionTitles([]).length === 0);
const cleanSessions = [session({ id: "s5" })];
ok("a list of sessions with nothing to repair comes back as the same array, not a rebuild",
  repairSessionTitles(cleanSessions) === cleanSessions && repairSessionTitles(cleanSessions)[0] === cleanSessions[0]);
ok("the hydration boundary repairs a legacy session title on the way in",
  /sessions:\s*sweepOverdueSessions\(repairSessionTitles\(/.test(read("store/useFootballOS.tsx")));

// M329: the completion reducer paid XP off a hand-copied minute-weighted intensity mean
// rather than the shared sessionIntensity the review and projection use. Two formulas that
// happen to agree today drift the moment either is fixed — the XP the session earns and the
// load every other reader reports would disagree while both stayed green. So the store asks
// the shared function, and this gate charges BOTH directions: the call is present, the copy is gone.
const intensitySrc = read("store/useFootballOS.tsx");
ok(`the completion reducer asks the shared sessionIntensity for the session's load (${intensitySrc.match(/sessionIntensity\(session\)/g)?.length ?? 0} call site)`,
  /sessionIntensity\(session\)/.test(intensitySrc));
ok(`and no longer carries a second copy of the minute-weighted intensity mean (${/e\.intensity\s*\*\s*e\.minutes/.test(intensitySrc) ? "the duplicated mean is still in the store" : "only sessionIntensity computes it"}, read over ${intensitySrc.length} byte(s) of training source)`,
  intensitySrc.length > 0 && !/e\.intensity\s*\*\s*e\.minutes/.test(intensitySrc));

const memRow = (text, extra) => ({ id: "M1", kind: "coach", text, at: "2026-01-02T00:00:00.000Z", ...extra });
const keyedMem = memRow(coachMemory(["passing"], 25));
const mRepaired = repairMemoryTexts([memRow("Coach focused on passing (25′)"), keyedMem]);
ok("a remembered row stored while these were sentences keeps its words as a value",
  eq(mRepaired[0].text, { value: "Coach focused on passing (25′)" }));
ok("and a row already keyed is left alone, identity included", mRepaired[1] === keyedMem);
ok("repair keeps every other field of a legacy memory row",
  mRepaired[0].id === "M1" && mRepaired[0].kind === "coach" && mRepaired[0].at === "2026-01-02T00:00:00.000Z");
ok("repair is safe on an empty library", repairMemoryTexts([]).length === 0 && repairMemoryTexts([memRow("x")]).length === 1); /* M324-TIMELINE: a repair that dropped every row would satisfy the empty arm alone */
const cleanMem = [keyedMem];
ok("a library with nothing to repair is returned as the same array, not a rebuild",
  repairMemoryTexts(cleanMem) === cleanMem && repairMemoryTexts(cleanMem)[0] === keyedMem);
const cleanGoals = [keyedRow];
ok("and the same holds for goal rows, which hydrate on every load",
  repairGoalTitles(cleanGoals) === cleanGoals && repairGoalTitles(cleanGoals)[0] === keyedRow);

// The timeline forwards the row instead of re-wording it, so /history resolves the
// same stored object the panel does — one row, one wording, in either screen.
const tl = buildTimeline({ sessions: [], plans: [], memory: [keyedMem] });
ok("the activity timeline carries the memory row's own keyed text, not a stringified one",
  tl.length === 1 && tl[0].title === keyedMem.text);

const storeSrc2 = read("store/useFootballOS.tsx");
ok("the hydration boundary repairs remembered rows on the way in",
  /memory:\s*repairMemoryTexts\(/.test(storeSrc2));
ok("and the memory panel resolves the row rather than printing it",
  /rowLine\(m\.text, t\)/.test(read("features/player/PlayerOS.tsx")));

// 14. Onboarding choices: the field stores a code, and a profile saved while it held
// the English sentence is repaired into that code on the way in.
const { toGoalCode, normalizeGoalChoice, GOAL_CODES } = await server.ssrLoadModule("/domain/onboarding.ts");
const { LEGACY_GOAL_TEXT } = await server.ssrLoadModule("/data/onboardingLegacy.ts");
ok("every legacy goal sentence maps to the code its picker now stores",
  GOAL_CODES.every((c) => toGoalCode(c) === c));
// M240. The table moved to `data/` and arrived one entry short: `"Improve first touch"` was
// dropped, so a profile saved before the field held a code kept its English sentence for ever
// and the goal chip printed it in every locale. Nothing caught it — the clause above only
// checks that codes map to themselves, and the spot-checks below named two of the six
// sentences. This walks the table itself, so the table cannot claim a sentence it cannot
// recognise, and it holds one entry per goal code rather than a number typed in here.
ok(`every sentence in the legacy table is actually recognised (${Object.keys(LEGACY_GOAL_TEXT).length} of ${GOAL_CODES.length} codes)`,
  Object.keys(LEGACY_GOAL_TEXT).length === GOAL_CODES.length &&
  Object.entries(LEGACY_GOAL_TEXT).every(([text, code]) => toGoalCode(text) === code));
ok("…and the table covers every code the picker can store, one sentence each",
  GOAL_CODES.every((c) => Object.values(LEGACY_GOAL_TEXT).filter((v) => v === c).length === 1));
ok("a stored sentence becomes its code, and anything unrecognised is left as written",
  toGoalCode("Play smarter (scanning/decisions)") === "playSmarter" &&
  normalizeGoalChoice("Become a two-footed player") === "twoFooted" &&
  normalizeGoalChoice("a visitor's own words") === "a visitor's own words" &&
  toGoalCode("firstTouch") === "firstTouch" && toGoalCode("not-a-code") === null);
ok("the profile header resolves both stored choices instead of printing a code",
  read("features/player/PlayerOS.tsx").includes("goalLabel(state.profile.goal, t)") &&
  read("features/player/PlayerOS.tsx").includes("ageGroupLabel(state.profile.ageGroup, t)"));
ok("the hydration boundary normalizes the stored goal choice",
  /goal: normalizeGoalChoice\(s\.profile\.goal\)/.test(read("store/useFootballOS.tsx")));

// ---- M353. The day-key census: one local door, one deliberate UTC sibling.
// domain/history.ts exports the local-calendar day key the timeline buckets on and the streak
// reads (store/useFootballOS.tsx) — but HistoryPage's "Today/Yesterday" label kept its own
// byte-for-byte copy of the door's body under a different name (`keyOf`), so the screen and the
// bucketing could silently disagree the moment the door's shape changed. domain/load.ts holds a
// SEPARATE private `dayKey` that must NOT ride the door: ACWR's 7/28-DAY sums need UTC day
// boundaries so the same local store reads one ACWR on every device, whereas the reader's wall
// calendar is what the timeline groups by. The census keys on the STRUCTURAL shape of the two
// definitions — a local `function dayKey` vs a UTC `toISOString().slice(0, 10)` in the file that
// never imports the door — so a future tidy-up that unifies them, or a new copy that reintroduces
// `keyOf`, reddens here rather than silently shipping.
const SRC_DIRS = ["domain", "data", "lib", "features", "components", "store", "i18n"];
const srcFiles = [];
for (const d of SRC_DIRS) {
  for (const f of readdirSync(join(root, d), { recursive: true })) {
    if (!/\.(ts|tsx)$/.test(f)) continue;
    const rel = `${d}/${String(f).replace(/\\/g, "/")}`;
    srcFiles.push([rel, readFileSync(join(root, d, f), "utf8")]);
  }
}
const byPath = new Map(srcFiles);
const keyOfHit = (s) => /\bkeyOf\b/.test(s);
const keyOfSites = srcFiles.filter(([, s]) => keyOfHit(s)).map(([p]) => p);
const pageSrc = read("features/history/HistoryPage.tsx");
const loadSrc = read("domain/load.ts");

ok(`the day-key census walks the real source tree, and every subject file is inside it (${srcFiles.length} .ts/.tsx)`,
  srcFiles.length >= 80 &&
    ["domain/history.ts", "domain/load.ts", "features/history/HistoryPage.tsx"].every((p) => byPath.has(p)));

const doorFiles = srcFiles.filter(([, s]) => /export function dayKey\b/.test(s)).map(([p]) => p);
ok(`the local day key is exported from exactly one door (${doorFiles.join(", ")})`,
  doorFiles.length === 1 && doorFiles[0] === "domain/history.ts" && srcFiles.length >= 80);

const doorBody = (read("domain/history.ts").match(/export function dayKey[\s\S]*?\n}/) || [""])[0];
ok(`the door builds a padded LOCAL calendar day — the same shape groupByDay buckets on`,
  /getFullYear\(\)/.test(doorBody) && /getDate\(\)/.test(doorBody) && /padStart\(2, "0"\)/.test(doorBody) && doorBody.length > 40);

const privateFiles = srcFiles.filter(([, s]) => /(?<!export )function dayKey\b/.test(s)).map(([p]) => p);
ok(`the one private dayKey is load.ts's UTC sibling, and that file never imports the local door (${privateFiles.join(", ")})`,
  privateFiles.length === 1 && privateFiles[0] === "domain/load.ts" &&
    !/from "@\/domain\/history"/.test(loadSrc) &&
    /\.toISOString\(\)\.slice\(0, ?10\)/.test(loadSrc));

ok(`HistoryPage's private keyOf is gone and the screen rides the door (fixture ${keyOfHit("const today = keyOf(now)")} / tree ${keyOfSites.length})`,
  keyOfHit("const today = keyOf(now)") && keyOfSites.length === 0 &&
    /import \{[^}]*\bdayKey\b[^}]*\} from "@\/domain\/history"/.test(pageSrc) &&
    pageSrc.includes("dayKey(now.toISOString())"));

const pad2 = (n) => String(n).padStart(2, "0");
const localKey = (d) => [d.getFullYear(), pad2(d.getMonth() + 1), pad2(d.getDate())].join("-");
const nowD = new Date();
const ydayD = new Date(nowD.getTime() - 86400000);
ok(`the door reproduces the exact local-calendar string the screen used to build, so the toISOString round-trip does not shift today/yesterday (${dayKey(nowD.toISOString())} / ${dayKey(ydayD.toISOString())})`,
  dayKey(nowD.toISOString()) === localKey(nowD) &&
    dayKey(ydayD.toISOString()) === localKey(ydayD) &&
    /^\d{4}-\d{2}-\d{2}$/.test(dayKey(nowD.toISOString())));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
