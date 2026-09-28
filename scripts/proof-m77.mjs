import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { coachProvider } = await server.ssrLoadModule("/data/ai.ts");
const { buildSession } = await server.ssrLoadModule("/domain/training.ts");
const { computeDna, ARCHETYPES } = await server.ssrLoadModule("/domain/playerDna.ts");
const { DICTIONARIES } = await server.ssrLoadModule("/i18n/dictionaries.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

function resolve(row) {
  if (Array.isArray(row)) return row.map(r => resolve(r)).join(" ");
  const tpl = DICTIONARIES.en[row.key];
  if (!tpl) return row.key;
  return Object.entries(row.vars ?? {}).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), tpl);
}

const gameDrill = (session) => session.exercises.find((e) => e.phase === "game");

// Every archetype's gameFocus must be a real game-phase drill focus.
const GAME_FOCUSES = ["crossing", "transition_awareness", "game_intelligence", "sprint"];
ok("all archetype gameFocus are valid game drills", ARCHETYPES.every((a) => GAME_FOCUSES.includes(a.gameFocus)));

const mkProfile = (attributes) => ({
  displayName: "Proof", mode: "PLAYER", positionGroup: "MF", position: "CM", ageGroup: "U18",
  goal: "Improve", favoriteClubId: null, favoritePlayerId: null, favoriteCompetitionId: null,
  attributes, xp: 100, level: 2, createdAt: new Date(0).toISOString(),
});
const input = (profile) => ({ prompt: "improve my game", profile, history: [], availableMinutes: 60 });

// 1. The generated session's GAME drill genuinely equals the player's DNA signature
//    (this is what makes "session shaped to your role" true rather than decorative).
const vectors = [
  { acceleration: 88, sprint: 90, off_ball_movement: 87, explosiveness: 89, space_awareness: 85, passing: 40, strength: 30 }, // transition_runner → sprint
  { strength: 86, first_touch: 84, set_pieces: 83, positioning: 82, composure: 85, sprint: 40, crossing: 30 }, // target_man → crossing
  { defensive_awareness: 88, positioning: 86, strength: 85, concentration: 84, transition_awareness: 87, passing: 40 }, // ball_winner → transition_awareness
];
for (const attrs of vectors) {
  const plan = await coachProvider.generatePlan(input(mkProfile(attrs)));
  const dna = computeDna(attrs);
  const game = gameDrill(plan.session);
  ok(`game block matches DNA ${dna.primary.label} focus (${dna.primary.gameFocus})`, !!game && game.focus === dna.primary.gameFocus);
  ok(`rationale names the role game drill`, plan.rationale.some((r) => /game-realistic block is your/i.test(resolve(r))));
}

// 2. Determinism: same profile → same game drill.
const a = await coachProvider.generatePlan(input(mkProfile(vectors[0])));
const b = await coachProvider.generatePlan(input(mkProfile(vectors[0])));
ok("deterministic game drill selection", gameDrill(a.session)?.focus === gameDrill(b.session)?.focus);

// 3. buildSession honours roleGameFocus directly, and stays backward-compatible.
const base = { id: "S1", date: "2026-01-01T00:00:00.000Z", targetMinutes: 60, focusAttributes: ["passing"], group: "MF", seed: "x" };
ok("buildSession uses role game focus", gameDrill(buildSession({ ...base, roleGameFocus: "crossing" })).focus === "crossing");
ok("buildSession without role focus still yields a game drill", GAME_FOCUSES.includes(gameDrill(buildSession(base)).focus));

// 4. Short sessions where the game block can't fit: no crash, no false game claim forced.
const short = gameDrill(buildSession({ ...base, targetMinutes: 5, roleGameFocus: "crossing" }));
ok("very short session tolerates role focus", short === undefined || GAME_FOCUSES.includes(short.focus));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
