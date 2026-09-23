import { createServer } from "vite";

// Pins domain/matchEngine.ts — the deterministic match simulator behind the match
// detail timeline (M101), the stat comparison rows (M92) and Simulation Lab. Its
// header makes the spec §21 claim that identical inputs + seed reproduce an
// identical result, and that it models strength/tactics rather than flat random().
// This proves determinism and the score↔timeline↔stats consistency the UI relies
// on, and guards that it can never emit the retired SUB event type (M96/M89).

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { simulateMatch } = await server.ssrLoadModule("/domain/matchEngine.ts");

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
ok("the timeline is sorted by minute ascending", r.timeline.every((e, i) => i === 0 || r.timeline[i - 1].minute <= e.minute));
ok("a VAR review is always present in the match story", r.timeline.some((e) => e.type === "VAR"));
ok("every goal carries an xG + shot-type detail line", r.timeline.filter((e) => e.type === "GOAL").every((e) => typeof e.detail === "string" && e.detail.startsWith("xG ")));

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
  r.summary.length === 3 && r.summary[0] === `Arsenal ${r.homeGoals} – ${r.awayGoals} Chelsea`);
ok("summary quotes possession consistent with the stats row",
  r.summary[1].includes(`${r.stats.home.possession}% – ${r.stats.away.possession}%`));

// --- a different seed is a different match (the sim is not a constant) -----
const goalsDiffer = alt.homeGoals !== r.homeGoals || alt.timeline.length !== r.timeline.length || alt.stats.home.possession !== r.stats.home.possession;
ok("changing the seed changes the match (not a fixed script)", goalsDiffer || alt.summary[0] !== r.summary[0]);

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
