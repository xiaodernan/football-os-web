// M283. M280 shipped the seed's per-match statistics (`Match.stats`) and M281 gave
// them a reader, but the contract itself had no runnable witness — this file is it.
// It pins four facts about every fixture the demo world ships: a played match always
// carries both a stats pair and an event timeline while a scheduled one carries
// neither; the stats pair obeys its own arithmetic (possession halves to 100, shots
// bound shots on target); the timeline agrees with the scoreline it illustrates
// (goal events per side equal the recorded goals, minutes ascending); and a goal's
// shot var is the RAW code the code-word lookup dispatches on, never a composed
// dictionary key — the M279/M282 defect spelled from the data side, so a regression
// cannot hide behind the rendering gate alone.
// Run: node scripts/proof-matchstats.mjs
import { createServer } from "vite";
import { readFileSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { DEMO_NOW, WORLD } = await server.ssrLoadModule("/data/footballSeed.ts");
const { SHOT_TYPES } = await server.ssrLoadModule("/domain/types.ts");
const { DICTIONARIES, LOCALES } = await server.ssrLoadModule("/i18n/dictionaries.ts");

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? "  — " + String(detail).slice(0, 160) : "")); }
};

const matches = WORLD.matches;
const played = matches.filter((m) => m.status === "FINISHED");
const scheduled = matches.filter((m) => m.status === "SCHEDULED");

ok(`the population is real (played ${played.length} >= 200, scheduled ${scheduled.length} >= 20)`,
  played.length >= 200 && scheduled.length >= 20);
ok("every played match carries both stats and events; every scheduled one carries neither",
  played.every((m) => !!m.stats && !!m.events && m.events.length > 0) &&
  scheduled.every((m) => !m.stats && !(m.events && m.events.length)));

// M288. LIVE is a recorded state, not a blank one: the seed writes the same
// stats-and-events pair for a fixture in play (the M286/M287 gates already count
// it), so the same contract and the same arithmetic bind at status LIVE —
// measured with a floor, not assumed from the generator's shared code path.
const live = matches.filter((m) => m.status === "LIVE");
ok(`every LIVE fixture carries the same recorded pair under the same arithmetic (${live.length} live, floor 10)`,
  live.length >= 10 &&
  live.every((m) => !!m.stats && !!m.events && m.events.length > 0) &&
  live.every((m) => m.stats.home.possession + m.stats.away.possession === 100 &&
    m.stats.home.onTarget <= m.stats.home.shots && m.stats.away.onTarget <= m.stats.away.shots &&
    m.events.filter((e) => e.type === "GOAL" && e.side === "home").length === m.homeGoals &&
    m.events.filter((e) => e.type === "GOAL" && e.side === "away").length === m.awayGoals &&
    m.events.every((e, i) => i === 0 || m.events[i - 1].minute <= e.minute)));

// M289. The dashboard's "Today's Matches" panel filtered the world's fixtures by
// the reader's wall clock: measured 2026-10-06, the reader's ±2d window held 88
// scheduled fixtures against the world anchor's 45, the population drifted every
// real day, and past 2026-10-16 the panel would sit empty forever beside a hint
// promising the demo world. The filter now runs on the world's one clock
// (DEMO_NOW) — closing the alias site M214 queued — and the census pins both
// ends: the window is a real population, and neither the screen nor the service
// parses a kickoff beside a clock read.
const { todayMatches } = await server.ssrLoadModule("/data/footballService.ts");
const worldToday = todayMatches(5000);
ok(`the world's own today window is a real population (${worldToday.length} scheduled fixtures within DEMO_NOW ± 2d, floor 20)`,
  worldToday.length >= 20 &&
  worldToday.every((m) => m.status === "SCHEDULED" &&
    Math.abs(new Date(m.kickoff).getTime() - new Date(DEMO_NOW).getTime()) < 2 * 86400000));
const dashSrc = readFileSync(new URL("../features/dashboard/Dashboard.tsx", import.meta.url), "utf8");
const serviceSrc = readFileSync(new URL("../data/footballService.ts", import.meta.url), "utf8");
const clockBesideKickoff = (src) => /Date\.now\(\)[\s\S]{0,120}kickoff|kickoff[\s\S]{0,120}Date\.now\(\)/.test(src);
ok(`the today panel selects by the world's clock, not the reader's: the screen calls the service helper and neither file parses a kickoff beside Date.now() (the alias site M214 queued, now closed)`,
  dashSrc.includes("todayMatches(") && !clockBesideKickoff(dashSrc) && !clockBesideKickoff(serviceSrc));

const STATS_FIELDS = ["possession", "shots", "onTarget", "xg", "passes", "passAcc", "tackles", "duels", "corners", "fouls", "yellows", "reds"].sort();
const shapeOk = played.every((m) =>
  JSON.stringify(Object.keys(m.stats.home).sort()) === JSON.stringify(STATS_FIELDS) &&
  JSON.stringify(Object.keys(m.stats.away).sort()) === JSON.stringify(STATS_FIELDS));
ok("each side's stats carry exactly the 12 declared MatchStats fields (no duelsWon drift)", shapeOk,
  JSON.stringify(played.find((m) => JSON.stringify(Object.keys(m.stats?.home ?? {}).sort()) !== JSON.stringify(STATS_FIELDS))?.stats?.home ?? ""));

ok("possession halves sum to 100 on every played match",
  played.every((m) => m.stats.home.possession + m.stats.away.possession === 100));
ok("shots on target never exceed shots, for every side",
  played.every((m) => m.stats.home.onTarget <= m.stats.home.shots && m.stats.away.onTarget <= m.stats.away.shots));
ok("every stats number is a finite non-negative value",
  played.every((m) => [...Object.values(m.stats.home), ...Object.values(m.stats.away)].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)));

ok("home goal events equal the recorded home goals, per match",
  played.every((m) => m.events.filter((e) => e.type === "GOAL" && e.side === "home").length === m.homeGoals));
ok("away goal events equal the recorded away goals, per match",
  played.every((m) => m.events.filter((e) => e.type === "GOAL" && e.side === "away").length === m.awayGoals));
ok("every match's timeline is ascending by minute",
  played.every((m) => m.events.every((e, i) => i === 0 || m.events[i - 1].minute <= e.minute)));

const goals = played.flatMap((m) => m.events.filter((e) => e.type === "GOAL" && e.detail));
ok(`every goal event's shot var is a raw SHOT_TYPES code (${goals.length} goals)`,
  goals.length >= 400 &&
  goals.every((e) => SHOT_TYPES.includes(e.detail.vars?.shot) && !String(e.detail.vars?.shot).includes(".")));
ok("every goal detail row is the sim.ev.goal row with an xg var",
  goals.every((e) => e.detail.key === "sim.ev.goal" && typeof e.detail.vars?.xg === "string"));

// M284. Every field the seed writes must have a reader: the label census binds the
// comparison table's own literal (the consumer side), the dictionary census binds all
// three locales (the display side). Both ends of the same wire, neither trusted alone.
const detailsSrc = readFileSync(new URL("../features/football/Details.tsx", import.meta.url), "utf8");
const unwired = STATS_FIELDS.filter((f) => !detailsSrc.includes(`"ms.${f}"`));
ok(`every declared MatchStats field is wired to its ms.* label in the comparison table (${STATS_FIELDS.length} fields)`,
  unwired.length === 0, "not wired: " + unwired.join(", "));
const missingKeys = STATS_FIELDS.flatMap((f) =>
  LOCALES.filter((l) => !String(DICTIONARIES[l.id][`ms.${f}`] ?? "").length).map((l) => `${l.id}:ms.${f}`));
ok(`every field's ms.* label key resolves in all ${LOCALES.length} locales (${STATS_FIELDS.length * LOCALES.length} lookups)`,
  missingKeys.length === 0, missingKeys.join(", "));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
