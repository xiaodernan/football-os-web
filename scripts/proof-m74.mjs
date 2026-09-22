import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { coachProvider } = await server.ssrLoadModule("/data/ai.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// A deterministic profile + plan-input factory. We pass focusKeys explicitly so
// effFocus is controlled, letting us test the continue-vs-rotate branch cleanly.
const profile = {
  displayName: "Proof", mode: "PLAYER", positionGroup: "MF", position: "CM", ageGroup: "U18",
  goal: "Improve", favoriteClubId: null, favoritePlayerId: null, favoriteCompetitionId: null,
  attributes: { first_touch: 50, passing: 60, shooting: 55, dribbling: 45, scanning: 65 },
  xp: 100, level: 2, createdAt: new Date(0).toISOString(),
};
const input = (over = {}) => ({
  prompt: "help me pass better",
  profile,
  history: [],
  availableMinutes: 30,
  ...over,
});

// 1. No memory yet → the coach makes no continuity claim (empty-state honesty).
let p = await coachProvider.generatePlan(input({ focusKeys: ["passing"] }));
ok("no lastFocus: no continuity sentence", !/last session/i.test(p.diagnosis));
ok("no lastFocus: no coach-memory source", !p.sources.some((s) => /Coach memory/.test(s)));

// 2. Overlap → continue progressive overload framing.
p = await coachProvider.generatePlan(input({ focusKeys: ["passing"], lastFocus: ["passing"] }));
ok("overlap: continue framing", /picked up where we left off/i.test(p.diagnosis));
ok("overlap: cites the continued attribute label", /Passing/i.test(p.diagnosis));
ok("overlap: coach-memory source present", p.sources.some((s) => /last session focused on/i.test(s)));

// 3. Disjoint → rotation framing, and it names BOTH the old and new focus.
p = await coachProvider.generatePlan(input({ focusKeys: ["shooting"], lastFocus: ["passing"] }));
ok("rotate: rotation framing", /rotate/i.test(p.diagnosis));
ok("rotate: mentions previous + new focus", /Passing/i.test(p.diagnosis) && /Shooting/i.test(p.diagnosis));
ok("rotate: not the continue phrasing", !/picked up where we left off/i.test(p.diagnosis));

// 4. Partial overlap → the overlap is described as continued.
p = await coachProvider.generatePlan(input({ focusKeys: ["shooting", "dribbling"], lastFocus: ["dribbling"] }));
ok("partial: uses continue branch (some overlap)", /picked up where we left off/i.test(p.diagnosis));

// 5. Invalid lastFocus keys are filtered, not echoed.
p = await coachProvider.generatePlan(input({ focusKeys: ["passing"], lastFocus: ["not_a_real_attr"] }));
ok("invalid lastFocus ignored", !/Coach memory/.test(p.sources.join(" ")) && !/not_a_real_attr/i.test(p.diagnosis));

// 6. Determinism: same input → same diagnosis + sources.
const a = await coachProvider.generatePlan(input({ focusKeys: ["passing"], lastFocus: ["passing"] }));
const b = await coachProvider.generatePlan(input({ focusKeys: ["passing"], lastFocus: ["passing"] }));
ok("deterministic diagnosis", a.diagnosis === b.diagnosis);
ok("deterministic sources", JSON.stringify(a.sources) === JSON.stringify(b.sources));

// 7. The memory source is grounded in the real last focus (label, not raw key).
const labels = a.sources.find((s) => /Coach memory/.test(s)) || "";
ok("memory source cites a human label not a raw key", /Passing/.test(labels) && !/passing\b/.test(labels.replace("Passing", "")));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
