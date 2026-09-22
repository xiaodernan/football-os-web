import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { sweepOverdueSessions } = await server.ssrLoadModule("/domain/training.ts");
const { buildReview } = await server.ssrLoadModule("/domain/review.ts");
const { buildLoad } = await server.ssrLoadModule("/domain/load.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// Fixed instant; derive every test date from the SAME local start-of-today the
// sweep uses, so the assertions hold in any timezone.
const NOW = Date.UTC(2026, 8, 22, 12, 0, 0);
const d = new Date(NOW);
const startOfToday = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY = 86400000;

const sess = (over) => ({
  id: over.id, date: over.date, title: "Session", focusAttributes: ["first_touch"],
  exercises: [], targetMinutes: 20, status: over.status ?? "planned", ...over,
});

// 1. Sweep rules.
const yestDate = new Date(startOfToday - 3600000).toISOString();   // late yesterday → overdue
const todayDate = new Date(startOfToday + 3600000).toISOString();  // 1am today → still doable
const futureDate = new Date(startOfToday + 3 * DAY).toISOString();
const input = [
  sess({ id: "a", date: yestDate, status: "planned" }),
  sess({ id: "b", date: todayDate, status: "planned" }),
  sess({ id: "c", date: futureDate, status: "planned" }),
  sess({ id: "d", date: yestDate, status: "completed", completedAt: yestDate }),
  sess({ id: "e", date: yestDate, status: "missed" }),
  sess({ id: "f", date: "not-a-date", status: "planned" }),
];
const frozenSnapshot = JSON.stringify(input);
const out = sweepOverdueSessions(input, NOW);
const byId = (id) => out.find((s) => s.id === id);

ok("overdue planned → missed", byId("a").status === "missed");
ok("today planned stays planned", byId("b").status === "planned");
ok("future planned stays planned", byId("c").status === "planned");
ok("completed never touched", byId("d").status === "completed");
ok("already-missed stays missed", byId("e").status === "missed");
ok("invalid date stays planned", byId("f").status === "planned");
ok("sweep preserves other fields", byId("a").targetMinutes === 20 && byId("a").title === "Session");
ok("sweep is pure (input unchanged)", JSON.stringify(input) === frozenSnapshot);
ok("sweep returns a new array", out !== input);

// 2. buildReview now sees a real missed count + the slipped-session insight.
const swept = sweepOverdueSessions([
  sess({ id: "r1", date: yestDate, status: "planned" }),
  sess({ id: "r2", date: yestDate, status: "planned" }),
  sess({ id: "r3", date: new Date(startOfToday - 2 * DAY).toISOString(), status: "completed", xpAwarded: 40 }),
], NOW);
const review = buildReview({
  nowMs: NOW, windowDays: 7, sessions: swept, goals: [], progress: [], attributes: {}, streak: 0,
});
ok("review counts 2 missed", review.missed === 2);
ok("review counts 1 completed", review.completed === 1);
ok("review slipped insight fires", review.insights.some((i) => i.kind === "watch" && /slipped/.test(i.text)));

// Without the sweep the missed count was permanently zero (the dead signal).
const unswept = buildReview({
  nowMs: NOW, windowDays: 7,
  sessions: [
    sess({ id: "r1", date: yestDate, status: "planned" }),
    sess({ id: "r2", date: yestDate, status: "planned" }),
    sess({ id: "r3", date: new Date(startOfToday - 2 * DAY).toISOString(), status: "completed", xpAwarded: 40 }),
  ],
  goals: [], progress: [], attributes: {}, streak: 0,
});
ok("pre-sweep missed was 0 (dead signal)", unswept.missed === 0 && unswept.planned === 2);

// 3. buildLoad ignores missed sessions — a planned→missed flip must not change load math.
const completedOnly = [sess({ id: "l1", date: new Date(startOfToday - DAY).toISOString(), status: "completed", targetMinutes: 30, xpAwarded: 50 })];
const withMissed = [...completedOnly, sess({ id: "l2", date: yestDate, status: "missed", targetMinutes: 30 })];
const a = buildLoad({ nowMs: NOW, sessions: completedOnly });
const b = buildLoad({ nowMs: NOW, sessions: withMissed });
ok("load excludes missed (weekLoad equal)", a.weekLoad === b.weekLoad);
ok("load excludes missed (acute equal)", a.acute === b.acute);
ok("load excludes missed (chronic equal)", a.chronic === b.chronic);
ok("load excludes missed (zone equal)", a.zone === b.zone);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
