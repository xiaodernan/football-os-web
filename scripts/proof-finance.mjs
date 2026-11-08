import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1022: the world's balance sheet — the folded board the riser draft never reached: the same
// seeded clubs and players every other fold reads, counted down into squad books, revenue and net.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { clubFinance } = await server.ssrLoadModule("/domain/finance.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, overall) => ({ id, name: id, short: id, competitionId: "T99", nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const player = (id, clubId, value) => ({ id, name: id, position: "ST", positionGroup: "ATT", age: 25, nation: "X", clubId, overall: 80, potential: 85, archetype: "Striker", value, foot: "LEFT" });

const clubs = [club("A", 90), club("B", 80), club("C", 70), club("D", 60)];
const players = [
  player("p1", "A", 100_000_000),
  player("p2", "A", 300_000_000),
  player("p3", "B", 200_000_000),
  player("p4", "C", 150_000_000),
];
const world = clubFinance(clubs, players);
const row = Object.fromEntries(world.rows.map((r) => [r.clubId, r]));

// Hand-entered expectations from WAGE 0.25 / AMORTIZE 0.05 / matchday OVR²×30k / broadcast 40M /
// commercial OVR²×12k — the fold prints exactly these.
ok(`rows hand-count to the model (${world.rows.map((r) => r.clubId).join(",")})`,
  row.A.squadValue === 400_000_000 && row.A.wages === 100_000_000 && row.A.amortize === 20_000_000 &&
  row.A.matchday === 243_000_000 && row.A.broadcast === 40_000_000 && row.A.commercial === 97_200_000 &&
  row.A.revenue === 380_200_000 && row.A.net === 260_200_000 &&
  row.B.net === 248_800_000 && row.C.net === 200_800_000 && row.D.squadValue === 0 && row.D.net === 191_200_000);
ok(`the world's column is the sum of its rows (${world.revenue} revenue, ${world.wages} wages, ${world.net} net, ${world.clubs} clubs)`,
  world.clubs === 4 && world.squadValue === 750_000_000 && world.wages === 187_500_000 &&
  world.amortize === 37_500_000 && world.revenue === 1_126_000_000 && world.net === 901_000_000 &&
  world.rows.reduce((n, r) => n + r.net, 0) === world.net);
ok(`rows open by net, ties by clubId (${world.rows.map((r) => `${r.clubId}:${r.net}`).join(" ")})`,
  world.rows.map((r) => r.clubId).join(",") === "A,B,C,D");
ok(`the ratio is 2dp against zero (${world.wageRatio})`,
  world.wageRatio === 0.17 && row.A.wageRatio === 0.26);

// Empty arm with the positive anchor above.
ok(`an empty world reads no rows, a measured zero everywhere else, and the same fold repeats exactly`,
  clubFinance([], []).rows.length === 0 &&
  clubFinance([], []).wageRatio === 0 && clubFinance([], []).revenue === 0 &&
  world.rows.length === 4 &&
  JSON.stringify(world) === JSON.stringify(clubFinance(clubs, players)));

// Seeded arm: over the shipped world every club appears exactly once, ordering holds, wage bills
// close against the players table, and the gates are the doors the seed itself writes.
const seededClubs = SVC.footballProvider.clubs();
const seededPlayers = SVC.footballProvider.players();
const seeded = clubFinance(seededClubs, seededPlayers);
let ordered = true, unique = true;
const seen = new Set();
for (const r of seeded.rows) {
  if (seen.has(r.clubId)) unique = false;
  seen.add(r.clubId);
}
for (let i = 1; i < seeded.rows.length; i++) if (seeded.rows[i - 1].net < seeded.rows[i].net) ordered = false;
let squadByClub = 0;
for (const p of seededPlayers) if (seeded.rows.some((r) => r.clubId === p.clubId)) squadByClub += p.value;
ok(`over all ${seededClubs.length} seeded clubs the board is complete (${seeded.rows.length} rows unique:${unique} ordered:${ordered}, squad ${seeded.squadValue} == ${squadByClub}, wage ratio ${seeded.wageRatio})`,
  unique && ordered && seeded.rows.length === seededClubs.length && seeded.squadValue === squadByClub &&
  Math.round((seeded.wages / seeded.revenue) * 100) / 100 === seeded.wageRatio);

// The screen is a reader: it renders the fold and nothing else counts.
const SCREEN_SRC = readFileSync(resolve(root, "features/finance/FinanceBoard.tsx"), "utf8");
ok(`the balance sheet screen renders the fold and its own board (fold call ${SCREEN_SRC.includes("clubFinance(clubs, players)")}, rows ${SCREEN_SRC.includes("world.rows.map")}, tiles ${SCREEN_SRC.includes("fin.tileNet")}/${SCREEN_SRC.includes("fin.tileWages")})`,
  SCREEN_SRC.includes("clubFinance(clubs, players)") && SCREEN_SRC.includes("world.rows.map") &&
  SCREEN_SRC.includes("fin.title") && SCREEN_SRC.includes("fin.subtitle") && SCREEN_SRC.includes("fin.tileClubs") &&
  SCREEN_SRC.includes("fin.tileRevenue") && SCREEN_SRC.includes("fin.tileWages") && SCREEN_SRC.includes("fin.tileWagesSub") &&
  SCREEN_SRC.includes("fin.tileNet") && SCREEN_SRC.includes("fin.tileNetSub") && SCREEN_SRC.includes("fin.worldLine") &&
  SCREEN_SRC.includes("fin.boardTitle") && SCREEN_SRC.includes("fin.boardHint") && SCREEN_SRC.includes("fin.rowLine") &&
  SCREEN_SRC.includes("fin.wageShare") && SCREEN_SRC.includes("fin.method") &&
  !SCREEN_SRC.includes("toLocaleString") && !SCREEN_SRC.includes("reduce("));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
