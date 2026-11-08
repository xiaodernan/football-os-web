import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M991: the wildest away wins. The seed's rating order holds until it doesn't — one upset belongs
// to every data set, and the fold finds it without being told where to look.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { worldUpsets } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId, overall) => ({ id, name: id, short: id, competitionId, nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});

const clubs = [
  club("STRONG", "T37", 88), club("WEAK", "T37", 60),
  club("MIDHIGH", "T37", 75), club("MIDLOW", "T37", 68),
  club("GIANT", "T37", 92), club("SMALL", "T37", 55),
];
const fx = [
  // The flagship upset: away side 33 OVR weaker, still 5-1.
  match("f1", "T37", "GIANT", "SMALL", 1, 5, "2026-09-01"),
  // The widest away win by scoreline. smaller deficit but a 4-0 rout.
  match("f2", "T37", "STRONG", "WEAK", 0, 4, "2026-09-08"),
  // A big away win with the tie-break — same rout, earlier date must win.
  match("f3", "T37", "MIDHIGH", "MIDLOW", 0, 4, "2026-09-07"),
  // Home wins do not count for either banner.
  match("f4", "T37", "GIANT", "WEAK", 3, 0, "2026-09-15"),
  // Away wins that ARE brittle matter to neither banner — these don't appear.
  match("f5", "T37", "GIANT", "SMALL", 1, 2, "2026-09-22"),
  // Scheduled noise.
  match("f6", "T37", "WEAK", "GIANT", null, null, "2026-09-29", "SCHEDULED"),
];
const board = worldUpsets(fx, clubs);

ok(`the ratings-gap banner is the weaker side winning despite the biggest OVR gap (${board.biggestUpset?.awayClubId ?? "none"} ${board.biggestUpset?.deficit ?? 0})`,
  board.biggestUpset !== null && board.biggestUpset.matchId === "f1" &&
  board.biggestUpset.deficit === 37 && board.biggestAwayWin?.matchId === "f1");
ok(`the tie on the widest scoreline is settled by the earlier kickoff — f1 (09-01) beats f3 (09-07) and f2 (09-08) at margin 4`,
  board.biggestAwayWin?.matchId === "f1" && board.biggestAwayWin?.margin === 4);
ok(`a home win, a scheduled fixture, and a smaller rout all stay off the board (count ${board.matches}, upset ${board.biggestUpset?.matchId}, awayWin ${board.biggestAwayWin?.matchId})`,
  board.matches === 4 && board.biggestUpset !== null && board.biggestAwayWin !== null);

// Empty arms and determinism.
ok(`an empty dataset reads nothing, while the same fold above produces both banners`,
  worldUpsets([], []).biggestUpset === null && worldUpsets([], []).biggestAwayWin === null &&
  board.biggestUpset !== null && board.biggestAwayWin !== null &&
  JSON.stringify(board) === JSON.stringify(worldUpsets(fx, clubs)));

// Seeded arm: over the shipped world, every fixture read as an away win, every club carries an overall,
// and the fold covers them all — verified independently in the proof, not by the fold's own internal count.
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const seeded = worldUpsets(world, seededClubs);
const expectedAwayWins = world.filter((m) => m.status === "FINISHED" && typeof m.homeGoals === "number" && typeof m.awayGoals === "number" && m.awayGoals > m.homeGoals).length;
let ovrMisses = 0;
for (const c of seededClubs) if (typeof c.overall !== "number") ovrMisses++;
ok(`over the shipped world every away win read and the fold covers exactly those occurred (${seeded.matches} of ${expectedAwayWins} readable fixtures, ${seededClubs.length - ovrMisses} clubs with an overall, ${seededClubs.length} overall)`,
  seeded.matches === expectedAwayWins && seeded.biggestUpset !== null && seeded.biggestAwayWin !== null && ovrMisses === 0 && seededClubs.length > 0);

// The screen is a reader: it renders the folded upsets and nothing else guesses.
const SCREEN_SRC = readFileSync(resolve(root, "features/world/DynamicWorld.tsx"), "utf8");
ok(`the world screen renders the fold and its own banner (fold call ${SCREEN_SRC.includes("worldUpsets(worldMatches")}, upset ${SCREEN_SRC.includes("upsets.biggestUpset")}, away ${SCREEN_SRC.includes("upsets.biggestAwayWin")}, keys ${SCREEN_SRC.includes("world.upsTitle")}/${SCREEN_SRC.includes("world.upsAway")})`,
  SCREEN_SRC.includes("worldUpsets(worldMatches") && SCREEN_SRC.includes("upsets.biggestUpset") &&
  SCREEN_SRC.includes("upsets.biggestAwayWin") && SCREEN_SRC.includes("world.upsTitle") &&
  SCREEN_SRC.includes("world.upsHint") && SCREEN_SRC.includes("world.upsUpset") &&
  SCREEN_SRC.includes("world.upsUpsetSub") && SCREEN_SRC.includes("world.upsAway") &&
  SCREEN_SRC.includes("world.upsAwaySub") && SCREEN_SRC.includes("world.upsMethod") &&
  SCREEN_SRC.includes("upsets.biggestUpset &&"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
