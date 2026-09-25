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
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { buildTimeline, groupByDay } = await server.ssrLoadModule("/domain/history.ts");
const { rowLine } = await server.ssrLoadModule("/domain/rowText.ts");
const { GOAL_METRICS, goalUnitKey, countGoalTitle, attributeGoalTitle, goalLine, repairGoalTitles, isValidGoalTarget, goalProgressPct } =
  await server.ssrLoadModule("/domain/goals.ts");
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
  id: "s1", title: "Session title A", status: "completed",
  completedAt: "2026-03-01T09:30:00.000Z", date: "2026-03-01",
  selfRating: 4, xpAwarded: 30, growth: [{ key: "passing", delta: 2 }], notes: "  keep head down  ",
  ...over,
});
const plan = (over = {}) => ({ id: "p1", createdAt: "2026-03-02T10:00:00.000Z", prompt: "Plan prompt B", provider: "demo-coach-v1", ...over });
const memory = (over = {}) => ({ id: "m1", kind: "coach", text: "Memory text C", at: "2026-03-03T11:00:00.000Z", ...over });
const learn = (over = {}) => ({ id: "l1", title: "Lesson title D", completedAt: "2026-03-04T12:00:00.000Z", quizCorrect: true, attempts: 0, ...over });
const clip = (over = {}) => ({
  id: "f1", at: "2026-03-05T13:00:00.000Z", fileName: "clip-01.mp4",
  durationSec: 300, detections: 12, scans: 4, confidence: 68, ...over,
});
const empty = { sessions: [], plans: [], memory: [], learn: [], film: [] };
const one = (over = {}) => buildTimeline({ ...empty, ...over });

// ---- 1. Provenance: every string a row shows came out of a record.
const rich = buildTimeline({
  sessions: [session(), session({ id: "s2", title: "Session title E", completedAt: "2026-03-06T08:00:00.000Z" })],
  plans: [plan(), plan({ id: "p2", prompt: "Plan prompt F" })],
  memory: [memory(), memory({ id: "m2", kind: "training", text: "Memory text G" })],
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
    if ("key" in cell && !/^hist\.[a-z.]+$/.test(cell.key)) shapeProblems.push(`${e.id}: ${cell.key} is outside the namespace this module may use`);
  }
  if (e.note) rowStrings.push(e.note);
}
ok(`the ${rich.length} rows are well-formed key-or-value cells (${[...new Set(shapeProblems)].join(" | ") || "clean"})`,
  rich.length === 10 && shapeProblems.length === 0);
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
ok("of a mixed list, only the completed session is history",
  one({ sessions: [session(), session({ id: "s2", status: "skipped" })] }).length === 1);
ok("a lesson with no completion timestamp is left off rather than given a false date",
  one({ learn: [learn({ completedAt: "" })] }).length === 0);
ok("a lesson with an unparseable date is left off", one({ learn: [learn({ completedAt: "not-a-date" })] }).length === 0);
ok("a clip with no analysis timestamp is not history", one({ film: [clip({ at: "" })] }).length === 0);
ok("a clip with an unparseable timestamp is not history", one({ film: [clip({ at: "yesterday" })] }).length === 0);
ok("an absent learn or film collection is empty, not an error",
  buildTimeline({ sessions: [session()], plans: [], memory: [] }).length === 1);
ok("completedAt wins over the scheduled date",
  one({ sessions: [session({ date: "2020-01-01" })] })[0].at === "2026-03-01T09:30:00.000Z");
ok("a session with only a scheduled date still lands on the timeline",
  one({ sessions: [session({ completedAt: undefined })] })[0].at === "2026-03-01");

// ---- 4. Row shape per kind.
const s = one({ sessions: [session()] })[0];
ok("a session title is a stored value, not a dictionary key", "value" in s.title && s.title.value === "Session title A");
ok("a session carries its rating, XP and growth through unchanged",
  s.score === 4 && s.xp === 30 && eq(s.growth, [{ key: "passing", delta: 2 }]));
ok("the stored note is trimmed, not truncated or blanked", s.note === "keep head down");
ok("a whitespace-only note yields no note", one({ sessions: [session({ notes: "   " })] })[0].note === undefined);
const p = one({ plans: [plan()] })[0];
ok("a plan row shows the user's own prompt and the provider that answered it",
  p.title.value === "Plan prompt B" && p.detail.value === "demo-coach-v1");
const m = one({ memory: [memory()] })[0];
ok("a memory row keeps the stored sentence as its value", m.title.value === "Memory text C");
ok("the three stored memory subtypes each resolve through a key",
  eq(["coach", "training", "profile"].map((k) => one({ memory: [memory({ kind: k })] })[0].detail),
    [{ key: "hist.mem.coach" }, { key: "hist.mem.training" }, { key: "hist.mem.profile" }]));
ok("an unrecognised memory subtype gets no label rather than the raw code",
  one({ memory: [memory({ kind: "future-kind" })] })[0].detail === undefined);

// ---- 5. The academy verdict is read off the record, plural included.
ok("a passed check quiz reads as passed whatever the attempt count says",
  eq(one({ learn: [learn({ quizCorrect: true, attempts: 3 })] })[0].detail, { key: "hist.learn.passed" }));
ok("a single missed attempt takes the singular key and no variable",
  eq(one({ learn: [learn({ quizCorrect: false, attempts: 1 })] })[0].detail, { key: "hist.learn.missedOne" }));
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
  one({ film: [clip({ durationSec: 0 })] })[0].detail.vars.per === "0");
ok("a clip with zero detections says so", one({ film: [clip({ detections: 0 })] })[0].detail.vars.d === 0);

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
const attrLine = goalLine(attrRow, t);
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
  frozen.length === 0);

// Same row, three readers, three languages — the assertion the defect fails.
const readBy = (loc) => goalLine(attrRow, (k, v) => {
  let s = DICTIONARIES[loc][k] ?? k;
  for (const [n, val] of Object.entries(v ?? {})) s = s.split(`{${n}}`).join(String(val));
  return s;
});
const [enRead, cnRead, twRead] = ["en", "zh-CN", "zh-TW"].map(readBy);
ok("one stored row reads differently to readers in different locales",
  enRead !== cnRead && enRead !== twRead && cnRead !== twRead);
ok("a resolved goal title shows no placeholder and no bare key to any reader",
  [enRead, cnRead, twRead].every((s) => s && !s.includes("{") && !s.startsWith("goal.")));
ok("the English reading is the dictionary's own sentence for that row",
  enRead === DICTIONARIES.en["goal.title.attrTarget"].split("{a}").join(DICTIONARIES.en[`attr.name.${attrKey}`]));

seen = [];
const typed = goalLine(goalRow({ value: "Finish the season unbeaten" }), t);
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

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
