import { createServer } from "vite";

// Pins domain/matchEngine.ts — the deterministic match simulator behind the match
// detail timeline (M101), the stat comparison rows (M92) and Simulation Lab. Its
// header makes the spec §21 claim that identical inputs + seed reproduce an
// identical result, and that it models strength/tactics rather than flat random().
// This proves determinism and the score↔timeline↔stats consistency the UI relies
// on, and guards that it can never emit the retired SUB event type (M96/M89).

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { simulateMatch } = await server.ssrLoadModule("/domain/matchEngine.ts");
// M225. The engine hands the interface rows, not sentences, so the reader's side of every
// assertion below is the row resolved the way a screen resolves it: `rowLine` for the union and
// the dictionary's own interpolator for the variables. Reading `summary[0]` as a string is what
// the old proof did, and it is what the change makes impossible — which is the point.
const { rowLine } = await server.ssrLoadModule("/domain/rowText.ts");
const { interpolate } = await server.ssrLoadModule("/i18n/format.ts");
const { DICTIONARIES } = await server.ssrLoadModule("/i18n/dictionaries.ts");
const { SHOT_TYPES } = await server.ssrLoadModule("/domain/types.ts");
const read = (row, dict) => rowLine(row, (k, vars) => interpolate(dict[k] ?? k, vars));
const en = DICTIONARIES.en;

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const team = (o = {}) => ({
  name: "Team", overall: 75, attack: 70, midfield: 72, defense: 68, possessionBias: 0.5,
  press: 0.5, tempo: 0.5, fatigue: 0.1, morale: 0.1, form: 0, ...o,
});
const LIVE_TYPES = new Set(["GOAL", "SAVE", "SHOT", "VAR", "YELLOW", "RED"]);

const home = team({ name: "Arsenal", midfield: 74, attack: 78 });
const away = team({ name: "Chelsea", midfield: 70, defense: 71 });
const input = { seed: "match-2026-09-24-ars-che", home, away, minutes: 90 };

const r = simulateMatch(input);
const r2 = simulateMatch(input);

// --- spec §21: determinism ------------------------------------------------
ok("identical input + seed reproduce a byte-identical result", JSON.stringify(r) === JSON.stringify(r2));
const alt = simulateMatch({ ...input, seed: "match-2026-09-24-ars-che-ALT" });
ok("the result carries its own seed back", r.seed === input.seed);

// --- score must equal the goal events on the timeline ---------------------
const goalEvents = (side) => r.timeline.filter((e) => e.type === "GOAL" && e.side === side).length;
ok("homeGoals equals the count of home GOAL events", r.homeGoals === goalEvents("home"));
ok("awayGoals equals the count of away GOAL events", r.awayGoals === goalEvents("away"));
ok("goals never exceed shots", r.stats.home.shots >= r.homeGoals && r.stats.away.shots >= r.awayGoals);

// --- discipline stats must equal the timeline cards -----------------------
const cardCount = (type, side) => r.timeline.filter((e) => e.type === type && e.side === side).length;
ok("home yellow/red tallies match the timeline", r.stats.home.yellows === cardCount("YELLOW", "home") && r.stats.home.reds === cardCount("RED", "home"));
ok("away yellow/red tallies match the timeline", r.stats.away.yellows === cardCount("YELLOW", "away") && r.stats.away.reds === cardCount("RED", "away"));
ok("foul counts sit in the modelled 6..14 range", r.stats.home.fouls >= 6 && r.stats.home.fouls <= 14 && r.stats.away.fouls >= 6 && r.stats.away.fouls <= 14);

// --- every event is well-formed and uses only LIVE event types ------------
ok("no event resurrects a dead type (only GOAL/SAVE/SHOT/VAR/YELLOW/RED)", r.timeline.every((e) => LIVE_TYPES.has(e.type)));
ok("every event has a legal side, a numeric minute and a player label",
  r.timeline.every((e) => (e.side === "home" || e.side === "away") && typeof e.minute === "number" && typeof e.player === "string" && e.player.length > 0));
ok("the timeline is sorted by minute ascending", r.timeline.length > 0 && r.timeline.every((e, i) => i === 0 || r.timeline[i - 1].minute <= e.minute));
ok("a VAR review is always present in the match story", r.timeline.some((e) => e.type === "VAR"));
ok("every goal carries an xG + shot-type detail row, not a sentence",
  r.timeline.filter((e) => e.type === "GOAL").every((e) => typeof e.detail === "object" && "key" in e.detail && read(e.detail, en).startsWith("xG ")));

// --- possession & derived-stat sanity -------------------------------------
ok("the two sides' possession sums to exactly 100", r.stats.home.possession + r.stats.away.possession === 100);
ok("possession stays inside the modelled 32..68 band", r.stats.home.possession >= 32 && r.stats.home.possession <= 68);
ok("xG figures are non-negative and rounded to two decimals",
  [r.stats.home.xg, r.stats.away.xg].every((v) => v >= 0 && Math.round(v * 100) / 100 === v));
ok("away pass volume respects its 120 floor", r.stats.away.passes >= 120);
ok("ratings are eleven per side and bounded 5.2..9.6",
  [r.stats.home.ratings, r.stats.away.ratings].every((rs) => rs.length === 11 && rs.every((x) => x.rating >= 5.2 && x.rating <= 9.6 && typeof x.player === "string" && x.player.length > 0)));
ok("goalscorers are boosted to the top of their side's ratings",
  r.homeGoals === 0 || r.stats.home.ratings.slice(0, r.homeGoals).every((x) => x.rating >= 6.7));

// --- the summary is the literal scoreline, not a fabrication --------------
ok("summary has three lines and opens with the exact final score",
  r.summary.length === 3 && read(r.summary[0], en) === `Arsenal ${r.homeGoals} – ${r.awayGoals} Chelsea`);
ok("summary quotes possession consistent with the stats row",
  read(r.summary[1], en).includes(`${r.stats.home.possession}% – ${r.stats.away.possession}%`));

// --- a different seed is a different match (the sim is not a constant) -----
const goalsDiffer = alt.homeGoals !== r.homeGoals || alt.timeline.length !== r.timeline.length || alt.stats.home.possession !== r.stats.home.possession;
ok("changing the seed changes the match (not a fixed script)", goalsDiffer || r.timeline.length > 0 && (read(alt.summary[0], en) !== read(r.summary[0], en)));

// --- M225: the engine's own words are rows, so no reader is handed English --------------
// The milestone's claim, and the reason it is asserted here rather than in the i18n gate: the
// match summary and the goal line used to be English the engine typed ("The midfield was finely
// balanced.", "xG 0.31 · Right-foot curl"), printed under a translated heading on two screens.
// The claim is about the READER'S reading, so it is measured on the reading: with the clubs'
// names cut out — "Arsenal" is a record value in every locale, exactly the kind of string a
// `{ value }` row legitimately holds — neither Chinese column may contain an English word of the
// engine's own. `xG` is deliberately under the three-letter bar, because the dictionary keeps it
// Latin even in Chinese (`sim.avgXg` is "平均 xG"), and so are the digits and the percent signs.
const LANGS = ["en", "zh-CN", "zh-TW"];
const stripNames = (s) => [input.home.name, input.away.name].reduce((acc, n) => acc.split(n).join(" "), s);
const readings = LANGS.map((id) => [id, r.summary.map((row) => stripNames(read(row, DICTIONARIES[id])))]);
const latinLeft = readings.slice(1).flatMap(([id, ls]) => ls.map((s, i) => [id, i, s]).filter(([, , s]) => /[A-Za-z]{3}/.test(s)));
ok(`neither Chinese summary carries an English word of the engine's own (${latinLeft.map(([id, i, s]) => `${id}#${i}: ${s.trim()}`).join(" | ") || "none"})`,
  latinLeft.length === 0 && readings[1][1].every((s) => /[\p{Script=Han}]/u.test(s) || !/[A-Za-z]{2}/.test(s)));
// The same clause, two-sided, on a planted fixture: the sentence the engine used to compose is
// refused by this exact test, and the row it composes now is not. Without the first arm a clause
// that stopped testing anything would still print "none".
const refuses = (row) => /[A-Za-z]{3}/.test(stripNames(read(row, DICTIONARIES["zh-CN"])));
ok(`and the clause refuses the sentence the engine used to write while passing the row it writes now (${refuses({ value: "The midfield was finely balanced." })} / ${refuses({ key: "sim.sum.midEven" })})`,
  refuses({ value: "The midfield was finely balanced." }) && !refuses({ key: "sim.sum.midEven" }));
// The clause above reads ONE match, and the midfield is not drawn — `mid` is the two squads'
// difference, so a fixed pairing always takes the same one of the three sentences. A mutation
// witness written against it therefore proved which branch that seed landed on and nothing more
// (a revert of the `midEven` arm slipped past it, which is how this clause was found). This one
// varies the squads across the whole spread, so all three sentences are actually read, and it
// applies the same test to every summary of every match: whether the engine picks the home line,
// the away line or the balanced one, no Chinese reader gets an English word.
const midSeen = new Set(), midBad = [];
for (let i = 0; i < 300; i++) {
  const h = team({ name: `H${i}`, midfield: 40 + ((i * 7) % 40) });
  const a = team({ name: `A${i}`, midfield: 40 + ((i * 11) % 40) });
  const s = simulateMatch({ seed: `m225-mid-${i}`, home: h, away: a, minutes: 90 });
  const strip = (x) => [h.name, a.name].reduce((acc, n) => acc.split(n).join(" "), x);
  for (const row of s.summary) {
    if (row.key && row.key.startsWith("sim.sum.mid")) midSeen.add(row.key);
    for (const id of ["zh-CN", "zh-TW"]) {
      const line = strip(read(row, DICTIONARIES[id]));
      if (/[A-Za-z]{3}/.test(line)) midBad.push(`${id}: ${line.trim()}`);
    }
  }
}
ok(`all three midfield sentences are read over a 300-match sweep of the midfield spread, and none of them carries English in either Chinese column (${midSeen.size} of 3 branches seen: ${[...midSeen].sort().join(", ")}; ${midBad.length} bad)`,
  midSeen.size === 3 && midBad.length === 0, midBad.slice(0, 3).join(" | "));
// The goal line: one row, two readings. Its shot is a CODE in the row and a word in each locale,
// because the engine's table is the model and the word is the reader's.
let goal = null;
for (let i = 0; i < 12 && !goal; i++) goal = simulateMatch({ ...input, seed: `m225-goal-${i}` }).timeline.find((e) => e.type === "GOAL") ?? null;
ok(`a seeded match really scores, so the goal line is exercised (${goal ? `${goal.minute}' ${goal.player}` : "none"})`, goal !== null);
const goalCodes = LANGS.map((id) => read(goal.detail, DICTIONARIES[id]));
ok(`the goal line reads xG plus a shot word, and the two Chinese readings name the shot in Chinese (${goalCodes.join(" | ")})`,
  /^xG \d+\.\d{2} · .+$/.test(goalCodes[0]) && goalCodes[1] !== goalCodes[0] && /[\p{Script=Han}]/u.test(goalCodes[1]) && !/[A-Za-z]{3}/.test(goalCodes[1]));
// Every declared shot type is a code the engine can really draw, so the seven rows are all
// reachable — a table entry nobody can hit would be a key no reader ever sees.
const drawn = new Set();
for (let i = 0; i < 80; i++) {
  for (const e of simulateMatch({ ...input, seed: `m225-shot-${i}` }).timeline) {
    const shot = e.detail && typeof e.detail === "object" && "vars" in e.detail ? e.detail.vars?.shot : null;
    if (typeof shot === "string") drawn.add(shot);
  }
}
ok(`the engine draws every shot type the dictionary has words for (${drawn.size}/${SHOT_TYPES.length}: ${[...drawn].sort().join(", ")})`,
  SHOT_TYPES.every((s) => drawn.has(s)) && [...drawn].every((s) => SHOT_TYPES.includes(s)));

// --- a goalless and a heavy schedule both stay consistent ------------------
for (const mins of [1, 120]) {
  const rr = simulateMatch({ ...input, seed: `edge-${mins}`, minutes: mins });
  ok(`minutes=${mins}: score still equals GOAL events and possession sums to 100`,
    rr.homeGoals === rr.timeline.filter((e) => e.type === "GOAL" && e.side === "home").length &&
    rr.awayGoals === rr.timeline.filter((e) => e.type === "GOAL" && e.side === "away").length &&
    rr.stats.home.possession + rr.stats.away.possession === 100);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
