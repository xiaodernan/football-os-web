import { createServer } from "vite";

// Pins domain/worldEngine.ts — the Dynamic World season simulation. Its header
// makes three load-bearing honesty claims: it is pure (never mutates WORLD), it
// is deterministic, and it only models what the data supports (no faked
// promotion/relegation between leagues). This proves those, plus the numeric
// invariants of the aging/development/market curves. Deterministic, no browser.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { runWorld, seasonLabel, marketValue, formatMarket } = await server.ssrLoadModule("/domain/worldEngine.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// --- tiny synthetic world -------------------------------------------------
const club = (id, competitionId, overall) => ({ id, name: id, short: id, competitionId, nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const pl = (id, age, overall, potential, clubId) => ({
  id, name: id, position: "CM", positionGroup: "CM", age, nation: "X", clubId, overall, potential,
  archetype: "box-to-box", value: marketValue(overall, age), foot: "R",
});
const clubs = [club("A", "T1", 70), club("B", "T1", 65), club("C", "T2", 60)];
const competitions = [
  { id: "T1", name: "League One", nation: "X", tier: 1, clubIds: ["A", "B"] },
  { id: "T2", name: "League Two", nation: "X", tier: 1, clubIds: ["C"] },
];
const base = {
  clubs,
  competitions,
  players: [
    pl("young", 19, 60, 85, "A"),   // should develop
    pl("prime", 27, 78, 80, "A"),   // near ceiling
    pl("veteran", 34, 70, 70, "B"), // declines but survives (overall >= 55)
    pl("bye", 36, 60, 60, "B"),     // 37 → retires
    pl("solo", 24, 66, 74, "C"),
  ],
};
const baseJson = JSON.stringify(base);
const clubIds = new Set(clubs.map((c) => c.id));

// --- labels & market curve ------------------------------------------------
ok("seasonLabel maps elapsed→the correct two-year label", seasonLabel(0) === "2026/27" && seasonLabel(1) === "2027/28" && seasonLabel(5) === "2031/32" && seasonLabel(3) === "2029/30");
ok("market value rises with ability at fixed age", marketValue(80, 25) > marketValue(70, 25));
ok("market value carries a youth premium at fixed ability", marketValue(75, 22) > marketValue(75, 32) && marketValue(75, 26) > marketValue(75, 35));
ok("market value is non-negative and rounded to €100k", marketValue(50, 25) > 0 && marketValue(50, 25) % 100000 === 0 && marketValue(45, 40) === 0);
ok("formatMarket renders M and B units", formatMarket(12_400_000) === "€12M" && formatMarket(1_500_000_000) === "€1.50B");

// --- seasons=0 is a faithful, copied identity -----------------------------
const zero = runWorld(base, 0);
ok("runWorld(base,0) advances no seasons and returns empty history", base.players.length > 0 && zero.seasonsElapsed === 0 && zero.history.length === 0);
ok("runWorld(base,0) returns equal-but-not-identical player copies", JSON.stringify(zero.players) === JSON.stringify(base.players) && zero.players[0] !== base.players[0]);

// --- determinism + purity -------------------------------------------------
const s3a = runWorld(base, 3);
const s3b = runWorld(base, 3);
ok("runWorld is fully deterministic across identical runs", JSON.stringify(s3a) === JSON.stringify(s3b));
ok("runWorld never mutates its input world", JSON.stringify(base) === baseJson);

ok("history has one step per elapsed season, correctly indexed", s3a.history.length === 3 && s3a.history.every((st, i) => st.index === i + 1 && st.label === seasonLabel(i + 1)));

// --- per-season bounds on every surviving / spawned player ---------------
const allPlayers = s3a.history.map((st) => st).length ? s3a.players : [];
ok("every end-state player stays inside rating bounds with potential >= overall",
  allPlayers.every((p) => p.overall >= 40 && p.overall <= 99 && p.potential >= p.overall && p.potential <= 99));
ok("every player's market value is recomputed from its live rating & age",
  allPlayers.every((p) => p.value === marketValue(p.overall, p.age)));
ok("the engine invents no clubs — every affiliation is a base club",
  clubIds.size > 0 && allPlayers.length > 0 && s3a.history.every((st) => st.champions.length > 0) &&
  allPlayers.every((p) => clubIds.has(p.clubId)) && s3a.history.every((st) => st.champions.every((c) => clubIds.has(c.clubId))));

// --- developments / declines are sign-pure and capped ---------------------
for (const st of s3a.history) {
  ok(`step ${st.index}: developments positive, declines negative, both capped`,
    st.developments.every((c) => c.delta > 0) && st.developments.length <= 8 &&
    st.declines.every((c) => c.delta < 0) && st.declines.length <= 6);
  ok(`step ${st.index}: exactly one champion per competition, points in range`,
    st.champions.length === competitions.length && st.champions.every((c) => c.points >= 30 && c.points <= 100));
  ok(`step ${st.index}: prospects are youths above their rating but below the ceiling`,
    st.prospects.every((p) => p.age >= 16 && p.age <= 18 && p.overall >= 42 && p.overall <= 74 && p.potential > p.overall && p.potential <= 92 && p.value === marketValue(p.overall, p.age)));
  ok(`step ${st.index}: avgOverall in bounds and marketTotal positive`,
    st.avgOverall >= 40 && st.avgOverall <= 99 && st.marketTotal > 0);
}

// The final step's roster *is* the returned players, so recompute its two
// aggregate figures exactly (the earlier steps' full rosters aren't retained).
const last = s3a.history[s3a.history.length - 1];
ok("final step marketTotal equals the summed player values", s3a.players.length > 0 && last.marketTotal === s3a.players.reduce((s, p) => s + p.value, 0));
ok("final step avgOverall equals the rounded mean of player ratings",
  last.avgOverall === Math.round((s3a.players.reduce((s, p) => s + p.overall, 0) / s3a.players.length) * 10) / 10);

// --- retirement is genuinely reachable and honest -------------------------
const s1 = runWorld(base, 1);
const ids = new Set(s1.players.map((p) => p.id));
const retiredStep = s1.history[0].retired;
ok("a 36-year-old crosses the age-37 line and retires in one season", retiredStep.some((r) => r.id === "bye"));
ok("the retired player is gone from the active roster, not silently kept", !ids.has("bye"));
ok("retirement carries the before/after rating for the UI", retiredStep.every((r) => typeof r.from === "number" && typeof r.to === "number" && r.age >= 35));
ok("retirement triggers youth replenishment into the vacated club (B)", s1.history[0].prospects.some((p) => p.clubId === "B"));

// --- a young high-headroom player actually grows --------------------------
const grown = s1.players.find((p) => p.id === "young");
ok("the 19-year-old prospect ages by exactly one season", grown.age === 20);
ok("the young player with headroom did not regress (delta >= 0 across season 1)", grown.overall >= 60);

// --- real dataset smoke: the app's own WORLD must be safe to run ----------
const { WORLD } = await server.ssrLoadModule("/data/footballSeed.ts");
const realBase = { players: WORLD.players, clubs: WORLD.clubs, competitions: WORLD.competitions };
const realJson = JSON.stringify(WORLD.players);
const r2a = runWorld(realBase, 2);
const r2b = runWorld(realBase, 2);
ok("real WORLD evolution is deterministic", JSON.stringify(r2a) === JSON.stringify(r2b));
ok("evolving the real dataset does not mutate WORLD.players (shared singleton)", JSON.stringify(WORLD.players) === realJson);
ok("real evolved squad stays populated and in bounds", r2a.players.length > 0 && r2a.players.every((p) => p.overall >= 40 && p.overall <= 99 && p.value === marketValue(p.overall, p.age)));

// --- the seed's own match events must reach the glass worded, never as keys ----
// M279 filled the old events seam with generated goal events, but filled the shot var
// with a DICTIONARY KEY (`sim.shot.tap_in`) instead of the raw code the code-word
// lookup expects, so every goal line in every locale read `xG 0.13 · sim.shot.tap_in`
// (measured 2502/2502 renders leaking, 834 goal events x 3 locales). M282 passes the
// code; this clause pins the rendering: each locale's shot word must equal the
// dictionary's own value for that event's code, and no line may keep an unfilled var.
const { makeSay } = await import("./lib/rows.mjs");
const { say, locales, DICTIONARIES } = await makeSay(server);
const seedGoals = WORLD.matches
  .filter((m) => m.status === "FINISHED")
  .flatMap((m) => m.events ?? [])
  .filter((e) => e.type === "GOAL" && e.detail);
ok(`every seed goal event renders the dictionary's own shot word in every locale (${seedGoals.length} goal events, floor 400, x ${locales.length} locales)`,
  seedGoals.length >= 400 &&
  seedGoals.every((e) => locales.every((l) => {
    const line = say(l)(e.detail);
    const code = String(e.detail.vars?.shot ?? "");
    return /\bxG /.test(line) && !/\{\w+\}/.test(line) &&
      line.split("\u00b7").pop()?.trim() === DICTIONARIES[l]["sim.shot." + code];
  })));
// --- the seed's match events must name real squad players, never placeholders ---
// M284: generateMatchEvents filled every event's player with template English:
// `Player ${i + 1}` for goals/shots/cards and the bare "GK" for saves, rendered
// raw by the match-details timeline (measured 14720/14720 FINISHED events
// carrying a placeholder; LIVE fixtures leak the same way). The builder now
// receives each side's squad pool and picks real names; this clause pins that
// no placeholder survives and every printed name resolves to a seeded player.
const seedEvents = WORLD.matches
  .filter((m) => m.status !== "SCHEDULED")
  .flatMap((m) => m.events ?? []);
const seedNames = new Set(WORLD.players.map((p) => p.name));
const seedPlaceholders = seedEvents.filter((e) => /^Player \d+$/.test(e.player) || e.player === "GK" || e.player === "Unknown");
ok(`every seed match event names a real squad player (${seedEvents.length} events, floor 14000)`,
  seedEvents.length >= 14000 &&
  seedPlaceholders.length === 0 &&
  seedEvents.every((e) => seedNames.has(e.player)));

// --- the recorded board must equal the timeline it sits beside (M287) ---
// M280 generated the stats pair independently of the events, so the comparison
// board contradicted the timeline on the same screen: measured 1064/1074 played
// matches with a shots mismatch and 993/1074 with an onTarget mismatch (goals
// were already pinned by proof-matchstats). The countable figures are now the
// timeline's own counts; this clause pins the reconstruction in both directions.
const statEvents = WORLD.matches.filter((m) => m.status !== "SCHEDULED" && m.stats && m.events);
const evCount = (m, type, side) => m.events.filter((e) => e.type === type && e.side === side).length;
const statMismatch = statEvents.filter((m) => ["home", "away"].some((s) =>
  m.stats[s].shots !== evCount(m, "SHOT", s) + evCount(m, "SAVE", s) + evCount(m, "GOAL", s) ||
  m.stats[s].onTarget !== evCount(m, "SAVE", s) + evCount(m, "GOAL", s) ||
  m.stats[s].yellows !== evCount(m, "YELLOW", s) ||
  m.stats[s].reds !== evCount(m, "RED", s)));
ok(`every countable board figure equals the timeline's own count (${statEvents.length} played matches, floor 1000)`,
  statEvents.length >= 1000 && statMismatch.length === 0);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
