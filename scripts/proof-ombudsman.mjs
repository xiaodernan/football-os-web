// M1226 · Proof for The Forecast Ombudsman: the model audits its OWN recorded forecast against
// a LATER measured hour, must name the deterministic grade, write a three-part minute and pass
// the SHARED replay numeral door. Publish and contest are explicit human edges. No causal claim.
// Run: node scripts/proof-ombudsman.mjs
import { readFileSync } from "node:fs";
import { createServer } from "vite";

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? " — " + detail : "")); }
};

const domain = readFileSync("domain/rxCouncil.ts", "utf8");
const ops = readFileSync("features/ops/Ops.tsx", "utf8");
const dict = readFileSync("i18n/dictionaries.ts", "utf8");

ok("the ombudsman is built on the shared traced FSM, never a second hand-rolled loop",
  /from "@\/domain\/tracedFsm"/.test(domain) &&
  ["step", "fsmBuild", "fsmCommit", "fsmRefused"].every((s) => domain.includes(s)));
ok("the audit envelope reuses the sealed replay provenance fold",
  /replayEnvelope\(later, law\)/.test(domain) && !/Math\.random/.test(domain));
ok("the grade is a deterministic comparison, not a model opinion",
  /gradeForecast/.test(domain) && /gradeForecast\(councilForecast, replay\)/.test(ops) && /EXPECTED GRADE:/.test(ops));
ok("exactly one streamed call audits the forecast from the world-book lane",
  ((ops.split("const askOmbudsman = async () => {")[1] ?? "").split("\n  const decideOmbudsman")[0]
    .match(/callLlmStream\(/g) ?? []).length === 1 &&
  /withWorldBook\(\[/.test(ops) && /LLM_CONFIG\.hasKey/.test(ops));
ok("the first line is taught verbatim: GRADE:<hit|near|miss> or a bare ABSTAIN",
  /FIRST LINE: exactly GRADE:/.test(ops) && /Or write ABSTAIN alone/.test(ops));
ok("the three sections are taught in one fixed order",
  /FORECAST: \/ OBSERVATION: \/ BOUNDARY: in that order/.test(ops) &&
  /\["FORECAST:", "OBSERVATION:", "BOUNDARY:"\]/.test(domain));
ok("a mismatch, an unusable first line or a failed numeral walks a refused arm",
  /auditGradeMismatch/.test(ops) && /auditInvalid/.test(ops) &&
  /auditStructureRefused/.test(ops) && /auditNumeralsRefused/.test(ops) && /auditFold/.test(ops));
ok("publish and contest are two explicit human edges on a proved, undecided graph",
  /auditPublish/.test(ops) && /auditContest/.test(ops) &&
  /ombudsDesk\?\.status === "commit" && ombudsDesk\.decision === null/.test(ops));
ok("this door writes only its own note ledger, never the pulse ring",
  /writeJson\(browserStore\(\), OM_KEY,/.test(ops) && !/writeJson\([^\n]*PULSE_KEY/.test(ops));
ok("the minute is explicitly forbidden from claiming causation",
  /never claim the prescription caused the measurement/.test(ops) && /no causal claim/.test(dict));

const keys = [
  "ops.ombudsman.kicker", "ops.ombudsman.title", "ops.ombudsman.subtitle", "ops.ombudsman.ask",
  "ops.ombudsman.empty", "ops.ombudsman.fold", "ops.ombudsman.expected", "ops.ombudsman.forecast",
  "ops.ombudsman.observation", "ops.ombudsman.violations", "ops.ombudsman.publish",
  "ops.ombudsman.contest", "ops.ombudsman.recorded", "ops.ombudsman.decision",
  "ops.ombudsman.stategraph", "ops.ombudsman.method", "ops.ombudsman.trace.label",
  ...["verified", "folded", "invalid", "abstained", "mismatched", "published", "contested"]
    .map((k) => `ops.ombudsman.badge.${k}`),
  ...["windowSealed", "modelGraded", "gradeInvalid", "modelAbstained", "gradeMismatch",
    "structurePassed", "structureRefused", "numeralsPassed", "numeralsRefused", "published",
    "contested", "foldOk"].map((k) => `ops.ombudsman.note.${k}`),
];
for (const key of keys) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp('"' + key.replace(/\./g, "\\.") + '":', "g")) ?? []).length === 3);
}

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
try {
  const rx = await server.ssrLoadModule("/domain/rxCouncil.ts");
  const replayM = await server.ssrLoadModule("/domain/replay.ts");
  const rxM = await server.ssrLoadModule("/domain/prescription.ts");
  const now = 1_800_000_000_000;
  const visits = [
    { path: "/", at: now - 3_000_000, dwellMs: 1_000 },
    { path: "/football", at: now - 2_900_000, dwellMs: 40_000 },
    { path: "/library", at: now - 2_800_000, dwellMs: 20_000 },
    { path: "/", at: now - 900_000, dwellMs: 2_000 },
    { path: "/ops", at: now - 800_000, dwellMs: 1_000 },
  ];
  const snap = replayM.replayFold(visits, now);
  const offerings = rx.offerPrescriptions(rxM.foldPrescription(snap.recorded));
  const forecast = rx.forecastFrom(snap, offerings[0], "en");
  const law = /const COUNCIL_LAW = "([^"]+)"/.exec(ops)?.[1] ?? "";
  const later = {
    ...snap,
    windowEnd: snap.windowEnd + 1000,
    anomalies: snap.anomalies.map((a) => ({ ...a, measured: a.measured + 1 })),
  };
  const score = rx.gradeForecast(forecast, later);
  const env = rx.auditEnvelope(forecast, later, law);
  const envText = JSON.stringify(env);

  ok("the audit envelope IS the replay envelope plus prediction and observation",
    /"source":"measured"/.test(envText) && /"source":"simulated"/.test(envText) &&
    /"source":"prediction"/.test(envText) &&
    env.forecast?.predicted === forecast.predicted && env.observation?.measured === score.actual);
  ok("the provenance law is printed inside the envelope", /Keep measured and simulated apart/.test(env.law));
  ok("the graded forecast still maps hit, near and miss honestly",
    ["hit", "near", "miss"].includes(score.verdict) &&
    rx.gradeForecast(forecast, { ...later, anomalies: [{ id: forecast.anomaly, measured: forecast.predicted }] }).verdict === "hit");

  ok("GRADE is the first-line graph edge", rx.parseAuditDirective(`GRADE:${score.verdict}\nprose`, undefined).grade === score.verdict);
  ok("ABSTAIN is a real refused arm, not a parse failure", rx.parseAuditDirective("ABSTAIN").route === "abstain");
  ok("a directive buried on line two is refused", rx.parseAuditDirective(`prose\nGRADE:${score.verdict}`) === null);
  ok("a foreign grade is refused", rx.parseAuditDirective("GRADE:perfect") === null);
  ok("the directive is stripped before the numeral check",
    rx.stripAuditDirective(`GRADE:${score.verdict}\nonly this survives`) === "only this survives");

  const minute = (grade) => `GRADE:${grade}\nFORECAST: the prediction was ${score.forecast}\nOBSERVATION: the measured figure was ${score.actual}\nBOUNDARY: this compares a forecast with an observation`;
  const prose = rx.stripAuditDirective(minute(score.verdict));
  ok("a well-formed three-section minute passes the structure verifier", rx.verifyAuditStructure(prose) === true);
  ok("the wrong section order is refused", rx.verifyAuditStructure("OBSERVATION: x\nFORECAST: y\nBOUNDARY: z") === false);
  ok("a missing section is refused", rx.verifyAuditStructure("FORECAST: x\nOBSERVATION: y") === false);
  ok("an overlong minute is refused", rx.verifyAuditStructure(Array.from({ length: 90 }, () => "word").join(" ")) === false);

  const empty = rx.auditPreflight(rx.createOmbudsman("en"), null, later);
  ok("a missing forecast is a real preflight refusal", empty.status === "refused" && empty.trace.at(-1).note === "foldOk");
  const tooEarly = rx.auditPreflight(rx.createOmbudsman("en"), { ...forecast, at: later.windowEnd }, later);
  ok("a forecast without a later window is refused before any ask", tooEarly.status === "refused");
  let s = rx.auditBuild(rx.auditPreflight(rx.createOmbudsman("en"), forecast, later));
  ok("the graph builds before it asks the model", s.status === "model" && s.trace.length === 2);
  s = rx.auditModelGraded(s, score.verdict);
  ok("a named grade is remembered", s.status === "precommit" && s.grade === score.verdict && s.trace.length === 3);
  const mismatch = rx.auditGradeMismatch(s, "fold");
  ok("a wrong grade walks the refused arm", mismatch.status === "refused" && mismatch.trace.at(-1).note === "gradeMismatch");
  s = rx.auditStructurePassed(s);
  ok("structure advances to the numeral door", s.status === "numerals" && s.trace.at(-1).note === "structurePassed");
  s = rx.auditNumeralsPassed(s);
  ok("a proved minute reaches the operator undecided", s.status === "commit" && s.decision === null && s.trace.length === 5);

  const published = rx.auditPublish(s, prose);
  const contested = rx.auditContest(s, prose);
  ok("publish and contest are distinct terminal edges carrying the decision",
    published.status === "commit" && published.decision === "publish" && published.trace.at(-1).note === "published" &&
    contested.status === "commit" && contested.decision === "contest" && contested.trace.at(-1).note === "contested" &&
    published.trace.length === 6 && contested.trace.length === 6);
  const fold = rx.auditFold(s, "fold");
  ok("the deterministic fold is a refused, honest terminal state", fold.status === "refused" && fold.trace.at(-1).note === "foldOk");
} finally {
  await server.close();
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
