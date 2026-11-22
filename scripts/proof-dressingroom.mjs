// M1242 · The Dressing Room: proof for door 20's pure half — the opponent's record, the briefing
// parser, the record numeral law, the fold's own briefing and the machine.
// Run: node scripts/proof-dressingroom.mjs
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const cacheDir = join(tmpdir(), `football-os-proof-dressingroom-${process.pid}`);
const server = await createServer({
  root: process.cwd(), cacheDir, server: { middlewareMode: true }, appType: "custom", logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const m = await server.ssrLoadModule("/domain/dressingRoom.ts");
const dict = await server.ssrLoadModule("/i18n/dictionaries.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const { opponentRecord, foldBrief, parseDressingBrief, verifyDressingText, dressingPreflight, dressingBuild, dressingPrecommit, dressingCommit, dressingRefused, BRIEF_MAX_CHARS } = m;
const { DICTIONARIES: D } = dict;
const locales = ["en", "zh-CN", "zh-TW"];

// The hand-counted opponent: Chelsea play five finished matches — W W D L W, 9 for, 5 against.
const matches = [
  { id: "f1", competitionId: "epl", homeClubId: "che", awayClubId: "ars", kickoff: "2026-08-01T14:00:00Z", round: 1, status: "FINISHED", homeGoals: 2, awayGoals: 1 },
  { id: "f2", competitionId: "epl", homeClubId: "liv", awayClubId: "che", kickoff: "2026-08-08T14:00:00Z", round: 2, status: "FINISHED", homeGoals: 0, awayGoals: 3 },
  { id: "f3", competitionId: "epl", homeClubId: "che", awayClubId: "mun", kickoff: "2026-08-15T14:00:00Z", round: 3, status: "FINISHED", homeGoals: 1, awayGoals: 1 },
  { id: "f4", competitionId: "epl", homeClubId: "tot", awayClubId: "che", kickoff: "2026-08-22T14:00:00Z", round: 4, status: "FINISHED", homeGoals: 2, awayGoals: 0 },
  { id: "f5", competitionId: "epl", homeClubId: "che", awayClubId: "mci", kickoff: "2026-08-29T14:00:00Z", round: 5, status: "FINISHED", homeGoals: 3, awayGoals: 1 },
  { id: "f6", competitionId: "epl", homeClubId: "che", awayClubId: "ars", kickoff: "2026-09-05T14:00:00Z", round: 6, status: "SCHEDULED", homeGoals: null, awayGoals: null },
];
const players = [
  { id: "p1", name: "Cole Palmer", position: "AMC", positionGroup: "AM", age: 24, nation: "eng", clubId: "che", overall: 85, potential: 90, archetype: "a", value: 1, foot: "L" },
  { id: "p2", name: "Backup", position: "CM", positionGroup: "CM", age: 30, nation: "eng", clubId: "che", overall: 74, potential: 74, archetype: "a", value: 1, foot: "R" },
];
const opp = opponentRecord("che", "Chelsea", matches, players);

ok(`the opponent's hand-counted record reads 5 played · 3W 1D 1L · 9 for · 5 against · 10 points · form WWDLW · best Palmer 85 (${opp?.played} · ${opp?.won}W ${opp?.drawn}D ${opp?.lost}L · ${opp?.gf} for · ${opp?.ga} against · ${opp?.points} pts · ${opp?.form.join("")} · ${opp?.bestPlayer} ${opp?.bestOverall})`,
  opp !== null && opp.played === 5 && opp.won === 3 && opp.drawn === 1 && opp.lost === 1 &&
  opp.gf === 9 && opp.ga === 5 && opp.points === 10 &&
  JSON.stringify(opp.form) === JSON.stringify(["W", "W", "D", "L", "W"]) &&
  opp.bestPlayer === "Cole Palmer" && opp.bestOverall === 85);

// A scheduled fixture is not a result; a club with no finished match reads null.
ok(`a scheduled fixture is not a result and a club with none reads null (scheduled ${opponentRecord("che", "Chelsea", [matches[5]], players)}, unknown ${opponentRecord("zzz", "ZZZ", matches, players)})`,
  opponentRecord("che", "Chelsea", [matches[5]], players) === null && opponentRecord("zzz", "ZZZ", matches, players) === null);

// The directive parser: right opponent, wrong opponent, no directive.
const right = parseDressingBrief("BRIEF:che\nThey are a side that presses high.", opp);
const wrong = parseDressingBrief("BRIEF:ars\nA different opponent.", opp);
const none = parseDressingBrief("Just a briefing.", opp);
ok(`the directive must name the very opponent on the desk (right ${right.ok}, wrong ${wrong.violations.join(",")}, none ${none.violations.join(",")})`,
  right.ok && right.violations.length === 0 && !wrong.ok && wrong.violations.includes("wrongOpponent") && none.violations.includes("noDirective"));

// The numeral law over the prose.
ok(`the record law passes the opponent's own figures and refuses an invented one and futurology (record ${verifyDressingText("They have 10 points from 5, scored 9 and conceded 5.", opp).length === 0}, invented ${verifyDressingBriefInjected(opp)}, futurology ${verifyDressingText("BRIEF:che\nThey will win the next match.", opp).includes("prediction")})`,
  verifyDressingText("They have 10 points from 5, scored 9 and conceded 5.", opp).length === 0 &&
  verifyDressingText("They have 987654 points.", opp).includes("offRecord") &&
  verifyDressingText("BRIEF:che\nThey will win the next match.", opp).includes("prediction"));
function verifyDressingBriefInjected(o) { return verifyDressingText("They have 987654 points.", o).includes("offRecord"); }

// The fold's own briefing is DATA, deterministic, and the same opponent always answers the same.
const fold = foldBrief(opp);
ok(`the fold's briefing is the record as data — form string, points, the danger (${fold.form} · ${fold.points} pts · ${fold.bestPlayer} ${fold.bestOverall}; twice ${JSON.stringify(foldBrief(opp)) === JSON.stringify(fold)})`,
  fold.form === "WWDLW" && fold.points === 10 && fold.gf === 9 && fold.ga === 5 &&
  fold.bestPlayer === "Cole Palmer" && JSON.stringify(foldBrief(opp)) === JSON.stringify(fold));

// The budget is real.
const long = "BRIEF:che " + "x".repeat(BRIEF_MAX_CHARS);
ok(`the budget is enforced — a briefing past ${BRIEF_MAX_CHARS} characters is refused (${verifyDressingText(long, opp).includes("tooLong")})`,
  verifyDressingText(long, opp).includes("tooLong") && verifyDressingText("A short briefing.", opp).length === 0);

// The machine: both arms, and a preflight refusal for an opponent with no record.
let desk = dressingBuild(dressingPreflight({ opponent: opp, locale: "en", status: "preflight", trace: [], answer: "" }));
const committed = dressingCommit(dressingPrecommit(desk, "pass"), "BRIEF:che\nA side that presses high and carries Palmer's threat.");
const refused = dressingRefused(dressingPrecommit(desk, "refused"), "BRIEF:che\nThey have 987654 points and will win.");
const noRecord = dressingPreflight({ opponent: { ...opp, played: 0 }, locale: "en", status: "preflight", trace: [], answer: "" });
ok(`the machine walks preflight -> build -> precommit -> commit, a refusal carries the caller's answer, and an opponent with no record is refused at preflight (commit ${committed.status}, refused ${refused.status}, no-record ${noRecord.status})`,
  committed.status === "commit" && refused.status === "refused" && noRecord.status === "refused" &&
  committed.trace.length >= 3 && refused.trace.length >= 3 && BRIEF_MAX_CHARS === 900);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
