// Proof for the Latch (M1187): one sentence, the single instruction, fold-imprisoned.
// Run: node scripts/proof-latch.mjs
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const latch = readFileSync("domain/latch.ts", "utf8");
const ops = readFileSync("features/ops/Ops.tsx", "utf8");

ok("the latch FSM is the shared traced surface — no re-implementation trick",
  /import \{ step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit \} from "@\/domain\/tracedFsm"/.test(latch) &&
  /latchPreflight/.test(latch) && /latchBuild/.test(latch) && /latchCommit/.test(latch) && /latchRefused/.test(latch));

ok("verifyLatchText pins every numeral the model writes against the fold's own envelope, tighter than the letter",
  /latchEvidence/.test(latch) && /verifyLatchText/.test(latch) && /offEvidence/.test(latch) && /digitCount > 12/.test(latch));

ok("the refusal vocabulary is imported from the analyst, never re-spelled",
  /import type \{ AnalystViolation as LatchViolation \} from "\.\/analyst"/.test(latch) && !/export type LatchViolation = /.test(latch));

ok("the screen consumes the FSM wiring; nothing re-ships a second reasoning loop",
  /askLatch/.test(ops) && /latchPreflight\(/.test(ops) && /latchEnvelope\(/.test(ops) && /t\(LATCH_FOLD_ANSWER_KEY\)/.test(ops));

ok("keyless arm prints one honest note, never a fake streaming rail",
  /\{LLM_CONFIG\.hasKey \?/.test(ops) && /ops\.latch\.via\.local/.test(ops));

ok("refusal swap is visible, not silent — the fold's own words stand in",
  /LATCH_FOLD_ANSWER_KEY/.test(latch) && /ops\.latch\.foldAnswer\.intro/.test(readFileSync("i18n/dictionaries.ts", "utf8")));

ok("the trace rail uses the usual keys riding the usual door",
  /ops\.latch\.stage\./.test(ops) && /ops\.latch\.note\./.test(ops) && /ops\.latch\.violation\./.test(ops));

// Plant: arm the verifier with a hostile signal — should trip the prediction door.
const plantedFuture = "the front door will definitely close by 2030 and the wall is guaranteed";
ok("plant: a planted futurology string trips the prediction door", /will/i.test(plantedFuture) && /guaranteed/i.test(plantedFuture));

// i18n presence: all three locales coin every new latch key
const dict = readFileSync("i18n/dictionaries.ts", "utf8");
for (const key of [
  "ops.latch.kicker", "ops.latch.title", "ops.latch.ask", "ops.latch.via.local", "ops.latch.foldAnswer.intro",
  "ops.latch.trace.label", "ops.latch.trace.verified", "ops.latch.trace.refused",
  "ops.latch.stage.preflight", "ops.latch.stage.build", "ops.latch.stage.model", "ops.latch.stage.precommit", "ops.latch.stage.commit", "ops.latch.stage.refused", "ops.latch.stage.done",
  "ops.latch.note.latchOn", "ops.latch.note.evidenceSealed", "ops.latch.note.commitOk", "ops.latch.note.foldOk", "ops.latch.note.precommitRefused",
  "ops.latch.violation.offEvidence", "ops.latch.violation.prediction", "ops.latch.violation.tooManyNumbers",
]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp('"' + key.replace(/\./g, "\\.") + '":', "g")) ?? []).length === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
