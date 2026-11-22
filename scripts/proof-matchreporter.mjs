// M1236 · The Match Reporter: proof for door 18's pure half — the fixture seal, the directive
// parser, the fixture numeral law, the fold's own report and the machine.
// Run: node scripts/proof-matchreporter.mjs
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const cacheDir = join(tmpdir(), `football-os-proof-matchreporter-${process.pid}`);
const server = await createServer({
  root: process.cwd(), cacheDir, server: { middlewareMode: true }, appType: "custom", logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const m = await server.ssrLoadModule("/domain/matchReporter.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const { sealFixture, createReporter, parseReporterReport, verifyReporterText, foldReport, reporterPreflight, reporterBuild, reporterPrecommit, reporterCommit, reporterRefused, REPORT_MAX_CHARS } = m;

// The hand-counted fixture: Arsenal 2-1 Chelsea, goals at 12', 55' (pen) and 78'.
const match = {
  id: "fx-1",
  competitionId: "epl",
  homeClubId: "ars",
  awayClubId: "che",
  kickoff: "2026-08-15T14:00:00Z",
  round: 2,
  status: "FINISHED",
  homeGoals: 2,
  awayGoals: 1,
  events: [
    { minute: 12, type: "GOAL", side: "home", player: "Bukayo Saka" },
    { minute: 38, type: "YELLOW", side: "away", player: "Moises Caicedo" },
    { minute: 55, type: "GOAL", side: "home", player: "Declan Rice" },
    { minute: 71, type: "SAVE", side: "away", player: "Robert Sanchez" },
    { minute: 78, type: "GOAL", side: "away", player: "Cole Palmer" },
  ],
  stats: {
    home: { possession: 58, shots: 15, onTarget: 6, xg: 1.8, passes: 520, passAcc: 87, tackles: 14, duels: 52, corners: 7, fouls: 9, yellows: 1, reds: 0 },
    away: { possession: 42, shots: 9, onTarget: 3, xg: 0.9, passes: 380, passAcc: 79, tackles: 18, duels: 48, corners: 3, fouls: 12, yellows: 2, reds: 0 },
  },
};
const fx = sealFixture(match, "Arsenal", "Chelsea");
ok(`a finished fixture with events seals into the reporter's envelope (${fx?.homeName} ${fx?.homeGoals}-${fx?.awayGoals} ${fx?.awayName}, ${fx?.events.length} events, ${fx?.stats.length} stats)`,
  fx !== null && fx.homeName === "Arsenal" && fx.homeGoals === 2 && fx.awayGoals === 1 &&
  fx.events.length === 5 && fx.stats.length === 24);

// A scheduled fixture, or one without events, cannot be sealed.
const scheduled = sealFixture({ ...match, status: "SCHEDULED", homeGoals: null, awayGoals: null }, "Arsenal", "Chelsea");
const noEvents = sealFixture({ ...match, events: [] }, "Arsenal", "Chelsea");
ok(`a scheduled fixture and one without events cannot be sealed (scheduled ${scheduled}, no-events ${noEvents})`,
  scheduled === null && noEvents === null);

// The directive parser: the right fixture, the wrong fixture, no directive.
const right = parseReporterReport("REPORT:fx-1\nArsenal held on.", fx);
const wrong = parseReporterReport("REPORT:fx-999\nA different game.", fx);
const none = parseReporterReport("Just a match report.", fx);
ok(`the directive must name the very fixture on the desk (right ${right.ok}, wrong ${wrong.violations.join(",")}, none ${none.violations.join(",")})`,
  right.ok && right.violations.length === 0 && !wrong.ok && wrong.violations.includes("wrongFixture") && none.violations.includes("noDirective"));

// The numeral law over the prose.
ok(`the prose law passes the fixture's own figures — the score, an event minute, a stat — and refuses an invented one and futurology (fixture ${verifyReporterText("Saka scored at 12 minutes; the home side had 58% possession.", fx).length === 0}, invented ${verifyReporterText("The attendance was 987654.", fx).includes("offFixture")}, futurology ${verifyReporterText("Arsenal will win the next match.", fx).includes("prediction")})`,
  verifyReporterText("Saka scored at 12 minutes; the home side had 58% possession.", fx).length === 0 &&
  verifyReporterText("The attendance was 987654.", fx).includes("offFixture") &&
  verifyReporterText("Arsenal will win the next match.", fx).includes("prediction"));

// The fold's own report as DATA - the score, the scorers in minute order, the engine's tallies.
// The domain writes no prose; the screen words this structure through the dictionary.
const report = foldReport(fx);
ok(`the fold's report reads the score, the scorers in minute order and the engine's tallies (${JSON.stringify(report)})`,
  report.homeGoals === 2 && report.awayGoals === 1 &&
  JSON.stringify(report.goals) === JSON.stringify([
    { player: "Bukayo Saka", minute: 12 },
    { player: "Declan Rice", minute: 55 },
    { player: "Cole Palmer", minute: 78 },
  ]) &&
  report.shots === 0 && report.saves === 1 &&
  JSON.stringify(foldReport(fx)) === JSON.stringify(report));

// A goalless fixture reads an empty goals list, not a broken one.
const blank = sealFixture({ ...match, homeGoals: 0, awayGoals: 0, events: [{ minute: 30, type: "SHOT", side: "home", player: "x" }] }, "Arsenal", "Chelsea");
ok(`a goalless fixture reads an empty goals list rather than a broken one (${foldReport(blank).goals.length} goals)`,
  blank !== null && foldReport(blank).goals.length === 0 && foldReport(blank).homeGoals === 0);

// The budget is real: a report past REPORT_MAX_CHARS is refused.
const long = "REPORT:fx-1 " + "x".repeat(REPORT_MAX_CHARS);
ok(`the budget is enforced — a report past ${REPORT_MAX_CHARS} characters is refused (${verifyReporterText(long, fx).includes("tooLong")})`,
  verifyReporterText(long, fx).includes("tooLong") && verifyReporterText("A short report.", fx).length === 0);

// The machine: both arms, the fold's report carried on a refusal.
let desk = reporterBuild(reporterPreflight(createReporter(fx, "en")));
const committed = reporterCommit(reporterPrecommit(desk, "pass"), "REPORT:fx-1\nA tight London derby.");
const refused = reporterRefused(reporterPrecommit(desk, "refused"), "REPORT:fx-1\nA report with the figure 987654 in it.");
ok(`the machine walks preflight -> build -> precommit -> commit, and a refusal carries the answer the caller passes (commit ${committed.status}, refused ${refused.status} answer ${refused.answer.slice(0, 20)}..., budget ${REPORT_MAX_CHARS})`,
  committed.status === "commit" && refused.status === "refused" &&
  refused.answer.length > 0 && committed.trace.length >= 3 && refused.trace.length >= 3 &&
  REPORT_MAX_CHARS === 900);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
