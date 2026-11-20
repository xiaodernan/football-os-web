// M1225 · Proof for The Prescription Council: the model proposes ONE fold prescription from the
// SAME sealed replay envelope, every numeral is re-proved by the shared replay door before the graph
// will offer it, adoption and rejection are both explicit traced edges, and a recorded forecast is
// graded by a LATER window's measured figure — never a causal claim.
// Run: node scripts/proof-rxcouncil.mjs
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

ok("the council graph is the shared traced FSM, never a second hand-rolled loop",
  /from "@\/domain\/tracedFsm"/.test(domain) &&
  ["step", "fsmBuild", "fsmCommit", "fsmRefused"].every((s) => domain.includes(s)));
ok("the council reuses the sealed replay envelope, not a second provenance fold",
  /replayEnvelope\(snapshot, law\)/.test(domain) && !/Math\.random/.test(domain));
ok("every numeral the model speaks still passes the ONE shared replay verifier",
  /verifyReplayText\(prose, envelope\)/.test(ops) &&
  /stripCouncilDirective\(result\.text\)/.test(ops) &&
  /parseCouncilDirective\(result\.text, councilOfferings\)/.test(ops));
ok("the first line is taught verbatim: one offered RX:<id> or a bare ABSTAIN",
  /FIRST LINE: exactly RX:<id>/.test(ops) && /Or write ABSTAIN alone/.test(ops));
ok("exactly one streamed call proposes from the same envelope; the keyless arm never fakes a rail",
  ((ops.split("const askCouncil = async () => {")[1] ?? "").split("\n  const decideCouncil")[0]
    .match(/callLlmStream\(/g) ?? []).length === 1 &&
  /councilEnvelope\(replay, councilOfferings, RX_COUNCIL_LAW\)/.test(ops) &&
  /withWorldBook\(\[/.test(ops) && /LLM_CONFIG\.hasKey/.test(ops));
ok("invalid proposals, abstentions and failed verification walk refused arms, never a silent commit",
  /councilProposalInvalid/.test(ops) && /councilAbstained/.test(ops) &&
  /councilProposalRefused/.test(ops) && /councilFold/.test(ops));
ok("adoption and rejection are both explicit human edges gated on a proved, undecided graph",
  /councilAdopt/.test(ops) && /councilReject/.test(ops) &&
  /councilDesk\?\.status === "commit" && councilDesk\.decision === null/.test(ops));
ok("the one slot this door owns is the forecast ledger; the pulse ring is never written",
  /writeJson\(browserStore\(\), RX_FORECAST_KEY,/.test(ops) && !/writeJson\([^\n]*PULSE_KEY/.test(ops));
ok("a stored forecast is graded only when a LATER window has actually been measured",
  /councilForecast\.at < replay\.windowEnd/.test(ops) && /gradeForecast\(councilForecast, replay\)/.test(ops));

const keys = [
  "ops.rxCouncil.kicker", "ops.rxCouncil.title", "ops.rxCouncil.subtitle", "ops.rxCouncil.ask",
  "ops.rxCouncil.empty", "ops.rxCouncil.fold", "ops.rxCouncil.proposed", "ops.rxCouncil.violations",
  "ops.rxCouncil.adopt", "ops.rxCouncil.reject", "ops.rxCouncil.decision", "ops.rxCouncil.forecast",
  "ops.rxCouncil.score", "ops.rxCouncil.trace.label", "ops.rxCouncil.stategraph",
  "ops.rxCouncil.forecastOk", "ops.rxCouncil.method",
  ...["verified", "folded", "invalid", "abstained", "adopted", "rejected"].map((k) => `ops.rxCouncil.badge.${k}`),
  ...["hit", "near", "miss"].map((k) => `ops.rxCouncil.score.${k}`),
  ...["offeringSealed", "modelProposed", "proposalInvalid", "modelAbstained", "proposalVerified",
    "proposalRefused", "adopted", "rejected", "foldOk"].map((k) => `ops.rxCouncil.note.${k}`),
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
  const prescriptions = rxM.foldPrescription(snap.recorded);
  const offerings = rx.offerPrescriptions(prescriptions);

  ok("fold prescriptions map only to honest anomaly ids", offerings.length > 0 &&
    offerings.every((o) => /^(entryBounce|deepExit|loopDetour|deadEnd)$/.test(o.anomaly) && typeof o.id === "string"));
  ok("an unknown prescription id is dropped, never guessed into an anomaly",
    rx.offerPrescriptions([{ id: "rx.ghost", severity: "now", score: 1, vars: {} }]).length === 0);

  const law = rx.RX_COUNCIL_LAW;
  const env = rx.councilEnvelope(snap, offerings, law);
  const envText = JSON.stringify(env);
  ok("the council envelope IS the replay envelope plus the offered shelf",
    /"source":"measured"/.test(envText) && /"source":"simulated"/.test(envText) &&
    Array.isArray(env.offerings) && env.offerings.length === offerings.length);
  ok("the provenance law is printed inside the envelope", /Keep measured and simulated apart/.test(env.law));

  const known = offerings[0].id;
  ok("the first line alone is the graph edge", rx.parseCouncilDirective(`RX:${known}\nprose`, offerings).id === known);
  ok("ABSTAIN is a real refused arm, not a parse failure", rx.parseCouncilDirective("ABSTAIN", offerings).route === "abstain");
  ok("a directive buried on line two is refused", rx.parseCouncilDirective(`prose\nRX:${known}`, offerings) === null);
  ok("a foreign id is refused", rx.parseCouncilDirective("RX:rx.ghost", offerings) === null);
  ok("the directive is stripped before the numeral check",
    rx.stripCouncilDirective(`RX:${known}\nonly this survives`) === "only this survives");

  const empty = rx.councilPreflight(rx.createCouncil("en"), []);
  ok("an empty shelf is a real preflight refusal", empty.status === "refused" && empty.trace.at(-1).note === "foldOk");
  let s = rx.councilBuild(rx.councilPreflight(rx.createCouncil("en"), offerings));
  ok("the graph builds before it asks the model", s.status === "model" && s.trace.length === 2);
  s = rx.councilModelProposed(s, known);
  ok("a model proposal is labelled and remembered", s.status === "precommit" && s.proposalId === known && s.trace.length === 3);
  s = rx.councilVerified(s);
  ok("a proved proposal reaches the operator undecided", s.status === "commit" && s.forecastOk === true && s.decision === null && s.trace.length === 4);
  const abstained = rx.councilAbstained(rx.councilBuild(rx.councilPreflight(rx.createCouncil("en"), offerings)), "fold");
  ok("an abstention refuses instead of proposing", abstained.status === "refused" && abstained.trace.at(-1).note === "modelAbstained");

  const forecast = rx.forecastFrom(snap, offerings[0], "en");
  ok("a forecast is born from the adopted offering's simulated figure and window",
    forecast.rxId === offerings[0].id && forecast.anomaly === offerings[0].anomaly &&
    forecast.predicted === (snap.anomalies.find((a) => a.id === offerings[0].anomaly)?.simulated ?? 0) &&
    forecast.at === snap.windowEnd);
  const laterWith = (measured) => ({ anomalies: [{ id: forecast.anomaly, measured }] });
  ok("a later measured hour grades exact, near and miss without a causal claim",
    rx.gradeForecast(forecast, laterWith(forecast.predicted)).verdict === "hit" &&
    rx.gradeForecast(forecast, laterWith(forecast.predicted + 1)).verdict === "near" &&
    rx.gradeForecast(forecast, laterWith(forecast.predicted + 5)).verdict === "miss");

  const adopted = rx.councilAdopt(s, "the measured figure justifies this move");
  const rejected = rx.councilReject(s, "the measured figure justifies this move");
  ok("adopt and reject are distinct terminal edges carrying the decision",
    adopted.status === "commit" && adopted.decision === "adopt" && adopted.trace.at(-1).note === "adopted" &&
    rejected.status === "commit" && rejected.decision === "reject" && rejected.trace.at(-1).note === "rejected" &&
    adopted.trace.length === 5 && rejected.trace.length === 5);
} finally {
  await server.close();
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
