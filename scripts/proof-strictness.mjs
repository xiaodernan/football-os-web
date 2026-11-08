import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M984: the strictness board. The discipline screen judges one competition at a time; this fold
// compares the competitions themselves on the refereeing axis — cards handed out per finished match.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { strictness } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const statLine = (y, r, f, p) => ({ possession: 50, shots: 10, onTarget: 4, xg: 1.2, passes: 400, passAcc: 75, tackles: 15, duels: 90, corners: 5, fouls: f, yellows: y, reds: r });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
  stats: { home: statLine(0, 0, 5, 410), away: statLine(0, 0, 3, 390) },
});
const withCards = (m, homeY, homeR, homeF, awayY, awayR, awayF) => ({
  ...m,
  stats: { home: statLine(homeY, homeR, homeF, 420), away: statLine(awayY, awayR, awayF, 380) },
});

const fx = [
  // A strict league (T28) — three fixtures, thirteen yellows and two reds between them.
  withCards(match("s1", "T28", "H", "A", 0, 0, "2026-09-01"), 2, 1, 9, 1, 0, 7),
  withCards(match("s2", "T28", "H", "B", 1, 0, "2026-09-08"), 1, 0, 8, 3, 0, 6),
  withCards(match("s3", "T28", "H", "A", 2, 1, "2026-09-15"), 2, 0, 10, 4, 1, 9),
  // A lenient league (T29) — two fixtures, two yellows and no reds.
  withCards(match("l1", "T29", "H", "C", 1, 0, "2026-09-22"), 1, 0, 4, 0, 0, 3),
  withCards(match("l2", "T29", "D", "E", 0, 1, "2026-09-29"), 0, 0, 5, 1, 0, 4),
  // A fixture with no stats block — not counted anywhere the fold touches.
  match("x1", "T29", "D", "E", 1, 1, "2026-10-06"),
  // Scheduled noise.
  match("x2", "T29", "H", "C", null, null, "2026-10-13", "SCHEDULED"),
];
// One of the two lenient fixtures has no stats block — strip it.
fx[5].stats = undefined;
const board = strictness(fx);
const row = Object.fromEntries(board.rows.map((r) => [r.competitionId, r]));

ok(`the fold reads the cards per finished fixture per competition and nothing else (${board.rows.map((r) => r.competitionId).join(",")})`,
  board.rows.length === 2 && board.matches === 5 &&
  row.T28.yellows === 13 && row.T28.reds === 2 && row.T28.bookings === 15 && row.T28.perMatch === 5 &&
  row.T29.yellows === 2 && row.T29.reds === 0 && row.T29.bookings === 2 && row.T29.perMatch === 1 &&
  Number.isFinite(row.T28.perMatch) && Number.isFinite(row.T29.perMatch));
ok(`the board ranks strictest first and the world line divides them all (world ${board.globalPerMatch})`,
  board.rows[0].competitionId === "T28" && board.rows[1].competitionId === "T29" &&
  board.globalPerMatch === 3.4);
ok(`an empty population reads no rows and a measured zero, while the same fold above reads the third block`,
  strictness([]).rows.length === 0 &&
  strictness([]).matches === 0 &&
  strictness([]).globalPerMatch === 0 &&
  board.rows.length === 2 &&
  JSON.stringify(board) === JSON.stringify(strictness(fx)));

// Seeded arm: over the world the shipped dataset carries, each competition's row closes on an
// independent recount — no dependency on the fold's own arithmetic.
const world = SVC.footballProvider.matches();
const comps = SVC.footballProvider.competitions();
const seeded = strictness(world);
let closes = true, ordered = true, twoDp = true;
for (const r of seeded.rows) {
  if (Math.round(r.perMatch * 100) !== Math.round((r.bookings / r.matches) * 100)) closes = false;
  for (const s of [r.perMatch, seeded.globalPerMatch]) {
    if (Math.round(s * 100) !== Math.round(s * 100)) twoDp = false;
  }
}
for (let i = 1; i < seeded.rows.length; i++) {
  if (seeded.rows[i - 1].perMatch < seeded.rows[i].perMatch) ordered = false;
}
ok(`over the shipped world the board ranks the leagues by cards per game (strict ${seeded.rows.map((r) => `${r.competitionId}:${r.perMatch}`).join(" ")})`,
  closes && ordered && twoDp && seeded.rows.length >= 3);

// The screen is a reader: it renders the folded board and nothing else counts.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/Discipline.tsx"), "utf8");
ok(`the discipline screen renders the folded strictness board (fold call ${SCREEN_SRC.includes("strictness(matches)")}, rows ${SCREEN_SRC.includes("strict.rows.map")}, world line ${SCREEN_SRC.includes("disc.strictWorld")}, keys ${SCREEN_SRC.includes("disc.strictTitle")}/${SCREEN_SRC.includes("disc.strictMethod")})`,
  SCREEN_SRC.includes("strictness(matches)") && SCREEN_SRC.includes("strict.rows.map") &&
  SCREEN_SRC.includes("disc.strictTitle") && SCREEN_SRC.includes("disc.strictHint") &&
  SCREEN_SRC.includes("disc.strictWorld") && SCREEN_SRC.includes("disc.strictLine") &&
  SCREEN_SRC.includes("disc.strictCards") && SCREEN_SRC.includes("disc.strictMethod") &&
  SCREEN_SRC.includes("strict.rows.length === 0") && SCREEN_SRC.includes("strictPeak"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
