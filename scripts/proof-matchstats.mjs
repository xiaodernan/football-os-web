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
const { WORLD } = await server.ssrLoadModule("/data/footballSeed.ts");
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
