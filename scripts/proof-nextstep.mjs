// M573 proof: domain/nextStep.ts ranks the dashboard's "what now" into at most three actions.
//
// The page used to answer the question with a static grid of every module — a catalogue, not a
// recommendation. The ranking is a contract about precedence: a fixture in play outranks the next
// kickoff (you can only watch one), a missing plan outranks an empty film room, and the list falls
// back to the card ledger only when nothing is actually waiting — which is a real "caught up",
// not an empty panel. The limit is part of the contract because the page prints at most three.
// M624 adds the clock: the next kickoff is ranked by how far away it is. Inside the warning
// window it outranks planning work that can wait; outside it, the checklist runs first and the
// fixture still beats the card ledger. Minutes are read off the demo anchor — never the reader's
// wall clock — so the same fixture ranks the same way whenever the page is opened.
import { createServer } from "vite";

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? "  — " + String(detail).slice(0, 240) : "")); }
};

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { nextSteps, NEXT_STEP_LIMIT, NEXT_MATCH_SOON_MINUTES } = await server.ssrLoadModule("/domain/nextStep.ts");

const join = (xs) => xs.join(",");
// A state where the training plan and the film room are already filled, the watchlist is used,
// and no badge is close enough to name: nothing on the list except what the overrides add.
const facts = (over = {}) => ({
  liveMatchId: null, nextMatchId: null, nextMatchInMinutes: null, plannedSessions: 2, filmClips: 4, badgeWaiting: false, watchlist: 3, ...over,
});

const inPlay = nextSteps(facts({ liveMatchId: "m9", nextMatchId: "m10", plannedSessions: 0, filmClips: 0 }));
ok(`a fixture in play leads and hides the next kickoff — one thing to watch, then the gaps (${join(inPlay)})`,
  join(inPlay) === "live,training,film");

const nextUp = nextSteps(facts({ nextMatchId: "m10" }));
ok(`with nothing live, the next kickoff is named without inventing work behind it (${join(nextUp)})`,
  join(nextUp) === "fixture" && nextUp.length === 1);

const soon = nextSteps(facts({ nextMatchId: "m10", nextMatchInMinutes: 40, plannedSessions: 0 }));
ok(`a kickoff inside the ${NEXT_MATCH_SOON_MINUTES}-minute window leads the checklist — the match will not wait for a plan (${join(soon)})`,
  NEXT_MATCH_SOON_MINUTES === 180 && join(soon) === "fixture,training");

const far = nextSteps(facts({ nextMatchId: "m10", nextMatchInMinutes: 600, plannedSessions: 0, filmClips: 0 }));
ok(`outside the window the checklist comes first and the fixture follows it (${join(far)})`,
  join(far) === "training,film,fixture");

const undated = nextSteps(facts({ nextMatchId: "m10", nextMatchInMinutes: null, plannedSessions: 0, filmClips: 0 }));
ok(`a fixture with no measured distance is not urgent — unknown is not the same as imminent (${join(undated)})`,
  join(undated) === "training,film,fixture");

const edge = nextSteps(facts({ nextMatchId: "m10", nextMatchInMinutes: NEXT_MATCH_SOON_MINUTES, plannedSessions: 0 }));
const pastEdge = nextSteps(facts({ nextMatchId: "m10", nextMatchInMinutes: NEXT_MATCH_SOON_MINUTES + 1, plannedSessions: 0 }));
ok(`the window is inclusive at ${NEXT_MATCH_SOON_MINUTES} minutes and not a minute later (${join(edge)} / ${join(pastEdge)})`,
  join(edge) === "fixture,training" && join(pastEdge) === "training,fixture");

const distant = nextSteps(facts({ nextMatchId: "m10", nextMatchInMinutes: 240 }));
ok(`with everything else answered, a distant fixture still beats the card ledger (${join(distant)})`,
  join(distant) === "fixture" && distant.length === 1);

const busy = nextSteps(facts({ liveMatchId: "m9", badgeWaiting: true }));
ok(`a busy state names only what is actually waiting — the badge, not the answered checklist (${join(busy)})`,
  join(busy) === "live,badge" && busy.length === 2);

const caughtUp = nextSteps(facts());
ok(`every question answered falls back to the card ledger rather than an empty list (${join(caughtUp)})`,
  join(caughtUp) === "explore" && caughtUp.length === 1);

const long = nextSteps(facts({ nextMatchId: "m1", plannedSessions: 0, filmClips: 0, badgeWaiting: true, watchlist: 0 }));
ok(`the list stops at the printed limit of ${NEXT_STEP_LIMIT} actions, keeping the highest ranks (${join(long)})`,
  NEXT_STEP_LIMIT === 3 && long.length === 3 && join(long) === "training,film,fixture");

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
