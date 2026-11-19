// M1219 · The Cartographer — the model chooses WHICH lens the StateGraph walks into.
// Door 13 let the model choose answer-vs-abstain. Here it also chooses the branch itself:
// one frozen routing envelope carries all three sealed shelves, the model writes
// `LENS:<id>` on line one, and the graph enters that lens before the shared numeral
// verifier is allowed to commit. No unrecognised directive can reach a commit.
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
ok("one streaming call serves the whole routing door", (screen.match(/callLlmStream\(/g) ?? []).length === 1);

// ---- trilingual copy, no mixed language -------------------------------------
const keys = [
  "witnessBench.ask.model", "witnessBench.badge.modelChosen", "witnessBench.badge.modelInvalid",
  "library.door.note.modelChoseLens", "library.door.note.modelRouteInvalid",
  "nav.cartographer", "cartographer.kicker", "cartographer.title", "cartographer.subtitle",
  "cartographer.hint", "cartographer.picked", "cartographer.method",
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

await server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
