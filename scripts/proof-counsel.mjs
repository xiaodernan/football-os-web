// M1195 · The Counselor gate.
//
// The dashboard's counsel is a door imprisoned to the reader's own NextStepFacts: every numeral it spends must be
// one the fold already carries; anything else — a borrowed number, a forecast, a fantasy — means refusal, and the
// fold's own reading stands in. This proof holds the whole door honest: the FSM walk, the evidence fold, the
// envelope the model sees, the refusal vocabulary, and the local priority reading.

import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({
  cacheDir: join(tmpdir(), `proof-counsel-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const counsel = await server.ssrLoadModule("/domain/counsel.ts");
await server.close();

let fail = 0;
let total = 0;
const ok = (name, cond) => {
  total += 1;
  const good = Boolean(cond);
  console.log(`${good ? "PASS" : "FAIL"}  ${name}`);
  if (!good) fail++;
};

const {
  counselPreflight, counselBuild, counselPrecommit, counselCommit, counselRefused,
  verifyCounselText, COUNSEL_LOCAL_KEY, COUNSEL_FOLD_ANSWER_KEY, counselEvidence, counselEnvelope,
} = counsel;

const NOW = { liveMatchId: null, nextMatchId: "fx-1", nextMatchInMinutes: 90, plannedSessions: 2, filmClips: 0, badgeWaiting: false, watchlist: 1 };
const EMPTY = { liveMatchId: null, nextMatchId: null, nextMatchInMinutes: null, plannedSessions: 0, filmClips: 0, badgeWaiting: false, watchlist: 0 };

// 1 · the door opens on a fold that carries something
let s = counselPreflight(NOW, "en");
ok("preflight passes on a live fact set (stage preflight, trace notes factsSealed)", s.status === "build" && s.trace.at(-1)?.stage === "preflight" && s.trace.at(-1)?.verdict === "pass");

// plant: the empty fold is refused at the door and nothing is written
const emptyWalk = counselPreflight(EMPTY, "zh-CN");
ok("the empty fold is refused at the door and the answer stays sealed (plant)", emptyWalk.status === "refused" && emptyWalk.answer === "" && emptyWalk.trace.at(-1)?.verdict === "refused");

// 2 · build seals the envelope and moves to the model
s = counselBuild(counselPreflight(NOW, "en"));
ok("build advances preflight → model and seals the envelope entry", s.status === "model" && s.trace.map((e) => e.stage).join(",") === "preflight,build");

// 3 · the precommit is the fold's word, not the model's
const passedPre = counselPrecommit(s, "pass");
const refusedPre = counselPrecommit(s, "refused");
ok("precommit pass stamps commitOk; the refused path stamps precommitRefused", passedPre.trace.at(-1)?.note === "commitOk" && refusedPre.trace.at(-1)?.note === "precommitRefused" && passedPre.status === "commit" && refusedPre.status === "refused");

// 4 · commit and refusal both settle
const committed = counselCommit(counselPrecommit(s, "pass"), "Go watch the fixture; two sessions are already planned.");
ok("commit stores the answer and closes the door at commit", committed.status === "commit" && committed.answer.includes("two sessions") && committed.trace.at(-1)?.stage === "commit");
const folded = counselRefused(s, "the fold's own reading");
ok("refusal stores the fold's own answer and closes the door at refused", folded.status === "refused" && folded.answer === "the fold's own reading" && folded.trace.at(-1)?.stage === "refused");

// 5 · the local reading walks the priority ladder, never inventing
ok("live minutes outrank everything (localLive wins when a match is live)", COUNSEL_LOCAL_KEY({ ...NOW, liveMatchId: "m-9" }).key === "counsel.localLive");
ok("the soon fixture outranks planning (localSoon with the exact minute)", COUNSEL_LOCAL_KEY(NOW).key === "counsel.localSoon" && COUNSEL_LOCAL_KEY(NOW).params?.n === 90);
const NO_PLAN = { ...NOW, nextMatchInMinutes: 400, plannedSessions: 0 };
const EMPTY_WATCHLIST = { ...NOW, nextMatchInMinutes: 400, plannedSessions: 3, filmClips: 2, watchlist: 0 };
ok("an empty plan outranks an empty library (localEmptyPlan)", COUNSEL_LOCAL_KEY(NO_PLAN).key === "counsel.localEmptyPlan");
ok("an empty film library comes next (localNoFilm)", COUNSEL_LOCAL_KEY({ ...NOW, nextMatchInMinutes: 400, plannedSessions: 3 }).key === "counsel.localNoFilm");
ok("an empty watchlist is the last nudge before nothing (localEmptyWatchlist)", COUNSEL_LOCAL_KEY(EMPTY_WATCHLIST).key === "counsel.localEmptyWatchlist");
ok("a fully-stocked desk reads as nothing to do (localNothing)", COUNSEL_LOCAL_KEY({ liveMatchId: null, nextMatchId: null, nextMatchInMinutes: null, plannedSessions: 4, filmClips: 7, badgeWaiting: true, watchlist: 2 }).key === "counsel.localNothing");

// 6 · the envelope carries exactly the fold and nothing else
const env = JSON.parse(counselEnvelope(NOW));
ok("the envelope is strict JSON with the fold's own fields only", env.liveMatch === false && env.nextMatch === true && env.nextMatchInMinutes === 90 && env.plannedSessions === 2 && env.filmClips === 0 && env.watchlistCount === 1 && env.badgeWaiting === false && Object.keys(env).length === 7);
ok("the envelope holds ids and numbers, never persons", !/roche|novak|roussel|sub-/i.test(counselEnvelope(NOW)));
ok("the person-scanner reads a planted roster name (plant)", /roche|novak|roussel|sub-/i.test("FC Roche"));

// 7 · evidence is the fold's own numerals plus the counted family
const ev = counselEvidence(NOW);
const BASE = ["0", "1", "2", "3", "90"];
ok("evidence carries the counted family and the fold's exact values", BASE.every((v) => ev.has(v)));

// 8 · the in-prison test: the model may spend the fold's numerals and nothing else
const clean = verifyCounselText("Two sessions are already planned; kick-off is in 90 minutes and the watchlist holds 1 name.", NOW);
ok("numerals from the fold pass verification clean", clean.length === 0);
const invented = verifyCounselText("Two sessions are planned, and 87 is the number the world wants to hear.", NOW);
ok("a foreign numeral is refused by the fold (plant)", invented.includes("offEvidence"));
const forecast = verifyCounselText("The fold says this side will win next season.", NOW);
ok("a forecast is refused by the fold (plant)", forecast.includes("prediction"));
const emptyOk = verifyCounselText("Nothing is planned — 0 sessions, 0 clips.", { ...NOW, plannedSessions: 0, filmClips: 0 });
ok("a fold reporting zeros may spend zeros", emptyOk.length === 0);
const flood = verifyCounselText("1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 is all the fog the fold allows.", NOW);
ok("a numeral flood is refused by the fold (plant)", flood.includes("tooManyNumbers"));

ok("the fold's refusal answer key is named", COUNSEL_FOLD_ANSWER_KEY === "counsel.foldAnswer");

console.log(`\n${total - fail}/${total} checks passed`);
process.exit(fail ? 1 : 0);
