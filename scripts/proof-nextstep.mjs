// M573 proof: domain/nextStep.ts ranks the dashboard's "what now" into at most three actions.
//
// The page used to answer the question with a static grid of every module — a catalogue, not a
// recommendation. The ranking is a contract about precedence: a fixture in play outranks the next
// kickoff (you can only watch one), a missing plan outranks an empty film room, and the list falls
// back to the card ledger only when nothing is actually waiting — which is a real "caught up",
// not an empty panel. The limit is part of the contract because the page prints at most three.
import { createServer } from "vite";

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? "  — " + String(detail).slice(0, 240) : "")); }
};

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { nextSteps, NEXT_STEP_LIMIT } = await server.ssrLoadModule("/domain/nextStep.ts");

const join = (xs) => xs.join(",");
// A state where the training plan and the film room are already filled, the watchlist is used,
// and no badge is close enough to name: nothing on the list except what the overrides add.
const facts = (over = {}) => ({
  liveMatchId: null, nextMatchId: null, plannedSessions: 2, filmClips: 4, badgeWaiting: false, watchlist: 3, ...over,
});

const inPlay = nextSteps(facts({ liveMatchId: "m9", nextMatchId: "m10", plannedSessions: 0, filmClips: 0 }));
ok(`a fixture in play leads and hides the next kickoff — one thing to watch, then the gaps (${join(inPlay)})`,
  join(inPlay) === "live,training,film");

const nextUp = nextSteps(facts({ nextMatchId: "m10" }));
ok(`with nothing live, the next kickoff is named without inventing work behind it (${join(nextUp)})`,
  join(nextUp) === "fixture" && nextUp.length === 1);

const busy = nextSteps(facts({ liveMatchId: "m9", badgeWaiting: true }));
ok(`a busy state names only what is actually waiting — the badge, not the answered checklist (${join(busy)})`,
  join(busy) === "live,badge" && busy.length === 2);

const caughtUp = nextSteps(facts());
ok(`every question answered falls back to the card ledger rather than an empty list (${join(caughtUp)})`,
  join(caughtUp) === "explore" && caughtUp.length === 1);

const long = nextSteps(facts({ nextMatchId: "m1", plannedSessions: 0, filmClips: 0, badgeWaiting: true, watchlist: 0 }));
ok(`the list stops at the printed limit of ${NEXT_STEP_LIMIT} actions, keeping the highest ranks (${join(long)})`,
  NEXT_STEP_LIMIT === 3 && long.length === 3 && join(long) === "fixture,training,film");

const rerun = nextSteps(facts({ liveMatchId: "m9", nextMatchId: "m10", plannedSessions: 0, filmClips: 0 }));
const input = facts({ liveMatchId: "m9", plannedSessions: 0 });
const frozen = JSON.stringify(input);
const again = nextSteps(input);
ok(`the ranking is deterministic and leaves its facts exactly as written (same ${JSON.stringify(inPlay) === JSON.stringify(rerun)}, re-read ${join(again)})`,
  JSON.stringify(inPlay) === JSON.stringify(rerun) && JSON.stringify(input) === frozen &&
  again.length === 2 && join(again) === "live,training");

await server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
