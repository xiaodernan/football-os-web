// Proof for M99: the DNA read is derived from the same attribute vector the
// dataset stored the player's archetype from, and the "has a vector" rule is
// shared rather than re-tested per caller.
// Run: node scripts/proof-m99.mjs
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { playerVector, playerDna, computeDna, archetypeLabel, VECTOR_MIN_KEYS } = await server.ssrLoadModule("/domain/playerDna.ts");
const { scoutReport, modelPlayerProfile, templateEdge } = await server.ssrLoadModule("/domain/scouting.ts");
const { footballProvider } = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// 1. The vector-presence rule: absent / too-short vectors are not a vector.
ok("undefined vector → null", playerVector(undefined) === null);
ok("empty vector → null", playerVector({}) === null);
const short = Object.fromEntries(Array.from({ length: VECTOR_MIN_KEYS - 1 }, (_, i) => ["k" + i, 50]));
ok(`fewer than ${VECTOR_MIN_KEYS} keys → null`, playerVector(short) === null);
const exact = Object.fromEntries(Array.from({ length: VECTOR_MIN_KEYS }, (_, i) => ["k" + i, 50]));
ok(`exactly ${VECTOR_MIN_KEYS} keys → kept`, playerVector(exact) === exact);

// 2. No vector → no DNA. A secondary archetype read off a ratings-only record
//    would be invented, so playerDna must refuse rather than guess.
ok("no vector → no DNA", playerDna(undefined) === null);
ok("short vector → no DNA", playerDna(short) === null);

// 3. With a vector, DNA is present and the two archetypes differ (a single
//    archetype cannot be both primary and secondary).
const vector = { ball_control: 80, first_touch: 78, passing: 84, long_passing: 82, crossing: 70,
  shooting: 60, finishing: 58, dribbling: 76, weak_foot: 60, set_pieces: 64,
  acceleration: 66, sprint: 62, agility: 72, balance: 74, strength: 58, stamina: 70,
  explosiveness: 60, mobility: 68, scanning: 86, positioning: 78, decision_making: 84,
  space_awareness: 82, press_resistance: 80, off_ball_movement: 70, defensive_awareness: 60,
  transition_awareness: 72, composure: 80, concentration: 76, discipline: 78,
  confidence: 74, game_intelligence: 86, consistency: 72 };
const dna = playerDna(vector);
ok("vector → DNA present", !!dna);
ok("primary and secondary differ", dna.primary.key !== dna.secondary.key);
ok("evolution path names secondary → primary", dna.evolutionPath === `${dna.secondary.label} → ${dna.primary.label}`);
ok("primary label resolves to a human label, not a slug", !/_/.test(dna.primary.label));

// 4. THE KEY CLAIM: every seeded player stores `archetype: dna.primary.key`,
//    computed from the vector they also store. Re-deriving it must reproduce
//    the stored key exactly, or the player page would contradict the dataset.
const players = footballProvider.players();
ok("dataset has players", players.length > 0);
let mismatched = 0, withVector = 0;
for (const p of players) {
  const derived = playerDna(p.attributes);
  if (!derived) continue;
  withVector++;
  if (derived.primary.key !== p.archetype) mismatched++;
}
ok("seeded players carry a vector", withVector === players.length);
ok("re-derived primary reproduces the stored archetype for every player", mismatched === 0);

// 5. The shared rule did not change what the scouting models report: they must
//    agree with playerVector on every player, measured and modelled alike.
let disagreements = 0;
for (const p of players) {
  const has = playerVector(p.attributes) !== null;
  if (scoutReport(p).hasVector !== has) disagreements++;
  if (modelPlayerProfile(p).measured !== has) disagreements++;
  if ((templateEdge(p) !== null) !== has) disagreements++;
}
ok("scoutReport / modelPlayerProfile / templateEdge agree with playerVector", disagreements === 0);

// 6. A ratings-only record still degrades honestly rather than throwing.
const lean = { id: "lean-1", name: "Lean", position: "CM", positionGroup: "CM", age: 22, nation: "XX",
  clubId: "none", overall: 70, potential: 76, archetype: "creator", value: 1_000_000, foot: "R" };
const leanReport = scoutReport(lean);
ok("ratings-only player: report says no vector", leanReport.hasVector === false);
ok("ratings-only player: DNA withheld", playerDna(lean.attributes) === null);
ok("ratings-only player: archetypeLabel still resolves the stored key", archetypeLabel(lean.archetype) === "Creator");

// 7. Determinism: the same vector always yields the same DNA.
const again = computeDna(vector);
ok("deterministic primary", again.primary.key === dna.primary.key);
ok("deterministic secondary", again.secondary.key === dna.secondary.key);
ok("deterministic evolution path", again.evolutionPath === dna.evolutionPath);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
