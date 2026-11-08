import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M985: the wildest results. One pass over the finished fixtures, three banners kept — the biggest
// rout, the most explosive game and the widest draw. The tie break is the earliest kickoff, then
// the match id, so a tie can never swing on a sort somewhere else.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { records } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});

const fx = [
  // The widest rout in the dataset — margin 9, nine goals in it. Two fixtures share both tallies.
  match("f1", "T30", "W", "X", 9, 0, "2026-09-01"),
  // A 3-3 draw — six goals in it, the widest draw here.
  match("f3", "T30", "W", "Z", 3, 3, "2026-09-15"),
  // Margin 3 — the second-widest win behind f1/f4, but the tie check kicks in.
  match("f4", "T30", "Y", "X", 5, 2, "2026-09-22"),
  // Margin 3 as well — the younger fixture loses the tie against f4.
  match("f5", "T30", "X", "W", 4, 1, "2026-09-29"),
  // The other margin-9 rout, later on the calendar — f1 must keep the banner.
  match("f9", "T30", "X", "Y", 0, 9, "2026-10-20"),
  // A second six-goal draw, again later — f3 must keep the banner.
  match("f10", "T30", "X", "W", 3, 3, "2026-11-03"),
  // A 0-0 draw producing no goals, and a scheduled fixture — noise for the fold to sort through.
  match("f6", "T30", "Z", "Y", 0, 0, "2026-10-06"),
  match("f8", "T30", "W", "Y", null, null, "2026-11-17", "SCHEDULED"),
];
const board = records(fx);

ok(`the fold keeps the widest rout, the most explosive game and the widest draw (win m=${board.biggestWin.margin} by ${board.biggestWin.homeClubId}; goals ${board.highestScoring.total}; draw ${board.highestScoringDraw.total})`,
  board.matches === 7 && board.biggestWin.matchId === "f1" && board.biggestWin.margin === 9 &&
  board.highestScoring.total === 9 && board.highestScoring.matchId === "f1" &&
  board.highestScoringDraw.matchId === "f3" && board.highestScoringDraw.total === 6);
ok(`a margin tie is settled by the earlier kickoff, and matches id into line when the date repeats (rout tie f1 over f9)`,
  board.biggestWin.matchId === "f1");
ok(`a draw-goal tie is settled by the earlier kickoff (draw f3 over f10)`,
  board.highestScoringDraw.matchId === "f3");

// The empty dataset — the honest all-null read. No banners are invented.
ok(`an empty dataset reads nothing, a measured zero, and the same fixture repeats exactly`,
  (() => {
    const empty = records([]);
    return empty.biggestWin === null && empty.highestScoringDraw === null &&
      empty.highestScoring === null && empty.matches === 0 &&
      board.matches === 7 &&
      JSON.stringify(board) === JSON.stringify(records(fx));
  })());

// Seeded arm: over the shipped world, every banner outranks everything else — the margin, the total
// and the draw's total are each at least as great as any other qualifying fixture's quantity, or at
// least as great as the corresponding whole.
const clubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const seeded = records(world);
const finished = world.filter((m) => m.status === "FINISHED" && typeof m.homeGoals === "number" && typeof m.awayGoals === "number");
const biggestAnywhere = Math.max(...finished.map((m) => Math.abs(m.homeGoals - m.awayGoals)));
const totalAnywhere = Math.max(...finished.map((m) => m.homeGoals + m.awayGoals));
const drawAnywhere = Math.max(0, ...finished.filter((m) => m.homeGoals === m.awayGoals).map((m) => m.homeGoals + m.awayGoals));
ok(`over the whole world the fold names the right banner: biggest win ${seeded.biggestWin.margin} (≥ any fixture's margin), most goals ${seeded.highestScoring.total} (≥ any fixture's total), biggest draw ${seeded.highestScoringDraw.total} (= ${drawAnywhere} goals long)`,
  seeded.biggestWin.margin === biggestAnywhere &&
  seeded.highestScoring.total === totalAnywhere &&
  (seeded.highestScoringDraw === null ? drawAnywhere === 0 : seeded.highestScoringDraw.total === drawAnywhere) &&
  seeded.matches === finished.length);

// The screen is a reader: it renders the folded banners and nothing else derives them.
const SCREEN_SRC = readFileSync(resolve(root, "features/leaders/LeagueLeaders.tsx"), "utf8");
ok(`the leaders screen renders the fold and its own board (fold call ${SCREEN_SRC.includes("records(footballProvider.matches())")}, tiles ${SCREEN_SRC.includes("leaders.recordsWin")}/${SCREEN_SRC.includes("leaders.recordsDraw")}/${SCREEN_SRC.includes("leaders.recordsGoals")})`,
  SCREEN_SRC.includes("records(footballProvider.matches())") &&
  SCREEN_SRC.includes("leaders.recordsTitle") && SCREEN_SRC.includes("leaders.recordsHint") &&
  SCREEN_SRC.includes("leaders.recordsWin") && SCREEN_SRC.includes("leaders.recordsGoals") &&
  SCREEN_SRC.includes("leaders.recordsDraw") && SCREEN_SRC.includes("leaders.recordsMethod") &&
  SCREEN_SRC.includes("leaders.recordsNone"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
