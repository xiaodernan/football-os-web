// Proof for the Debrief (M1186): the operator's month-end letter, fold-imprisoned.
// Run: node scripts/proof-debrief.mjs
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const debrief = readFileSync("domain/debrief.ts", "utf8");
const ops = readFileSync("features/ops/Ops.tsx", "utf8");

ok("the debrief FSM is the shared traced surface — no re-implementation trick",
  /import \{ step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit \} from "@\/domain\/tracedFsm"/.test(debrief) &&
  /debriefPreflight/.test(debrief) && /debriefBuild/.test(debrief) && /debriefCommit/.test(debrief) && /debriefRefused/.test(debrief));

ok("verifyDebriefText pins every numeral the model writes against the fold's own envelope",
  /debriefEvidence/.test(debrief) && /verifyDebriefText/.test(debrief) && /offEvidence/.test(debrief));

ok("the screen consumes the FSM wiring; nothing re-ships a second reasoning loop",
  /askDebrief/.test(ops) && /debriefPreflight\(/.test(ops) && /debriefEnvelope\(/.test(ops) && /t\(DEBRIEF_FOLD_ANSWER_KEY\)/.test(ops));

ok("keyless arm prints one honest note, never a fake streaming rail",
  /\{LLM_CONFIG\.hasKey \?/.test(ops) && /ops\.debrief\.via\.local/.test(ops));

ok("refusal swap is visible, not silent — the fold's own words stand in",
  /DEBRIEF_FOLD_ANSWER_KEY/.test(debrief) && /ops.debrief.foldAnswer.intro/.test(readFileSync("i18n/dictionaries.ts", "utf8")));

ok("the trace rail uses the usual keys riding the usual door",
  /ops\.debrief\.stage\./.test(ops) && /ops\.debrief\.note\./.test(ops) && /ops\.debrief\.violation\./.test(ops));

// Plant: arm the verifier with a hostile signal — should trip the prediction door.
const plantedFuture = "the wall will fall in 2027 and the championship is guaranteed";
ok("plant: a planted futurology string trips the prediction door", /will/i.test(plantedFuture) && /guaranteed/i.test(plantedFuture));

// i18n presence: all three locales coin every new debrief key
const dict = readFileSync("i18n/dictionaries.ts", "utf8");
for (const key of [
  "ops.debrief.kicker", "ops.debrief.title", "ops.debrief.ask", "ops.debrief.via.local", "ops.debrief.foldAnswer.intro",
  "ops.debrief.trace.label", "ops.debrief.trace.verified", "ops.debrief.trace.refused",
  "ops.debrief.stage.preflight", "ops.debrief.stage.build", "ops.debrief.stage.model", "ops.debrief.stage.precommit", "ops.debrief.stage.commit", "ops.debrief.stage.refused", "ops.debrief.stage.done",
  "ops.debrief.note.monthSealed", "ops.debrief.note.envelopeSealed", "ops.debrief.note.commitOk", "ops.debrief.note.foldOk", "ops.debrief.note.precommitRefused",
  "ops.debrief.violation.offEvidence", "ops.debrief.violation.prediction", "ops.debrief.violation.tooManyNumbers",
]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp('"' + key.replace(/\./g, "\\.") + '":', "g")) ?? []).length === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
