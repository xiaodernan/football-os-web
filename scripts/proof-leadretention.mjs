import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M956: leads kept and lost. `scoringFirst` asks what the FIRST goal bought; this fold asks what
// ANY lead bought — replay every goal in order, note each side that was ahead at some point, and
// read the final result against it. The fixtures below are hand-counted, and the screen is checked
// as a reader of the fold rather than a second engine.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { leadRetention, comebackPoints } = await server.ssrLoadModule("/domain/analytics.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});
const goal = (minute, side) => ({ minute, type: "GOAL", side, player: "p" });

// Hand count: A led and won (2-1); C led and drew (1-1, 90' equaliser); F led and won (0-2 away);
// G led and lost (1-3); I led and won (2-0). B, D, E and J only ever equalised or trailed, so they
// are absent from the board. l6 has no events, l7 is scheduled, l8 is another competition.
const leadClubs = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"].map((id) => club(id, "T12"));
const leadFixtures = [
  { ...match("l1", "T12", "A", "B", 2, 1, "2026-06-01"), events: [goal(10, "home"), goal(20, "away"), goal(70, "home")] },
  { ...match("l2", "T12", "C", "D", 1, 1, "2026-06-02"), events: [goal(5, "home"), goal(90, "away")] },
  { ...match("l3", "T12", "E", "F", 0, 2, "2026-06-03"), events: [goal(30, "away"), goal(60, "away")] },
  { ...match("l4", "T12", "G", "H", 1, 3, "2026-06-04"), events: [goal(3, "home"), goal(40, "away"), goal(50, "away"), goal(80, "away")] },
  { ...match("l5", "T12", "I", "J", 2, 0, "2026-06-05"), events: [goal(12, "home"), goal(55, "home")] },
  { ...match("l6", "T12", "K", "L", 0, 0, "2026-06-06") },
  { ...match("l7", "T12", "M", "N", 1, 0, "2026-06-07", "SCHEDULED"), events: [goal(9, "home")] },
  { ...match("l8", "T13", "O", "P", 1, 0, "2026-06-08"), events: [goal(9, "home")] },
];
const leads = leadRetention("T12", leadFixtures, leadClubs);
const lead = Object.fromEntries(leads.rows.map((r) => [r.clubId, r]));

ok(`leadRetention replays only this competition's finished fixtures that carry an event list (matches ${leads.matches}, leads ${leads.led}, won ${leads.won}, drawn ${leads.drawn}, lost ${leads.lost}, dropped ${leads.dropped})`,
  leads.matches === 5 && leads.led === 6 && leads.won === 4 && leads.drawn === 1 &&
  leads.lost === 1 && leads.dropped === 5);
ok(`leadRetention charges a lead to the side that held it, not to the side that only equalised (rows ${leads.rows.map((r) => r.clubId).join("")}; G dropped ${lead.G.dropped}, C ${lead.C.dropped}, A kept ${lead.A.keepShare}%, B ${lead.B ? "present" : "absent"})`,
  leads.rows.map((r) => r.clubId).join("") === "GCAFHI" && leads.rows.length === 6 &&
  lead.G.dropped === 3 && lead.G.keepShare === 0 && lead.C.dropped === 2 &&
  lead.A.keepShare === 100 && lead.H.keepShare === 100 &&
  !lead.B && !lead.D && !lead.E && !lead.J && !lead.K);
ok(`leadRetention's keep share is won over led, 2dp (${leads.keepShare}%), and a replay repeats exactly (${JSON.stringify(leads) === JSON.stringify(leadRetention("T12", leadFixtures, leadClubs))})`,
  near(leads.keepShare, 66.67, 0.005) &&
  JSON.stringify(leads) === JSON.stringify(leadRetention("T12", leadFixtures, leadClubs)));

// A competition with no fixture at all: no rows, no leads, and a keep share of zero rather than a
// division by zero.
const leadEmpty = leadRetention("T99", [], [club("Q", "T99")]);
ok(`leadRetention answers an empty competition with no rows and a zero keep share (rows ${leadEmpty.rows.length}, led ${leadEmpty.led}, keep ${leadEmpty.keepShare}, matches ${leadEmpty.matches}), while the same fold reads ${leads.rows.length} rows on the fixture set above, so the zero is measured and not a blind spot`,
  leadEmpty.rows.length === 0 && leadEmpty.led === 0 && leadEmpty.keepShare === 0 &&
  leadEmpty.matches === 0 && leads.rows.length === 6);

// ---- M957: the other half of the ledger ------------------------------------------------------
// The same replay read from the side that was behind. Hand count on the fixtures above: D trailed
// 0-1 and drew (1 point), H trailed 0-1 and won (3), and B, E, G and J trailed and lost (0 each).
// G appears in both folds — it led 1-0 and then trailed 1-2 — which is the point of the pair.
const comebacks = comebackPoints("T12", leadFixtures, leadClubs);
const comeback = Object.fromEntries(comebacks.rows.map((r) => [r.clubId, r]));
ok(`comebackPoints reads the deficit from the side that was behind (trailed ${comebacks.trailed}, won ${comebacks.won}, drawn ${comebacks.drawn}, lost ${comebacks.lost}, points ${comebacks.points}, rescue ${comebacks.rescueShare}%)`,
  comebacks.matches === 5 && comebacks.trailed === 6 && comebacks.won === 1 &&
  comebacks.drawn === 1 && comebacks.lost === 4 && comebacks.points === 4 &&
  near(comebacks.rescueShare, 33.33, 0.005));
ok(`comebackPoints ranks the rescued points first, then the goal difference those same fixtures produced, and lets one fixture charge both folds (rows ${comebacks.rows.map((r) => r.clubId).join("")}; H ${comeback.H.points} from ${comeback.H.trailed} at ${comeback.H.gf}:${comeback.H.ga}, D ${comeback.D.points}, B ${comeback.B.gf}:${comeback.B.ga}, G both led and trailed: ${lead.G.led === 1 && comeback.G.trailed === 1})`,
  comebacks.rows.map((r) => r.clubId).join("") === "HDBGEJ" && comebacks.rows.length === 6 &&
  comeback.H.points === 3 && comeback.H.rescueShare === 100 && comeback.H.gf === 3 && comeback.H.ga === 1 &&
  comeback.D.points === 1 && comeback.D.rescueShare === 100 && comeback.D.gf === 1 && comeback.D.ga === 1 &&
  comeback.B.points === 0 && comeback.B.rescueShare === 0 && comeback.B.gf === 1 && comeback.B.ga === 2 &&
  lead.G.led === 1 && comeback.G.trailed === 1 && comeback.G.points === 0 &&
  comeback.G.gf === 1 && comeback.G.ga === 3 &&
  JSON.stringify(comebacks) === JSON.stringify(comebackPoints("T12", leadFixtures, leadClubs)));

// The screen is a reader, not a second engine: it must render the folded board, and the route must
// exist for the sidebar entry that names it.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/LeadRetention.tsx"), "utf8");
const APP_ROUTE_SRC = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const SHELL_NAV_SRC = readFileSync(resolve(root, "features/shell/AppShell.tsx"), "utf8");
ok(`the lead-retention screen reads both folds and its own boards (fold calls ${SCREEN_SRC.includes("leadRetention(compId, matches, clubs)")}/${SCREEN_SRC.includes("comebackPoints(compId, matches, clubs)")}, rows ${SCREEN_SRC.includes("retention.rows")}/${SCREEN_SRC.includes("comeback.rows")}, bars ${SCREEN_SRC.includes("pctOf(r.keepShare, 100)")}/${SCREEN_SRC.includes("pctOf(r.rescueShare, 100)")})`,
  SCREEN_SRC.includes("leadRetention(compId, matches, clubs)") && SCREEN_SRC.includes("retention.rows") &&
  SCREEN_SRC.includes("pctOf(r.keepShare, 100)") && !SCREEN_SRC.includes("GOAL_BANDS") &&
  SCREEN_SRC.includes("comebackPoints(compId, matches, clubs)") && SCREEN_SRC.includes("comeback.rows") &&
  SCREEN_SRC.includes("pctOf(r.rescueShare, 100)"));
ok(`the lead-retention screen is reachable — the route table and the sidebar both name it (route ${/path === "\/leads"/.test(APP_ROUTE_SRC)}, nav ${/to: "\/leads"/.test(SHELL_NAV_SRC)})`,
  /path === "\/leads"/.test(APP_ROUTE_SRC) && /to: "\/leads"/.test(SHELL_NAV_SRC));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
