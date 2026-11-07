import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M979: the honesty report. The model is a closed-form Poisson read of each club's shrunk
// attack against the opponent's defence — same inputs, same answers, no sampling. The audit
// walks each finished match with only what came before it, and scores the model against what
// actually happened, so the numbers the lab prints can be tested rather than trusted.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { predictionAudit, teamMetrics, outcomeOdds } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});

const fx = [
  match("f1", "T23", "A", "B", 2, 0, "2026-09-01"),
  match("f2", "T23", "B", "C", 0, 2, "2026-09-08"),
  match("f3", "T23", "C", "D", 1, 1, "2026-09-15"),
  match("f4", "T23", "A", "C", 3, 1, "2026-09-22"),
  match("f5", "T23", "B", "D", 1, 0, "2026-09-29"),
  match("f6", "T23", "D", "A", 0, 1, "2026-10-06"),
  match("f7", "T23", "A", "D", null, null, "2026-11-03", "SCHEDULED"),
];
const clubs = ["A", "B", "C", "D"].map((id) => club(id, "T23"));
const audit = predictionAudit("T23", fx, clubs);

ok(`the audit reads only this competition's finished fixtures, in kickoff order — a scheduled one is noise (${audit.matches} matches)`,
  audit.matches === 6 && audit.predictedHome + audit.predictedDraw + audit.predictedAway === audit.matches);
ok(`every fixture's odds are the same formula recomputed in the witness, with nothing from after kickoff in the inputs`,
  (() => {
    const prior = [];
    for (const m of fx.filter((x) => x.status === "FINISHED").sort((a, b) => a.kickoff.localeCompare(b.kickoff))) {
      const metrics = teamMetrics("T23", prior, clubs);
      const h = metrics.find((x) => x.clubId === m.homeClubId);
      const a = metrics.find((x) => x.clubId === m.awayClubId);
      const appearances = metrics.reduce((n, r) => n + r.played, 0);
      const goals = metrics.reduce((n, r) => n + r.gf, 0);
      const odds = outcomeOdds(h, a, appearances ? goals / appearances : undefined);
      // The favorite the witness reads must be the one the fold counted.
      const fav = odds.home >= odds.draw && odds.home >= odds.away ? "home" : odds.draw >= odds.away ? "draw" : "away";
      if (m.id === "f1" && fav !== "home") return false;
      if (m.id === "f2" && fav !== "away") return false;
      if (m.id === "f3" && fav !== "home") return false;
      if (m.id === "f5" && fav !== "away") return false;
      prior.push(m);
    }
    return true;
  })());
ok(`the bookkeeping is hand-checked (Brier ${audit.brier}, favorites ${audit.predictedHome}/${audit.predictedDraw}/${audit.predictedAway}, correct ${audit.homeCorrect}/${audit.drawCorrect}/${audit.awayCorrect}, accuracy ${audit.accuracy})`,
  audit.brier === 0.199 && audit.accuracy === 66.67 &&
  audit.predictedHome === 3 && audit.predictedDraw === 0 && audit.predictedAway === 3 &&
  audit.homeCorrect === 2 && audit.drawCorrect === 0 && audit.awayCorrect === 2);
ok(`an empty competition reads no audit, a measured zero, while the same fold reads a full six-match report above`,
  predictionAudit("T99", [], []).matches === 0 &&
  predictionAudit("T99", [], []).brier === 0 &&
  predictionAudit("T99", [], []).accuracy === 0 &&
  audit.matches === 6 && audit.brier === 0.199 &&
  JSON.stringify(audit) === JSON.stringify(predictionAudit("T23", fx, clubs)));

// Seeded arm: over every competition the world ships, the audit covers exactly the population
// the model can read — clubs with a row before kickoff, i.e. a club of this competition, or one
// that had already appeared in an earlier fixture of this comp. In-league clubs are always a row;
// visiting sides are not, until they've shown up.
const comps = SVC.footballProvider.competitions();
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const compOf = new Map(seededClubs.map((x) => [x.id, x.competitionId]));
let bounds = true, inside = true, sums = true, exact = true;
for (const c of comps) {
  const a2 = predictionAudit(c.id, world, seededClubs);
  const appearances = new Set();
  let expected = 0;
  for (const m of world.filter((x) => x.competitionId === c.id && x.status === "FINISHED").sort((a, b) => a.kickoff.localeCompare(b.kickoff))) {
    const homeSeen = appearances.has(m.homeClubId) || compOf.get(m.homeClubId) === c.id;
    const awaySeen = appearances.has(m.awayClubId) || compOf.get(m.awayClubId) === c.id;
    if (homeSeen && awaySeen) expected++;
    appearances.add(m.homeClubId);
    appearances.add(m.awayClubId);
  }
  if (a2.matches !== expected) exact = false;
  if (a2.brier < 0 || a2.brier > 2 / 3 || !(a2.accuracy >= 0 && a2.accuracy <= 100)) inside = false;
  if (a2.predictedHome + a2.predictedDraw + a2.predictedAway !== a2.matches) sums = false;
  if (JSON.stringify(a2) !== JSON.stringify(predictionAudit(c.id, world, seededClubs))) bounds = false;
}
ok(`over all ${comps.length} seeded competitions the audit covers exactly the population the model can read (exact ${exact}, bounds ${inside}, favorites ${sums}, repeatable ${bounds})`,
  exact && inside && sums && bounds);

// The screen is a reader: it renders the folded report and nothing else scores the model.
const SCREEN_SRC = readFileSync(resolve(root, "features/sim/SimulationLab.tsx"), "utf8");
ok(`the simulation lab renders the folded report (fold call ${SCREEN_SRC.includes("predictionAudit(auditCompId, footballProvider.matches(), footballProvider.clubs())")}, tiles ${SCREEN_SRC.includes("sim.auditBrier")}/${SCREEN_SRC.includes("sim.auditAccuracy")}, calls ${SCREEN_SRC.includes("sim.auditCalls")})`,
  SCREEN_SRC.includes("predictionAudit(auditCompId, footballProvider.matches(), footballProvider.clubs())") &&
  SCREEN_SRC.includes("sim.auditTitle") && SCREEN_SRC.includes("sim.auditHint") &&
  SCREEN_SRC.includes("sim.auditMatches") && SCREEN_SRC.includes("sim.auditBrier") &&
  SCREEN_SRC.includes("sim.auditAccuracy") && SCREEN_SRC.includes("sim.auditCalls") &&
  SCREEN_SRC.includes("sim.auditNone") && SCREEN_SRC.includes("sim.auditBrierSub"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
