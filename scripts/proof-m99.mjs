// Proof for M99: the DNA read is derived from the same attribute vector the
// dataset stored the player's archetype from, and the "has a vector" rule is
// shared rather than re-tested per caller.
// Run: node scripts/proof-m99.mjs
import { createServer } from "vite";
import { readFileSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { playerVector, playerDna, computeDna, archetypeLabelEn, ARCHETYPES, VECTOR_MIN_KEYS } = await server.ssrLoadModule("/domain/playerDna.ts");
const { makeSay } = await import("./lib/rows.mjs");
const { say, locales, DICTIONARIES } = await makeSay(server);
const archName = (locale, id) => DICTIONARIES[locale][`dna.arch.${id}`];
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
ok("primary and secondary differ", dna.primary.id !== dna.secondary.id);
// The evolution line is a row now, so what is asserted is that both ends reach the
// reader as words of their own language — and that no archetype id leaks onto the page.
ok("evolution row names secondary then primary, in the reader’s own words",
  locales.every((l) => say(l)(dna.evolution) === `${archName(l, dna.secondary.id)} → ${archName(l, dna.primary.id)}`));
ok("and no locale prints an archetype id where a name belongs",
  locales.every((l) => !/[a-z]+_[a-z0-9]+/.test(say(l)(dna.evolution))));
ok("the primary archetype’s name is a human name, not a slug", !/_/.test(archName("en", dna.primary.id)));
ok("the model publishes codes only: no name or description rides on the table",
  !("label" in dna.primary) && !("blurb" in dna.primary) &&
  ARCHETYPES.every((a) => !("label" in a) && !("blurb" in a)));

// 4. THE KEY CLAIM: every seeded player stores `archetype: dna.primary.id`,
//    computed from the vector they also store. Re-deriving it must reproduce
//    the stored key exactly, or the player page would contradict the dataset.
const players = footballProvider.players();
ok("dataset has players", players.length > 0);
let mismatched = 0, withVector = 0;
for (const p of players) {
  const derived = playerDna(p.attributes);
  if (!derived) continue;
  withVector++;
  if (derived.primary.id !== p.archetype) mismatched++;
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
ok("ratings-only player: the English accessor the demo provider uses still resolves the stored id", archetypeLabelEn(lean.archetype) === "Creator");

// 7. Determinism: the same vector always yields the same DNA.
const again = computeDna(vector);
ok("deterministic primary", again.primary.id === dna.primary.id);
ok("deterministic secondary", again.secondary.id === dna.secondary.id);
ok("deterministic evolution row", JSON.stringify(again.evolution) === JSON.stringify(dna.evolution));
// Determinism has to survive the interpreter too: the same vector resolved twice is the
// same words in every locale, not the same words in one and a fallback in another.
ok("and it reads the same in every locale on re-derivation",
  locales.every((l) => say(l)(again.evolution) === say(l)(dna.evolution)));

// ---- M187: the modelled profile publishes rows, and the player page resolves them ----
{
  const { modelPlayerProfile } = await server.ssrLoadModule("/domain/scouting.ts");
  const { makeSay } = await import("./lib/rows.mjs");
  const { say, locales, DICTIONARIES } = await makeSay(server);
  const { footballProvider } = await server.ssrLoadModule("/data/footballService.ts");
  const isRow = (x) => !!x && typeof x === "object" && ("key" in x || "value" in x);
  const players = footballProvider.players();
  const measured = modelPlayerProfile(players.find((p) => (p.attributes ? Object.keys(p.attributes).length : 0) >= 8));
  const modelled = modelPlayerProfile({ ...players[0], attributes: undefined });
  ok("both branches of the profile note are rows", isRow(measured.note) && isRow(modelled.note) && measured.note.key !== modelled.note.key);
  ok("and each provenance list is rows, reusing the vector chip rather than minting a second one for it",
    measured.sources.every(isRow) && modelled.sources.every(isRow) && measured.sources[0].key === "sc.out.src.vector");
  const said = [measured.note, modelled.note, ...measured.sources, ...modelled.sources];
  // A typed string must fail a check, not throw inside the interpreter (M180's lesson).
  const leaks = said.flatMap((r) => (isRow(r) ? locales.filter((l) => { const t = say(l)(r); return !t.trim() || /\{\w+\}/.test(t) || /^(sc|det|attr)\.[a-z]/i.test(t); }) : ["not a row: " + JSON.stringify(r)]));
  ok("no profile line leaks a key or an unfilled placeholder in any locale (" + leaks.length + ")", leaks.length === 0);
  ok("the measured and modelled notes read differently in every locale",
    isRow(measured.note) && isRow(modelled.note) && locales.every((l) => say(l)(measured.note) !== say(l)(modelled.note)));
  // Check 28c cannot reach this: `note` and `sources` are also plain-string fields in
  // the player page's import graph, so the derived gate stands down by design.
  const PAGE = readFileSync("features/football/Details.tsx", "utf8");
  ok("the player page resolves the profile note and its provenance rows",
    PAGE.includes("{rowLine(profile.note, t)}") && /profile\.sources\.map\(\(s\) => rowLine\(s, t\)\)/.test(PAGE));
}

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
