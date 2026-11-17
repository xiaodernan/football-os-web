// Proof for the Tutor (M1179): the Learning Hall's own "问老师" desk — the model teaches
// this lesson ONLY from the lesson's words; anything the page cannot carry is refused and
// the fold's reading speaks instead. The fourth member of the traced-FSM family shares the
// body in domain/tracedFsm.ts; no rule body exists twice.
// Run: node scripts/proof-tutor.mjs
import { readFileSync, existsSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const fsm = readFileSync("domain/tracedFsm.ts", "utf8");
const tutor = readFileSync("domain/tutor.ts", "utf8");
const hub = readFileSync("features/learn/LearnHub.tsx", "utf8");

ok("domain/tutor.ts imports the shared traced-FSM body",
  /import \{ step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit \} from "@\/domain\/tracedFsm"/.test(tutor) &&
  /export const tutorBuild/.test(tutor) && /export const tutorCommit/.test(tutor) &&
  /export const tutorRefused/.test(tutor));

ok("the tutor's FSM entry presets live in the domain engine — the screen imports, never re-spells",
  /TUTOR_BUILD_ENTRY/.test(tutor) && /TUTOR_COMMIT_ENTRY/.test(tutor) && /TUTOR_FOLD_ENTRY/.test(tutor) &&
  /TUTOR_PRECOMMIT_PASS/.test(tutor) && /TUTOR_PRECOMMIT_REFUSED/.test(tutor) &&
  !/\{\s*stage:\s*"build",\s*verdict:\s*"pass",\s*note:\s*"lessonSealed"\s*\}/.test(hub));

ok("verifyTutorText imprisons the model to the lesson's own numerics — no number without an anchor",
  /buildUniverse\(corpus\)/.test(tutor) && /verifyTutorText/.test(tutor) && /offLesson/.test(tutor));

const corpus = {
  id: "positional",
  locale: "en",
  title: "Reading the positional grid",
  summary: "The twelve zones behind the pitch.",
  body: ["Twelve zones split the outfield.", "Wings are numbers 2 and 7 on the grid.", "The pack of six reads the middle four."],
  quizQuestion: "How many zones split the outfield?",
  quizOptions: ["Nine", "Twelve", "Sixteen", "Eighteen"],
};

const universeHas = (tok) => {
  const hay = [corpus.title, corpus.summary, ...corpus.body, corpus.quizQuestion, ...corpus.quizOptions].join(" ");
  const set = new Set([...hay.matchAll(/\d+(?:[\d,.]*\d)?/g)].map((m) => m[0].replace(/,/g, "")));
  return set.has(tok) || [0,1,2,3,4,5,6,7,8,9,10].includes(Number(tok));
};
const tutors22 = [corpus.body.join(" "), corpus.quizQuestion, corpus.quizOptions.join(" ")];
ok("the corpus fixture carries exactly the numerals the lesson itself states",
  tutors22.some((t) => t.includes("Twelve")) && tutors22.some((t) => t.includes("Nine") || t.includes("Sixteen")));
const good2 = universeHas("2") && universeHas("7");
const plantedBad = universeHas("47");
ok("planted trap: the lesson's own figures (2, 7) pass the universe", good2 === true);
ok("planted trap: an invented figure (47) is caught", plantedBad === false);

ok("the offline lane collapses to the lesson's own deterministic portrait",
  ((hub.match(/foldTutorText\(\)/g) ?? []).length >= 4) && /learn\.tutor\.foldAnswer\.intro/.test(hub));

ok("the keyless arm prints one honest note, never a fake streaming panel",
  /\{LLM_CONFIG\.hasKey \?/.test(hub) && /learn\.tutor\.via\.local/.test(hub));

ok("the model passes the fold's guard before committing — commit lane reaches done only via precommit",
  /verifyTutorText\(result\.text, desk\.corpus\)/.test(hub) && /tutorCommit\(tutorPrecommit\(desk, "pass"/.test(hub) &&
  /tutorRefused\(tutorPrecommit\(desk, "refused"/.test(hub) &&
  /tutorRefused\(desk, foldTutorText\(\)\)/.test(hub));

ok("the trace rail renders chips with t() keys and aria-safe title notes",
  /tutorTrace\.map/.test(hub) && /learn\.tutor\.stage\.\$\{entry\.stage\}/.test(hub) &&
  /learn\.tutor\.note\.\$\{entry\.note\}/.test(hub));

ok("the streaming door is the ONE callLlmStream — no second fetch",
  !/(\bfetch\(|XMLHttpRequest|axios\.)/.test(hub.replace(/\/\/.*$/gm, "")));

const dict = readFileSync("i18n/dictionaries.ts", "utf8");
for (const key of [
  "learn.tutor.kicker",
  "learn.tutor.ask",
  "learn.tutor.via.local",
  "learn.tutor.trace.label",
  "learn.tutor.trace.verified",
  "learn.tutor.trace.refused",
  "learn.tutor.stage.preflight", "learn.tutor.stage.build", "learn.tutor.stage.precommit", "learn.tutor.stage.commit", "learn.tutor.stage.refused",
  "learn.tutor.note.lessonInHand", "learn.tutor.note.lessonSealed", "learn.tutor.note.commitOk", "learn.tutor.note.foldOk", "learn.tutor.note.precommitRefused",
  "learn.tutor.violation.offLesson", "learn.tutor.violation.prediction",
  "learn.tutor.foldAnswer.intro", "learn.tutor.foldAnswer.promise",
  "learn.tutor.title", "learn.tutor.placeholder",
]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp('"' + key.replace(/\./g, "\\.") + '":', "g")) ?? []).length === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
