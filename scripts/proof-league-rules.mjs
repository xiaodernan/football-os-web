import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1023: the league table, under different rules — the fold that resurrects the drafted
// LeagueManager content as a seed-scale thought experiment: the same fixtures refolded under
// the win/draw/loss triplet the reader asks for.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { customPointsTable, STANDARD_RULES, TWO_ONE_ZERO_RULES, ALL_OR_NOTHING_RULES } = await server.ssrLoadModule("/domain/league.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, overall) => ({ id, name: id, short: id, competitionId: "T61", nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, home, away, hg, ag, status = "FINISHED") => ({
  id, competitionId: "T61", homeClubId: home, awayClubId: away, kickoff: "2026-09-01", round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});

const clubs = [club("A", 80), club("B", 70), club("C", 60), club("D", 50)];
const matches = [
  match("f1", "A", "B", 2, 0),
  match("f2", "B", "C", 1, 1),
  match("f3", "C", "A", 2, 1),
];

const std = customPointsTable("T61", matches, clubs, STANDARD_RULES);
const stdRow = Object.fromEntries(std.rows.map((r) => [r.clubId, r]));

ok(`the standard triplet hand-counts (${std.rows.map((r) => `${r.clubId}:${r.rulesPoints}`).join(" ")})`,
  std.rows.length === 3 && stdRow.D === undefined &&
  stdRow.C.rulesPoints === 4 && stdRow.A.rulesPoints === 3 && stdRow.B.rulesPoints === 1 &&
  stdRow.C.won === 1 && stdRow.C.drawn === 1 && stdRow.C.lost === 0 &&
  stdRow.A.gf === 3 && stdRow.A.ga === 2 && stdRow.B.ga === 3 &&
  std.rows.map((r) => r.clubId).join(",") === "C,A,B" && std.matches === 3);
ok(`ties are the same three times over — points, goal difference, goals for (${std.rows.map((r) => `${r.clubId}:${r.rulesPosition}/${r.shift}/${r.sway}`).join(" ")})`,
  stdRow.C.standardPosition === 1 && stdRow.A.standardPosition === 2 && stdRow.B.standardPosition === 3 &&
  stdRow.C.shift === 0 && stdRow.A.shift === 0 && stdRow.B.shift === 0 &&
  stdRow.C.sway === 0 && stdRow.A.sway === 0 && stdRow.B.sway === 0);

const all = customPointsTable("T61", matches, clubs, ALL_OR_NOTHING_RULES);
const allRow = Object.fromEntries(all.rows.map((r) => [r.clubId, r]));
ok(`all-or-nothing sees the draws vanish (${all.rows.map((r) => `${r.clubId}:${r.rulesPoints}`).join(" ")})`,
  allRow.A.rulesPoints === 3 && allRow.B.rulesPoints === 0 && allRow.C.rulesPoints === 3);
ok(`all-or-nothing flips the top of the table on a clubId tie (${all.rows.map((r) => `${r.clubId}:${r.rulesPosition} (sway ${r.sway})`).join(" ")})`,
  all.rows.map((r) => r.clubId).join(",") === "A,C,B" &&
  allRow.A.sway === 1 && allRow.A.shift === 0 && allRow.C.sway === -1 && allRow.C.shift === -1 &&
  allRow.B.sway === 0 && allRow.B.shift === -1);

const two = customPointsTable("T61", matches, clubs, TWO_ONE_ZERO_RULES);
const twoRow = Object.fromEntries(two.rows.map((r) => [r.clubId, r]));
ok(`two-one-zero changes the points and not the order (${two.rows.map((r) => `${r.clubId}:${r.rulesPoints}`).join(" ")})`,
  two.rows.map((r) => r.clubId).join(",") === "C,A,B" &&
  twoRow.C.rulesPoints === 3 && twoRow.A.rulesPoints === 2 && twoRow.B.rulesPoints === 1 &&
  twoRow.C.sway === 0 && twoRow.A.sway === 0 && twoRow.B.sway === 0 &&
  twoRow.A.shift === -1 && twoRow.C.shift === -1 && twoRow.B.shift === 0);

ok(`an empty world reads no rows, a measured zero, and the same fold repeats exactly`,
  customPointsTable("T61", [], clubs, STANDARD_RULES).rows.length === 0 &&
  customPointsTable("T61", [], clubs, STANDARD_RULES).matches === 0 &&
  JSON.stringify(std) === JSON.stringify(customPointsTable("T61", matches, clubs, STANDARD_RULES)));

// Seeded arm: over every seeded competition the fold closes against an independent recount —
// a second reader of the same fixtures, written with plain loops and no doors, reproduces the
// row set, the per-club ledger and the ordering.
const seededClubs = SVC.footballProvider.clubs();
const seededMatches = SVC.footballProvider.matches();
const seededComps = SVC.footballProvider.competitions();
let matched = true, ordered = true, complete = true;
for (const comp of seededComps) {
  const fin = seededMatches.filter((m) => m.competitionId === comp.id && m.status === "FINISHED" && m.homeGoals != null && m.awayGoals != null);
  const my = customPointsTable(comp.id, seededMatches, seededClubs, STANDARD_RULES);
  const acc = new Map();
  for (const m of fin) {
    for (const side of [m.homeClubId, m.awayClubId]) {
      const ours = side === m.homeClubId ? m.homeGoals : m.awayGoals;
      const theirs = side === m.homeClubId ? m.awayGoals : m.homeGoals;
      const cur = acc.get(side) ?? { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
      cur.played++; cur.gf += ours; cur.ga += theirs;
      if (ours > theirs) cur.won++;
      else if (ours === theirs) cur.drawn++;
      else cur.lost++;
      acc.set(side, cur);
    }
  }
  if (my.matches !== fin.length) complete = false;
  const scen = new Map(my.rows.map((r) => [r.clubId, r]));
  if (scen.size !== acc.size || acc.size !== my.rows.length) complete = false;
  for (const [clubId, s] of acc) {
    const r = scen.get(clubId);
    if (!r) { matched = false; continue; }
    const wantPoints = s.won * STANDARD_RULES.win + s.drawn * STANDARD_RULES.draw + s.lost * STANDARD_RULES.loss;
    if (r.played !== s.played || r.won !== s.won || r.drawn !== s.drawn || r.lost !== s.lost ||
        r.gf !== s.gf || r.ga !== s.ga || r.rulesPoints !== wantPoints) matched = false;
  }
  for (let i = 1; i < my.rows.length; i++) if (my.rows[i - 1].rulesPoints < my.rows[i].rulesPoints) ordered = false;
}
ok(`over all ${seededComps.length} seeded competitions the fold closes against an independent recount (order holds ${ordered}, ledgers match ${matched}, fixtures counted ${complete})`,
  seededComps.length === 15 && matched && ordered && complete);

// The screen is a reader: it renders the folded board and nothing else counts.
const SCREEN_SRC = readFileSync(resolve(root, "features/league/LeagueRules.tsx"), "utf8");
ok(`the rules screen renders the fold and its own board (fold call ${SCREEN_SRC.includes("customPointsTable(compId, matches, clubs, rules)")}, rows ${SCREEN_SRC.includes("board.rows.map")}, keys ${SCREEN_SRC.includes("rules.title")}/${SCREEN_SRC.includes("rules.method")})`,
  SCREEN_SRC.includes("customPointsTable(compId, matches, clubs, rules)") &&
  SCREEN_SRC.includes("board.rows.map") && SCREEN_SRC.includes("board.matches") &&
  SCREEN_SRC.includes("STANDARD_RULES") && SCREEN_SRC.includes("TWO_ONE_ZERO_RULES") && SCREEN_SRC.includes("ALL_OR_NOTHING_RULES") &&
  SCREEN_SRC.includes("rules.title") && SCREEN_SRC.includes("rules.subtitle") && SCREEN_SRC.includes("rules.boardTitle") &&
  SCREEN_SRC.includes("rules.boardHint") && SCREEN_SRC.includes("rules.colGA") && SCREEN_SRC.includes("rules.colShift") &&
  SCREEN_SRC.includes("rules.colSway") && SCREEN_SRC.includes("rules.stdLine") && SCREEN_SRC.includes("rules.none") &&
  SCREEN_SRC.includes("rules.noneHint") && SCREEN_SRC.includes("rules.method") &&
  SCREEN_SRC.includes("fw.table.p") && SCREEN_SRC.includes("mgr.wdl") && SCREEN_SRC.includes("form.colPoints") &&
  SCREEN_SRC.includes("common.club") && SCREEN_SRC.includes("player.valueBoard.colRank"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
