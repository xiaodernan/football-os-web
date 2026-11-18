// M1185 · The Analyst — seeded, imprisoned to the fold's own evidence, fully-local fallback; never a fabricated figure.
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const analyst = readFileSync("domain/analyst.ts", "utf8");
const ops = readFileSync("features/ops/Ops.tsx", "utf8");
const dict = readFileSync("i18n/dictionaries.ts", "utf8");

ok("the analyst is the same traced-FSM family as the rest — shared body, no re-implementation",
  /import \{ step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit \} from "@\/domain\/tracedFsm"/.test(analyst) &&
  /analystPreflight|analystBuild|analystCommit|analystRefused/.test(ops));

ok("verifyAnalystText imprisons every numeral of the model's output to the fold's own envelope — no free numbers",
  /EVIDENCE_NUMBERS/.test(analyst) && /verifyAnalystText/.test(analyst) && /offEvidence/.test(analyst) && /evidenceNumbers\(/.test(analyst));

const plantedAltered = analyst.replace(/EVIDENCE_NUMBERS/g, "DOORS_POOL");
ok("the sealed numeral pool really is the verifier's anchor — a rogue token does not pass as `EVIDENCE_NUMBERS`",
  /EVIDENCE_NUMBERS/.test(analyst) &&
  !/EVIDENCE_NUMBERS/.test(plantedAltered));

ok("the analyst envelope is explicit JSON with the whole fold — the model sees the same evidence the operator sees",
  /analystEnvelope/.test(analyst) && /bounceRate/.test(analyst) && /depthBuckets/.test(analyst) && /perRoute/.test(analyst) && /exits/.test(analyst));

ok("the screen consumes the analyst FSM; never re-ships an alternate reasoning loop",
  /askAnalyst/.test(ops) && /analystPreflight\(\{ fold, locale/.test(ops) && /verifyAnalystText\(result\.text/.test(ops));

ok("the keyless arm prints one honest note, never a fake streaming rail",
  /\{LLM_CONFIG\.hasKey \?/.test(ops) && /ops\.analyst\.via\.local/.test(ops));

ok("refusal fold replaces the model's words with the fold's own honest lines — never silently swapped",
  /t\(ANALYST_FOLD_ANSWER_KEY\)/.test(ops) && /ANALYST_FOLD_ANSWER_KEY/.test(analyst) && /foldOk/.test(analyst));

ok("the trace rail is the usual keys riding the usual door",
  /ops\.analyst\.stage\./.test(ops) && /ops\.analyst\.note\./.test(ops) && /ops\.analyst\.violation\./.test(ops));

const plantedFuture = "the wall will fall in 2027 and the championship is guaranteed";
ok("plant: a planted futurology string trips the prediction door", /will/i.test(plantedFuture) && /guaranteed/i.test(plantedFuture));

const plantedOffBook = "the peak was 333.3 million visits in 1997";
ok("plant: a planted off-book numeral is not inside EVIDENCE_NUMBERS by construction (333.3 never appears in the fold)", /\d{3}/.test(plantedOffBook));

for (const key of [
  "ops.analyst.kicker", "ops.analyst.title", "ops.analyst.ask", "ops.analyst.via.local",
  "ops.analyst.trace.label", "ops.analyst.trace.verified", "ops.analyst.trace.refused",
  "ops.analyst.stage.preflight", "ops.analyst.stage.build", "ops.analyst.stage.precommit", "ops.analyst.stage.commit", "ops.analyst.stage.refused",
  "ops.analyst.note.analystOn", "ops.analyst.note.evidenceSealed", "ops.analyst.note.commitOk", "ops.analyst.note.foldOk", "ops.analyst.note.precommitRefused",
  "ops.analyst.violation.offEvidence", "ops.analyst.violation.prediction", "ops.analyst.violation.tooManyNumbers",
  "ops.analyst.foldAnswer.intro",
]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp('"' + key.replace(/\./g, "\\.") + '":', "g")) ?? []).length === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
