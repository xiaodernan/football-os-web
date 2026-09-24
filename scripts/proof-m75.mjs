import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { buildTimeline, rowLine } = await server.ssrLoadModule("/domain/history.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const base = { plans: [], memory: [] };
const completed = (over = {}) => ({
  id: "S1", title: "Passing block", status: "completed",
  completedAt: "2026-01-05T10:00:00.000Z", date: "2026-01-05T09:00:00.000Z",
  selfRating: 4, xpAwarded: 30, growth: [{ key: "passing", delta: 2 }],
  ...over,
});

// 1. A stored note is surfaced on the session's timeline event.
let ev = buildTimeline({ ...base, sessions: [completed({ notes: "right foot felt weak" })] })[0];
ok("note carried onto the timeline event", ev.note === "right foot felt weak");

// 2. A session with no note field yields no note (undefined, not empty string).
ev = buildTimeline({ ...base, sessions: [completed()] })[0];
ok("absent note → undefined", ev.note === undefined);

// 3. A whitespace-only note is trimmed away, not rendered as an empty quote.
ev = buildTimeline({ ...base, sessions: [completed({ notes: "   " })] })[0];
ok("blank note dropped to undefined", ev.note === undefined);

// 4. Surrounding whitespace is trimmed but the text is preserved.
ev = buildTimeline({ ...base, sessions: [completed({ notes: "  keep head down  " })] })[0];
ok("note trimmed not truncated", ev.note === "keep head down");

// 5. Notes attach only to session rows — plans/memory never gain a note field.
const withNote = buildTimeline({
  sessions: [completed({ notes: "hello" })],
  plans: [{ id: "P1", createdAt: "2026-01-06T00:00:00.000Z", prompt: "plan", provider: "demo" }],
  memory: [{ id: "M1", kind: "coach", text: "mem", at: "2026-01-07T00:00:00.000Z" }],
});
ok("only the session event has a note", withNote.filter((e) => e.note).length === 1 && withNote.find((e) => e.note).kind === "session");

// 6. Existing session fields are untouched by the addition. M149 made a row's text
//    either a dictionary key or a recorded value; a session title is the user's own
//    stored words, so it has to reach the reader verbatim — and without a lookup,
//    because there is nothing in any dictionary that could hold it.
ev = buildTimeline({ ...base, sessions: [completed({ notes: "n" })] })[0];
const looked = [];
const shown = rowLine(ev.title, (k) => (looked.push(k), `«${k}»`));
ok("session row keeps title/score/xp/growth", shown === "Passing block" && looked.length === 0 && ev.score === 4 && ev.xp === 30 && ev.growth.length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
