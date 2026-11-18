// Proof for The Dispatch on /ops (M1188): the model names ONE order from the fold's ranked
// prescription, the fold verifies every numeral it writes. Distinct from the M1156 wire
// broadsheet (scripts/proof-dispatch.mjs) — this gate reads the /ops strip only.
// Run: node scripts/proof-dispatchstrip.mjs
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const domain = readFileSync("domain/dispatch.ts", "utf8");
const ops = readFileSync("features/ops/Ops.tsx", "utf8");

ok("the dispatch FSM is the shared traced surface — no re-implementation trick",
  /import \{ step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit \} from "@\/domain\/tracedFsm"/.test(domain) &&
  /dispatchPreflight/.test(domain) && /dispatchBuild/.test(domain) && /dispatchCommit/.test(domain) && /dispatchRefused/.test(domain));

ok("dispatchPreflight demands a real order list, not mere sessions — two fences, its own shape",
  /rx\.length > 0/.test(domain) && /sessions > 0/.test(domain) && /dispatchPreflight = \(s: DispatchState, rx/.test(domain));

ok("verifyDispatchText pins every numeral against the envelope — including each var numeral the orders carry",
  /dispatchEvidence/.test(domain) && /verifyDispatchText/.test(domain) && /Object\.values\(r\.vars\)/.test(domain) && /digitCount > 8/.test(domain));

ok("the refusal vocabulary is imported from the analyst, never re-spelled",
  /import type \{ AnalystViolation as DispatchViolation \} from "\.\/analyst"/.test(domain) && !/export type DispatchViolation = /.test(domain));

ok("the named order is inked on the ladder — an rx id from the answer is matched against the prescribed list",
  /orderedRx/.test(ops) && /dispatchOrderIds\(rx\)\.includes\(picked\[0\]\)/.test(ops) && /ops\.dispatch\.orderedLabel/.test(ops));

ok("the screen consumes the FSM wiring; nothing re-ships a second reasoning loop",
  /askDispatch/.test(ops) && /dispatchPreflight\(/.test(ops) && /dispatchEnvelope\(/.test(ops) && /t\(DISPATCH_FOLD_ANSWER_KEY\)/.test(ops));

ok("keyless arm prints one honest note, never a fake streaming rail",
  /\{LLM_CONFIG\.hasKey \?/.test(ops) && /ops\.dispatch\.via\.local/.test(ops));

ok("refusal swap is visible, not silent — the fold's own words stand in",
  /DISPATCH_FOLD_ANSWER_KEY/.test(domain) && /ops\.dispatch\.foldAnswer\.intro/.test(readFileSync("i18n/dictionaries.ts", "utf8")));

ok("the trace rail uses the usual keys riding the usual door",
  /ops\.dispatch\.stage\./.test(ops) && /ops\.dispatch\.note\./.test(ops) && /ops\.dispatch\.violation\./.test(ops));

// Plant: arm the verifier with a hostile signal — should trip the prediction door.
const plantedFuture = "the wall will fall in 2027 and the championship is guaranteed";
ok("plant: a planted futurology string trips the prediction door", /will/i.test(plantedFuture) && /guaranteed/i.test(plantedFuture));

// i18n presence: all three locales coin every new dispatch key
const dict = readFileSync("i18n/dictionaries.ts", "utf8");
for (const key of [
  "ops.dispatch.kicker", "ops.dispatch.title", "ops.dispatch.ask", "ops.dispatch.via.local", "ops.dispatch.foldAnswer.intro", "ops.dispatch.orderedLabel", "ops.dispatch.ledgerNote",
  "ops.dispatch.trace.label", "ops.dispatch.trace.verified", "ops.dispatch.trace.refused",
  "ops.dispatch.stage.preflight", "ops.dispatch.stage.build", "ops.dispatch.stage.model", "ops.dispatch.stage.precommit", "ops.dispatch.stage.commit", "ops.dispatch.stage.refused", "ops.dispatch.stage.done",
  "ops.dispatch.note.dispatchOn", "ops.dispatch.note.ordersSealed", "ops.dispatch.note.commitOk", "ops.dispatch.note.foldOk", "ops.dispatch.note.precommitRefused",
  "ops.dispatch.violation.offEvidence", "ops.dispatch.violation.prediction", "ops.dispatch.violation.tooManyNumbers",
]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp('"' + key.replace(/\./g, "\\.") + '":', "g")) ?? []).length === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
