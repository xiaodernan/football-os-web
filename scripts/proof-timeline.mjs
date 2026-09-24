// Proof for the activity row contract (domain/history.ts + domain/goals.ts).
//
// These two modules sit between a stored record and a reader's screen, and they are
// invisible to the component-scoped raw-UI scan: nothing in them is JSX. So every
// way a row can lie about where its words came from is pinned here instead. The
// load-bearing check is #1: the strings a row shows must be a subset of the strings
// the input records carry, which a module cannot satisfy by writing a sentence.
//
// Run: node scripts/proof-timeline.mjs
import { createServer } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { buildTimeline, rowLine, groupByDay } = await server.ssrLoadModule("/domain/history.ts");
const { GOAL_METRICS, goalUnitKey } = await server.ssrLoadModule("/domain/goals.ts");
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

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
