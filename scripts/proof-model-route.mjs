// M1219 · The Cartographer — the model chooses WHICH lens the StateGraph walks into.
// Door 13 let the model choose answer-vs-abstain. Here it also chooses the branch itself:
// one frozen routing envelope carries all three sealed shelves, the model writes
// `LENS:<id>` on line one, and the graph enters that lens before the shared numeral
// verifier is allowed to commit. An unrecognised directive cannot reach a commit.
// M1221 adds a SECOND model-driven edge: CHECK:<lens> names a different shelf that must
// carry the same claim, else the graph walks the contested arm and the fold answers.
// Run: node scripts/proof-model-route.mjs
import { readFileSync } from "node:fs";
import { createServer } from "vite";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const W = await server.ssrLoadModule("/domain/witnessBench.ts");
const { DICTIONARIES } = await server.ssrLoadModule("/i18n/dictionaries.ts");

// ---- strict directive parsing ------------------------------------------------
const cases = [
  ["LENS:crown\nAtletico 70 pts.", "crown", "answer"],
  ["LENS:chase\nThe gap is 8.", "chase", "answer"],
  ["LENS:form\nrecent runs", "form", "answer"],
  ["[ABSTAIN]", null, "abstain"],
  ["  abstain — no support", null, "abstain"],
];
for (const [text, lens, route] of cases) {
  const got = W.parseBenchDirective(text);
  ok(`directive ${JSON.stringify(text.slice(0, 24))} → ${lens ?? route}`, got && got.lens === lens && got.route === route);
}
for (const bad of ["LENS:world\nstuff", "the lens is crown", "CROWN", "LENS:crownish", ""]) {
  ok(`unusable directive ${JSON.stringify(bad)} is refused`, W.parseBenchDirective(bad) === null);
}
ok("a directive buried in prose is not a route", W.parseBenchDirective("We think LENS:crown is fine.") === null);

// ---- M1221: the second edge names a DIFFERENT sealed shelf -------------------
const crossCases = [
  ["CHECK:crown\nsecond shelf", "crown", "answer"],
  ["CHECK:chase\nsecond shelf", "chase", "answer"],
  ["CHECK:form\nsecond shelf", "form", "answer"],
  ["ABSTAIN", null, "abstain"],
];
for (const [text, lens, route] of crossCases) {
  const got = W.parseCrossDirective(text);
  ok(`cross directive ${JSON.stringify(text.slice(0, 22))} → ${lens ?? route}`, got && got.lens === lens && got.route === route);
}
for (const bad of ["CHECK:world\nstuff", "check crown", "the check is form", ""]) {
  ok(`unusable cross directive ${JSON.stringify(bad)} is refused`, W.parseCrossDirective(bad) === null);
}
ok("a CHECK: mention buried in prose is not a cross route", W.parseCrossDirective("We might CHECK:form later.") === null);
ok("the cross directive line is stripped before the shared verifier reads the prose",
  W.stripCrossDirective("CHECK:form\nCity lead with 37 points.") === "City lead with 37 points." &&
  W.stripCrossDirective("ABSTAIN\nfold text") === "fold text");

// ---- the graph records the edge the model chose ------------------------------
const desk = W.benchBuild(W.benchPreflight(W.createBench("crown", "en")));
const chosen = W.benchModelChose(desk, "chase", "LENS:chase");
ok("the chosen lens is written into state, not just the prose", chosen.lens === "chase" && chosen.chosenBy === "model");
ok("the chosen lens is a traced graph edge", chosen.status === "precommit" && chosen.trace.at(-1).stage === "model" && chosen.trace.at(-1).note === "modelChoseLens");
const invalid = W.benchModelRouteInvalid(desk, "LENS:nowhere");
ok("an unusable directive walks the refused arm", invalid.status === "refused" && invalid.trace.at(-1).verdict === "refused" && invalid.trace.at(-1).note === "modelRouteInvalid");
ok("the committed answer still rides the shared verifier — a planted numeral is refused",
  W.verifyBenchText("", W.benchEnvelope("crown")).length === 0 &&
  W.verifyBenchText("999999", W.benchEnvelope("crown")).includes("offCorpus"));
// M1219 live defect: compact JSON arrays used to fuse [1,37,15] into 13715, so a truthful
// sentence naming 37 was refused. The exact answer the real model gave is now a gate.
const truthful = "In the Premier League, Manchester City lead with 37 points, 10 ahead of Chelsea.";
ok("a truthful sentence about the chosen shelf passes; the same sentence with an invented gap does not",
  W.verifyBenchText(truthful, W.benchEnvelope("chase")).length === 0 &&
  W.verifyBenchText(truthful.replace("10 ahead", "99 ahead"), W.benchEnvelope("chase")).includes("offCorpus"));

// ---- M1221: the second shelf's verdict drives a real graph arm --------------
const crossChosen = W.benchCrossChose(W.benchCommit(W.benchPrecommit(chosen, "pass"), truthful), "form");
ok("the second shelf is written into state as a traced model edge",
  crossChosen.crossLens === "form" && crossChosen.status === "precommit" &&
  crossChosen.trace.at(-1).note === "crossChoseLens" && crossChosen.chosenBy === "model");
const corroborated = W.benchCrossCorroborated(crossChosen, "recent runs agree");
ok("a corroborated claim commits with its own trace note",
  corroborated.status === "commit" && corroborated.crossVerdict === "corroborated" &&
  corroborated.trace.at(-1).note === "crossCorroborated" && corroborated.answer === "recent runs agree");
const contested = W.benchCrossContested(crossChosen, "the fold answers");
ok("a contested claim walks the refused arm and keeps the fold's words",
  contested.status === "refused" && contested.crossVerdict === "contested" &&
  contested.trace.at(-1).note === "crossContested" && contested.answer === "the fold answers");
const badCross = W.benchCrossRouteInvalid(crossChosen, "the fold answers");
ok("an unusable cross directive walks the refused arm",
  badCross.status === "refused" && badCross.trace.at(-1).note === "crossRouteInvalid");
const crossAbstain = W.benchCrossAbstained(crossChosen, "the fold answers");
ok("a cross abstention walks the refused arm",
  crossAbstain.status === "refused" && crossAbstain.crossVerdict === "contested" &&
  crossAbstain.trace.at(-1).note === "crossAbstained");
const firstShelfOnly = "The table shows 11 points.";
ok("a claim the first shelf allows can be contested by the second shelf's own numerals",
  W.verifyBenchText(firstShelfOnly, W.benchEnvelope("chase")).length === 0 &&
  W.verifyBenchText(firstShelfOnly, W.benchEnvelope("form")).includes("offCorpus"));

// ---- one sealed routing envelope, three frozen shelves ----------------------
const screen = readFileSync("features/wirediary/Cartographer.tsx", "utf8");
const routed = (screen.match(/benchEnvelope\(/g) || []).length;
ok(`the routing envelope is built from all three frozen shelves (${routed} envelope reads)`, routed >= 3);
ok("the routing envelope is derived from the lens list, never handwritten", /Object\.fromEntries\(WITNESS_LENSES\.map\(\(id\) => \[id, benchEnvelope\(id\)\]\)\)/.test(screen));
ok("the model-facing prompt is wrapped in the ONE world book (same cache lane)", /withWorldBook\(\[[\s\S]*?ROUTING ENVELOPE/.test(screen));
ok("the model is told the directive contract verbatim", /LENS:crown, LENS:chase or LENS:form/.test(screen) && /ABSTAIN/.test(screen));
ok("the chosen directive is parsed before any commit", /parseBenchDirective\(result\.text\)/.test(screen));
ok("the directive line is stripped before the numeral verifier sees the prose", /stripBenchDirective\(result\.text\)/.test(screen));
ok("the answer is verified against the CHOSEN lens envelope", /verifyBenchText\(prose, envelope\)/.test(screen) && /const envelope = benchEnvelope\(lens\)/.test(screen));
ok("a model-chosen answer cannot skip the precommit gate", /benchCommit\(benchPrecommit\(chosen, "pass"/.test(screen) && /benchRefused\(benchPrecommit\(chosen, "refused"/.test(screen));
ok("exactly two streaming calls serve the two graph edges (routing + cross-examination)",
  (screen.match(/callLlmStream\(/g) ?? []).length === 2);
ok("both edges share the ONE world-book prefix so the cache lane stays byte-stable",
  (screen.match(/withWorldBook\(\[/g) ?? []).length === 2 && /const routingEnvelope = Object\.fromEntries\(WITNESS_LENSES\.map/.test(screen) &&
  /JSON\.stringify\(routingEnvelope, null, 2\)/.test(screen) && /ALL SEALED SHELVES/.test(screen));

// ---- M1221: the second edge is wired to the same verifier and honest arms ---
ok("the cross directive is parsed before any second commit", /parseCrossDirective\(result\.text\)/.test(screen));
ok("the cross directive line is stripped before the verifier", /stripCrossDirective\(result\.text\)/.test(screen));
ok("the cross prose AND the first claim are re-proved against the second shelf",
  /verifyBenchText\(secondProse, secondEnvelope\)/.test(screen) && /verifyBenchText\(claim, secondEnvelope\)/.test(screen));
ok("a same-shelf second directive is refused", /directive\.lens === firstLens/.test(screen) && /benchCrossRouteInvalid/.test(screen));
ok("an abstaining or failed second call takes the contested arm",
  (screen.match(/benchCrossAbstained\(/g) ?? []).length >= 3 && /result\.ok/.test(screen));
ok("a corroborated answer still walks the commit stage through the cross edge",
  /benchCrossCorroborated\(chosen, secondProse\)/.test(screen) && /benchCrossChose\(deskState, other\)/.test(screen));
ok("the second button stays available on the keyless arm so the contested outcome is observable",
  /\{deskState && \(/.test(screen) && /const firstLens = lens \?\? "crown"/.test(screen));

// ---- trilingual copy, no mixed language -------------------------------------
const keys = [
  "witnessBench.ask.model", "witnessBench.badge.modelChosen", "witnessBench.badge.modelInvalid",
  "library.door.note.modelChoseLens", "library.door.note.modelRouteInvalid",
  "nav.cartographer", "cartographer.kicker", "cartographer.title", "cartographer.subtitle",
  "cartographer.hint", "cartographer.picked", "cartographer.method",
  "cartographer.cross.ask", "cartographer.cross.picked", "cartographer.badge.corroborated", "cartographer.badge.contested",
  "library.door.note.crossChoseLens", "library.door.note.crossCorroborated", "library.door.note.crossContested",
  "library.door.note.crossRouteInvalid", "library.door.note.crossAbstained",
];

for (const locale of ["en", "zh-CN", "zh-TW"]) {
  const missing = keys.filter((k) => !DICTIONARIES[locale][k]);
  ok(`${locale} carries all five cartographer keys (missing: ${missing.join(", ") || "none"})`, missing.length === 0);
  if (locale === "en") {
    const cjk = keys.filter((k) => /[\u4e00-\u9fff]/.test(DICTIONARIES.en[k] || ""));
    ok(`English cartographer copy has zero CJK (${cjk.join(", ") || "none"})`, cjk.length === 0);
  } else {
    const nonZh = keys.filter((k) => /[A-Za-z]{4,}/.test((DICTIONARIES[locale][k] || "").replace("LENS", "")));
    ok(`${locale} cartographer copy is Chinese (${nonZh.join(", ") || "none"})`, nonZh.length === 0);
  }
}

const e2e = readFileSync("tests/e2e/cartographer.spec.ts", "utf8");
ok("the offline E2E sees the model-chooses button", /the model chooses the lens|模型选择视角|模型選擇視角/i.test(e2e));
const crossE2e = readFileSync("tests/e2e/cartographer-cross.spec.ts", "utf8");
ok("the cross-examination E2E refuses the transport and asserts the contested arm",
  /503/.test(crossE2e) && /cartographer\.badge\.contested|cannot corroborate/.test(crossE2e) &&
  /cross-examine the claim|交叉质询/.test(crossE2e));

await server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
