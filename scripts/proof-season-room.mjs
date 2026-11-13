import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1080: the Season Command Room — one fold a screen's worth of season verdicts, and the proof
// charges the same T-numbered fixture discipline as every fold this repo carries.
//
// The fixture world is a small hand-counted table: three clubs in one cup, three finished
// matches, each club's 3-1-0 position countable by child arithmetic. The full world is then read
// two ways — (a) through the doors the fold itself uses (customPointsTable/clubFinance), and
// (b) from a plain-loops recount that shares no door with the fold at all — and the two must
// agree on every ledger row of all 15 seed competitions.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const SR = await server.ssrLoadModule("/domain/seasonRoom.ts");
const LEAGUE = await server.ssrLoadModule("/domain/league.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");
const { seasonSituation } = SR;
const { customPointsTable, STANDARD_RULES, TWO_ONE_ZERO_RULES, ALL_OR_NOTHING_RULES } = LEAGUE;

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// ─── fixture world ──────────────────────────────────────────────────────────────────
const club = (id, overall) => ({ id, name: id, short: id, competitionId: "T61", nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const player = (id, clubId, value) => ({ id, name: id, position: "ST", positionGroup: "ATT", age: 25, nation: "X", clubId, overall: 80, potential: 85, archetype: "Striker", value, foot: "LEFT" });
const match = (id, home, away, hg, ag, status = "FINISHED") => ({
  id, competitionId: "T61", homeClubId: home, awayClubId: away, kickoff: "2026-09-01", round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});
const T61 = { id: "T61", name: "Cup", short: "CUP", nation: "X", kind: "league", emblem: "", clubs: ["A", "B", "C"] };
const T62_EMPTY = { ...T61, id: "T62", name: "Empty Cup", short: "EMP" };
const clubs = [club("A", 80), club("B", 70), club("C", 60)];
const players = [player("p1", "A", 100_000_000), player("p2", "A", 300_000_000), player("p3", "B", 200_000_000), player("p4", "C", 150_000_000)];
const fixtures = [match("f1", "A", "B", 2, 0), match("f2", "B", "C", 1, 1), match("f3", "C", "A", 2, 1)];

const sit = seasonSituation(fixtures, players, clubs, [T61, T62_EMPTY]);

// ─── 1 · hand counts in the fixture world ───────────────────────────────────────────
ok(`the T61 table reads exactly what the hand counts say (leader C 4, runner A 3, gap 1, 3 of 3 fixtures replayed)`,
  sit.standings.length === 1 && sit.standings[0].compId === "T61" &&
  sit.standings[0].leaderName === "C" && sit.standings[0].leaderPoints === 4 &&
  sit.standings[0].runnerUpName === "A" && sit.standings[0].runnerUpPoints === 3 &&
  sit.standings[0].gap === 1 && sit.standings[0].playedFixtures === 3 && sit.standings[0].totalFixtures === 3);
ok(`a competition with zero played fixtures is skipped honestly, not printed with null points`,
  sit.standings.every((r) => r.compId !== "T62") && sit.twoOneZero.every((r) => r.compId !== "T62") && sit.allOrNothing.every((r) => r.compId !== "T62"));

// ─── 2 · the alternate rulers in the fixture ────────────────────────────────────────
const two = sit.twoOneZero.find((r) => r.compId === "T61");
const all = sit.allOrNothing.find((r) => r.compId === "T61");
// T61 re-read: all-or-nothing erases #f2's draw — A and C finish 3-3 on points, GD 0-0, GF 3-3,
// resolved by clubId: A first. C remains the 3-1-0 leader, so the crown genuinely flips.
ok(`two-one-zero changes the arithmetic, not the table (ruler C, 3 pts, no flip)`,
  two && two.rulerName === "C" && two.rulerPoints === 3 && two.sameAsStandard === true && two.sway === 0 &&
  two.standardLeaderName === "C");
ok(`all-or-nothing flips the crown on the clubId tie-break (ruler A, 3 pts, std C, sway 1)`,
  all && all.rulerName === "A" && all.rulerPoints === 3 && all.sameAsStandard === false &&
  all.standardLeaderName === "C" && all.sway === 1);

// ─── 2b · the drop-zone watch in the fixture ───────────────────────────────────────
// T61: three clubs, same fixtures as above (C 4 pts, A 3, B 1); positions C1 A2 B3.
// With nothing above the drop zone, offSafety is 0 for everyone — never a lie — and every
// club is in the bottom three by construction.
const watch = sit.bottomThree.find((r) => r.compId === "T61");
ok(`the watch names the fixture world's bottom three, deepest trouble first (B pos 3, A pos 2, C pos 1)`,
  watch && watch.clubs.map((c) => c.clubId).join(",") === "B,A,C" &&
  watch.clubs.map((c) => c.rulesPosition).join(",") === "3,2,1" &&
  watch.clubs.every((c) => c.offSafety === 0) && watch.clubs.every((c) => c.insolvent === true));
ok(`a competition with zero played fixtures is skipped by the watch too`,
  sit.bottomThree.every((r) => r.compId !== "T62"));

// ─── 3 · the financial verdict in the fixture ──────────────────────────────────────
const prof = sit.profitableFive, loss = sit.insolventFive;
ok(`the five-ledger arm takes every fixture club into the right half and orders strictly`,
  prof.length === 3 && loss.length === 3 &&
  prof.map((r) => r.clubId).join(",") === "A,B,C" && loss.map((r) => r.clubId).join(",") === "C,B,A" &&
  prof.map((r) => r.net).reduce((acc, v, i, arr) => acc && (i === 0 || arr[i - 1] >= v), true) &&
  loss.map((r) => r.net).reduce((acc, v, i, arr) => acc && (i === 0 || arr[i - 1] <= v), true));

// ─── 4 · determinism, even with an empty world ─────────────────────────────────────
const repeat = seasonSituation(fixtures, players, clubs, [T61]);
ok(`two reads of the same world produce byte-identical output`,
  JSON.stringify(sit.standings) === JSON.stringify(repeat.standings) &&
  JSON.stringify(sit.twoOneZero) === JSON.stringify(repeat.twoOneZero) &&
  JSON.stringify(sit.allOrNothing) === JSON.stringify(repeat.allOrNothing) &&
  JSON.stringify(sit.profitableFive) === JSON.stringify(repeat.profitableFive) &&
  JSON.stringify(sit.bottomThree) === JSON.stringify(repeat.bottomThree));
const empty = seasonSituation([], [], [], []);
ok(`an empty world reports empty, never invents, and repeats exactly`,
  empty.standings.length === 0 && empty.twoOneZero.length === 0 && empty.allOrNothing.length === 0 &&
  empty.profitableFive.length === 0 && empty.insolventFive.length === 0 && empty.bottomThree.length === 0 &&
  JSON.stringify(empty) === JSON.stringify(seasonSituation([], [], [], [])));

// ─── 5 · the §-door parity in the shipped world ─────────────────────────────────────
const seededMatches = SVC.footballProvider.matches();
const seededPlayers = SVC.footballProvider.players();
const seededClubs = SVC.footballProvider.clubs();
const seededComps = SVC.footballProvider.competitions();
const world = seasonSituation(seededMatches, seededPlayers, seededClubs, seededComps);
let parity = true;
for (const s of world.standings) {
  const t = customPointsTable(s.compId, [...seededMatches], [...seededClubs], STANDARD_RULES);
  const lead = t.rows.find((r) => r.rulesPosition === 1);
  const runner = t.rows.find((r) => r.rulesPosition === 2);
  if (!lead || !runner) { parity = false; continue; }
  const total = seededMatches.filter((m) => m.competitionId === s.compId).length;
  if (s.leaderPoints !== lead.rulesPoints || s.runnerUpPoints !== runner.rulesPoints ||
      s.gap !== lead.rulesPoints - runner.rulesPoints ||
      s.playedFixtures !== t.matches || s.totalFixtures !== total) parity = false;
}
ok(`all ${world.standings.length} seeded tables close against the door they came from`, parity);
for (const fam of ["twoOneZero", "allOrNothing"]) {
  const rules = fam === "twoOneZero" ? TWO_ONE_ZERO_RULES : ALL_OR_NOTHING_RULES;
  let famOk = true;
  for (const r of world[fam]) {
    const t = customPointsTable(r.compId, [...seededMatches], [...seededClubs], rules);
    const lead = t.rows.find((x) => x.rulesPosition === 1);
    if (!lead || lead.clubId !== r.rulerId) famOk = false;
    if (lead && lead.rulesPoints !== r.rulerPoints) famOk = false;
  }
  ok(`the ${fam} arm agrees with its own leg of the triplet (leader and points both)`, famOk);
}
// The drop-zone watch, closed against the same table it was read from: the bottom three by
// rulesPosition descending, offSafety = first-safe-club's points − this club's points (0 for
// tables shorter than four), and insolvent == membership of the five least solvent books.
let watchOk = true;
for (const w of world.bottomThree) {
  const t = customPointsTable(w.compId, [...seededMatches], [...seededClubs], STANDARD_RULES);
  const bottomByRules = [...t.rows].sort((a, b) => b.rulesPosition - a.rulesPosition).slice(0, 3);
  if (w.clubs.map((c) => c.clubId).join(",") !== bottomByRules.map((r) => r.clubId).join(",")) watchOk = false;
  for (const [i, crumb] of w.clubs.entries()) {
    const r = bottomByRules[i];
    if (r.clubId !== crumb.clubId || r.rulesPosition !== crumb.rulesPosition) watchOk = false;
    if (r.rulesPoints !== crumb.points || r.played !== crumb.played) watchOk = false;
    const safeRow = t.rows.length > 3 ? t.rows.find((x) => x.rulesPosition === t.rows.length - 3) : undefined;
    if (crumb.offSafety !== (safeRow ? safeRow.rulesPoints - r.rulesPoints : 0)) watchOk = false;
    const insolventSet = new Set(world.insolventFive.map((v) => v.clubId));
    if (crumb.insolvent !== insolventSet.has(crumb.clubId)) watchOk = false;
  }
}
ok(`the drop-zone watch closes on all ${world.bottomThree.length} seeded tables (order, positions, points, offSafety, insolvent flags)`, watchOk);
const plWatch = world.bottomThree.find((w) => w.compId === "pl");
ok(`the Premier League's watch names West Ham, Tottenham, Aston Villa with 14 / 3 / 2 points to safety`,
  plWatch && plWatch.clubs.map((c) => c.clubId).join(",") === "whu,tot,avl" &&
  plWatch.clubs.map((c) => c.points).join(",") === "5,16,17" &&
  plWatch.clubs.map((c) => c.offSafety).join(",") === "14,3,2");

// ─── 6 · independent recount: no doors, plain loops, same answers ───────────────────
let matched = true, ordered = true, complete = true;
for (const comp of seededComps) {
  const fin = seededMatches.filter((m) => m.competitionId === comp.id && m.status === "FINISHED" && m.homeGoals != null && m.awayGoals != null);
  const acc = new Map();
  for (const m of fin) {
    for (const side of [m.homeClubId, m.awayClubId]) {
      const ours = side === m.homeClubId ? m.homeGoals : m.awayGoals;
      const theirs = side === m.homeClubId ? m.awayGoals : m.homeGoals;
      const cur = acc.get(side) ?? { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
      cur.played++; cur.gf += ours; cur.ga += theirs;
      if (ours > theirs) cur.won++; else if (ours === theirs) cur.drawn++; else cur.lost++;
      acc.set(side, cur);
    }
  }
  const row = world.standings.find((s) => s.compId === comp.id);
  if (acc.size === 0) {
    if (row !== undefined) complete = false; // nothing played; the fold must print no card
    continue;
  }
  if (!row) { complete = false; continue; }
  const lead = [...acc.entries()].map(([clubId, s]) => ({ clubId, pts: s.won * 3 + s.drawn })).sort((a, b) => b.pts - a.pts)[0];
  const sumOfPlayed = [...acc.values()].reduce((n, s) => n + s.played, 0);
  if (row.leaderPoints !== lead.pts) matched = false;
  if (row.playedFixtures * 2 !== sumOfPlayed) matched = false;
}
for (let i = 1; i < world.standings.length; i++) if (world.standings[i - 1].leaderPoints < world.standings[i].leaderPoints) ordered = false;
ok(`the shipped tables survive a doorless recount (points match, fixtures counted, order nonincreasing)`, matched && ordered && complete);

// ─── 7 · the world's order and its flips, measured ─────────────────────────────────
ok(`the frozen world orders its competitions by champion's points, descending (ucl 100 …)`,
  world.standings.map((s) => s.compId).join(",") ===
  "ucl,bundes,seriea,uel,pl,liga,ligue1,libertadores,brasileirao,jleague,mls,liga1,superlig,spl,eredivisie" &&
  world.standings[0].leaderPoints === 100);
const flipsTwo = world.twoOneZero.filter((r) => !r.sameAsStandard).map((r) => `${r.compId}->${r.rulerName}`);
const flipsAll = world.allOrNothing.filter((r) => !r.sameAsStandard).map((r) => `${r.compId}->${r.rulerName}`);
ok(`the two historic triplets genuinely flip the league crowns on the frozen world`,
  flipsTwo.join("|") === "ligue1->AS Monaco|mls->Seattle Sounders" &&
  flipsAll.join("|") === "liga->Real Madrid|superlig->Beşiktaş" &&
  flipsTwo.every((f) => world.twoOneZero.find((r) => `${r.compId}->${r.rulerName}` === f).sway === 1) &&
  flipsAll.every((f) => world.allOrNothing.find((r) => `${r.compId}->${r.rulerName}` === f).sway === 1));
ok(`the profitable and solvent-drain halves are disjoint and sorted on the shipped world`,
  world.profitableFive.length === 5 && world.insolventFive.length === 5 &&
  new Set([...world.profitableFive.map((r) => r.clubId), ...world.insolventFive.map((r) => r.clubId)]).size === 10 &&
  world.profitableFive.map((r) => r.net).reduce((a, v, i, arr) => a && (i === 0 || arr[i - 1] >= v), true) &&
  world.insolventFive.map((r) => r.net).reduce((a, v, i, arr) => a && (i === 0 || arr[i - 1] <= v), true));
const narrowSix = world.standings.filter((r) => r.gap > 0 && r.gap <= 3).length;
ok(`exactly six competitions carry a live title race within three points (the Closets crowns panel population)`,
  narrowSix === 6);

// ─── 8 · screen wiring, dictionary, route and nav ──────────────────────────────────
const screen = readFileSync(resolve(root, "features/seasonroom/SeasonRoom.tsx"), "utf8");
ok(`the screen renders the fold and reads money through the shared doors only`,
  screen.includes("seasonSituation(") && screen.includes("rules.swingTwo") && screen.includes("rules.swingAll") &&
  screen.includes("fin.netPlus") && screen.includes("fin.netMinus") && screen.includes("srs.fixtureShare") &&
  screen.includes("srs.stdLeaderTag") && screen.includes("srs.pointsShort") && screen.includes("srs.closest") &&
  screen.includes("srs.closestHint") && screen.includes("srs.relegateTitle") && screen.includes("srs.relegateHint") &&
  screen.includes("srs.relegateGap") && screen.includes("srs.relegateInsolvent") &&
  !screen.includes("srs.allOrNothing") && !screen.includes("srs.columnSway"));
const app = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const shell = readFileSync(resolve(root, "features/shell/AppShell.tsx"), "utf8");
const dicts = readFileSync(resolve(root, "i18n/dictionaries.ts"), "utf8");
const locales = ["srs.title", "srs.fixtureShare", "srs.stdLeaderTag", "srs.pointsShort", "srs.champs", "srs.alt", "srs.closest", "srs.relegateTitle", "srs.relegateHint", "srs.relegateGap", "srs.relegateInsolvent"];
ok(`the fold's keys resolve in all three locales, the route and the nav both name the screen`,
  app.includes('path === "/season-room"') && shell.includes('to: "/season-room"') &&
  locales.every((k) => 3 === (dicts.match(new RegExp(`"${k.replace(".", "\\.")}":`, "g")) || []).length));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
