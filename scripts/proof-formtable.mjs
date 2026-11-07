import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M970: the last five, ranked. Every finished fixture in the competition, ordered by kickoff per
// club, trimmed to the FORM_WINDOW the app reads everywhere, then scored as its own mini-league.
// teamMetrics' `form` is each club's own letters; this fold ranks the whole field on them — and
// it leans on the same doors the season table uses, never on fresh arithmetic.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { formTable } = await server.ssrLoadModule("/domain/analytics.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});

// Hand count (see the M970 ledger entry): A plays seven (the f0 thrashing is outside its window),
// B and D five, C three, E three, F one, G none. All numbers printed below were read out of the
// fold and re-counted against the fixtures by hand.
const formClubs = ["A", "B", "C", "D", "E", "F", "G"].map((id) => club(id, "T18"));
const formFixtures = [
  match("f0", "T18", "A", "F", 6, 0, "2026-08-25"),
  match("f1", "T18", "A", "B", 0, 2, "2026-09-01"),
  match("f2", "T18", "C", "D", 1, 1, "2026-09-08"),
  match("f3", "T18", "B", "A", 0, 1, "2026-09-15"),
  match("f4", "T18", "D", "E", 1, 3, "2026-09-22"),
  match("f5", "T18", "A", "D", 2, 2, "2026-09-29"),
  match("f6", "T18", "B", "C", 1, 1, "2026-10-06"),
  match("f7", "T18", "E", "A", 0, 2, "2026-10-13"),
  match("f8", "T18", "A", "B", 1, 3, "2026-10-20"),
  match("f9", "T18", "C", "E", 2, 2, "2026-10-27"),
  match("f10", "T18", "D", "A", 0, 0, "2026-11-03"),
  match("f11", "T18", "B", "D", 1, 0, "2026-11-10"),
  match("f99", "T18", "A", "G", 4, 4, "2026-11-17", "SCHEDULED"),
];
const table = formTable("T18", formFixtures, formClubs);
const row = Object.fromEntries(table.rows.map((r) => [r.clubId, r]));

ok(`formTable reads only this competition's finished fixtures and counts them (matches ${table.matches}, window ${table.window}, rows ${table.rows.length}, ranked ${table.ranked})`,
  table.matches === 12 && table.window === 5 && table.rows.length === 7 && table.ranked === 6);
// A's window drops f0 and f1; B's drops f0 and f1? No — B played f1/f3/f6/f8/f11 (five), all kept.
// F played f0 only. G played nothing: no invented form, no position, no climb.
ok(`the window trims A to its last five and never invents form for G (A ${row.A.played} played, letters ${row.A.form.join("")}, G ${row.G.played} played, formPosition ${row.G.formPosition}, season ${row.G.seasonPosition}, climb ${row.G.climb})`,
  row.A.played === 5 && row.A.form.join("") === "WDWLD" &&
  row.G.played === 0 && row.G.formPosition === 0 && row.G.seasonPosition === 0 && row.G.climb === 0 &&
  table.rows[table.rows.length - 1].clubId === "G");
ok(`the window tally is hand-counted (A ${row.A.gf}:${row.A.ga} ${row.A.points} pts; B ${row.B.gf}:${row.B.ga} ${row.B.points} pts ${row.B.form.join("")}; E ${row.E.points} ${row.E.form.join("")}; C ${row.C.points}; D ${row.D.points})`,
  row.A.gf === 6 && row.A.ga === 5 && row.A.points === 8 &&
  row.B.gf === 7 && row.B.ga === 3 && row.B.points === 10 &&
  row.B.form.join("") === "WLDWW" &&
  row.E.points === 4 && row.E.form.join("") === "WLD" &&
  row.C.points === 3 && row.C.form.join("") === "DDD" &&
  row.D.points === 3 && row.D.form.join("") === "DLDDL");
// B is second in the season on A's bigger sample but first in the window once the f0 loss falls
// out for A and the f11 win lands for B; the season numbering skips the team with no fixtures so
// both cohorts rank the same population.
ok(`the window re-ranks the field against each club's season place (${table.rows.filter((r) => r.played > 0).map((r) => `${r.clubId}${r.formPosition}/${r.seasonPosition}`).join(" ")}, climb B ${row.B.climb}, A ${row.A.climb}, C ${row.C.climb}, E ${row.E.climb})`,
  table.rows[0].clubId === "B" && table.rows[1].clubId === "A" &&
  table.rows[2].clubId === "E" && table.rows[3].clubId === "C" &&
  table.rows[4].clubId === "D" && table.rows[5].clubId === "F" &&
  row.B.climb === 1 && row.A.climb === -1 &&
  row.E.climb === 0 && row.C.climb === 0 && row.D.climb === 0 && row.F.climb === 0 &&
  row.F.seasonPosition === 6);

// The screen is a reader: it renders the folded table and the route table names it.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/FormTable.tsx"), "utf8");
const APP_ROUTE_SRC = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const SHELL_NAV_SRC = readFileSync(resolve(root, "features/shell/AppShell.tsx"), "utf8");
ok(`the window's points split cleanly by venue — every played fixture belongs to exactly one half (A home ${row.A.homePlayed}pld/${row.A.homePoints}pts away ${row.A.awayPlayed}/${row.A.awayPoints}; B ${row.B.homePoints}+${row.B.awayPoints}=${row.B.points}; D ${row.D.homePoints}+${row.D.awayPoints}=${row.D.points}; F home ${row.F.homePoints} away ${row.F.awayPlayed}pld)`,
  row.A.homePlayed === 2 && row.A.homePoints === 1 &&
  row.A.awayPlayed === 3 && row.A.awayPoints === 7 &&
  row.B.homePlayed === 3 && row.B.homePoints === 4 &&
  row.B.awayPlayed === 2 && row.B.awayPoints === 6 &&
  row.D.homePlayed === 2 && row.D.homePoints === 1 &&
  row.D.awayPlayed === 3 && row.D.awayPoints === 2 &&
  row.E.homePlayed === 1 && row.E.homePoints === 0 &&
  row.E.awayPlayed === 2 && row.E.awayPoints === 4 &&
  row.F.homePlayed === 0 && row.F.awayPlayed === 1 && row.F.homePoints === 0 && row.F.awayPoints === 0 &&
  row.G.homePlayed === 0 && row.G.awayPoints === 0 &&
  table.rows.every((r) => r.homePlayed + r.awayPlayed === r.played && r.homePoints + r.awayPoints === r.points));
ok(`the form screen reads the venue split straight off the fold (home ${SCREEN_SRC.includes("r.homePoints")}, away ${SCREEN_SRC.includes("r.awayPoints")}, keys ${SCREEN_SRC.includes("form.homePld")}/${SCREEN_SRC.includes("form.awayPld")})`,
  SCREEN_SRC.includes("r.homePoints") && SCREEN_SRC.includes("r.awayPoints") &&
  SCREEN_SRC.includes("form.homePld") && SCREEN_SRC.includes("form.awayPld"));
ok(`an empty competition answers with its one idle club, no ranked cohort and no matches (rows ${formTable("T99", [], [club("Q", "T99")]).rows.length}), and this fold repeats exactly`,
  formTable("T99", [], [club("Q", "T99")]).rows.length === 1 &&
  formTable("T99", [], [club("Q", "T99")]).ranked === 0 &&
  formTable("T99", [], [club("Q", "T99")]).matches === 0 &&
  JSON.stringify(table) === JSON.stringify(formTable("T18", formFixtures, formClubs)));

ok(`the form screen reads the fold and its own board (fold call ${SCREEN_SRC.includes("formTable(compId, matches, clubs)")}, rows ${SCREEN_SRC.includes("rows.map")}, pips ${SCREEN_SRC.includes("<FormPips form={r.form} />")})`,
  SCREEN_SRC.includes("formTable(compId, matches, clubs)") && SCREEN_SRC.includes("table.rows") &&
  SCREEN_SRC.includes("<FormPips form={r.form} />") && SCREEN_SRC.includes("form.recordLine") &&
  SCREEN_SRC.includes("form.moveUp") && SCREEN_SRC.includes("form.moveDown") &&
  SCREEN_SRC.includes("form.idle") && SCREEN_SRC.includes("table.window"));
ok(`the form screen is reachable — the route table and the sidebar both name it (route ${/path === "\/form"/.test(APP_ROUTE_SRC)}, nav ${/to: "\/form"/.test(SHELL_NAV_SRC)})`,
  /path === "\/form"/.test(APP_ROUTE_SRC) && /to: "\/form"/.test(SHELL_NAV_SRC));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
