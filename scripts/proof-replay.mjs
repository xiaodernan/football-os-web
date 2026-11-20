// M1222 · Proof for The Replay Room: one read-only device hour, one seeded projection, one
// model-driven StateGraph edge. Every figure the model may speak is provenance-tagged in the
// envelope; prose can name no numeral that the envelope does not already carry.
// Run: node scripts/proof-replay.mjs
import { readFileSync } from "node:fs";
import { createServer } from "vite";

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? " — " + detail : "")); }
};

const domain = readFileSync("domain/replay.ts", "utf8");
const ops = readFileSync("features/ops/Ops.tsx", "utf8");
const dict = readFileSync("i18n/dictionaries.ts", "utf8");
const e2e = readFileSync("tests/e2e/ops-replay.spec.ts", "utf8");

ok("the replay graph is the shared traced FSM, never a second hand-rolled loop",
  /from "@\/domain\/tracedFsm"/.test(domain) &&
  ["step", "fsmBuild", "fsmCommit", "fsmRefused", "fsmPrecommit"].every((s) => domain.includes(s)));
ok("the replay rides the ONE pulse fold and the ONE shared LCG — no parallel randomness",
  /import \{ foldPulse, lcg, CONTINUATIONS/.test(domain) && !/Math\.random/.test(domain));
const askReplayBody = (ops.split("const askReplay = async () => {")[1] ?? "").split("\n  const dwellSec")[0];
ok("exactly one streamed model call chooses the anomaly; the keyless arm never fakes a rail",
  (askReplayBody.match(/callLlmStream\(/g) ?? []).length === 1 &&
  /withWorldBook\(\[/.test(askReplayBody) && /replayEnvelope\(replay, REPLAY_LAW\)/.test(askReplayBody) &&
  /LLM_CONFIG\.hasKey \?/.test(ops) && /ops\.replay\.foldAnswer/.test(ops));
ok("the first line is taught verbatim, parsed before commit and stripped before verification",
  /FIRST LINE: exactly ANOMALY:/.test(ops) &&
  /parseReplayDirective\(result\.text\)/.test(ops) &&
  /stripReplayDirective\(result\.text\)/.test(ops) &&
  /verifyReplayText\(prose, envelope\)/.test(ops));
ok("the graph refuses rather than fabricating on invalid, abstain or failed verification",
  /replayModelRouteInvalid/.test(ops) && /replayAbstained/.test(ops) && /replayPrecommit\(chosen, "refused"\)/.test(ops));
ok("measured and simulated fields never share a render slot — each card carries its own label",
  /replay\.source\.measured/.test(ops) && /replay\.source\.simulated/.test(ops) &&
  /fmt1\(a\.measured\)/.test(ops) && /fmt1\(a\.simulated\)/.test(ops));
ok("replay is a pure read of the pulse ring; it never writes visitor data back",
  //PULSE_KEY/.test(ops) && /const held = readJson/.test(ops) &&
  /replayFold\(held\)/.test(ops) && !/writeJson\([^\n]*PULSE_KEY/.test(ops));
ok("the offline E2E seeds a fixed hour, refuses the transport and asserts both provenances",
  /addInitScript/.test(e2e) && /PULSE_KEY/.test(e2e) && /503/.test(e2e) &&
  /ops\.replay|REPLAY|重放/.test(e2e));

const keys = [
  "ops.replay.kicker", "ops.replay.title", "ops.replay.subtitle", "ops.replay.ask", "ops.replay.foldAnswer",
  "ops.replay.source.measured", "ops.replay.source.simulated", "ops.replay.chosen", "ops.replay.violations",
  "ops.replay.method", "ops.replay.trace.label",
  ...["entryBounce", "deepExit", "loopDetour", "deadEnd"].map((k) => `ops.replay.anomaly.${k}`),
  ...["verified", "folded", "invalid", "abstained"].map((k) => `ops.replay.badge.${k}`),
  ...["preflight", "build", "model", "precommit", "commit", "refused", "done"].map((k) => `ops.replay.stage.${k}`),
  ...["windowSealed", "modelChoseAnomaly", "anomalyInvalid", "modelAbstained", "commitOk", "precommitRefused", "foldOk"].map((k) => `ops.replay.note.${k}`),
];
for (const key of keys) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp('"' + key.replace(/\./g, "\\.") + '":', "g")) ?? []).length === 3);
}

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
try {
  const m = await server.ssrLoadModule("/domain/replay.ts");
  const now = 1_800_000_000_000;
  const visits = [
    { path: "/", at: now - 3_000_000, dwellMs: 1_000 },
    { path: "/football", at: now - 2_900_000, dwellMs: 40_000 },
    { path: "/library", at: now - 2_800_000, dwellMs: 20_000 },
    { path: "/", at: now - 900_000, dwellMs: 2_000 },
    { path: "/ops", at: now - 800_000, dwellMs: 1_000 },
  ];
  const snap = m.replayFold(visits, now);
  ok("the replay folds the last hour from the recorded trail", snap.recorded.cohort === "device" && snap.recorded.visits === 5 && snap.recorded.sessions === 2);
  ok("the projected cohort is labelled simulated, not device", snap.predicted.cohort === "seeded");
  ok("the replay is byte-stable under re-fold", JSON.stringify(m.replayFold(visits, now)) === JSON.stringify(snap));
  ok("older-than-an-hour visits are excluded", m.replayFold([...visits, { path: "/ghost", at: now - 3_600_001, dwellMs: 10_000 }], now).recorded.visits === 5);
  ok("four anomalies, each with a separate measured and simulated count",
    snap.anomalies.length === 4 && snap.anomalies.every((a) => typeof a.measured === "number" && typeof a.simulated === "number"));
  const law = "Every figure below is tagged measured or simulated. Never swap the two. Answer in the visitor's language, at most 60 words, and use ONLY these figures.";
  const env = m.replayEnvelope(snap, law);
  const envText = JSON.stringify(env);
  ok("the envelope tags every recorded and predicted figure with its own provenance",
    /"source":"measured"/.test(envText) && /"source":"simulated"/.test(envText));
  ok("the envelope teaches the provenance law instead of leaving it to the prose", /Never swap the two/.test(env.law));

  const directive = (s) => m.parseReplayDirective(s);
  ok("the first line alone is the graph edge", directive("ANOMALY:deadEnd\nfree prose").anomaly === "deadEnd" && directive("ANOMALY:deadEnd").anomaly === "deadEnd");
  ok("ABSTAIN is a real refused arm, not a parse failure", directive("ABSTAIN").route === "abstain" && directive("[ABSTAIN]").route === "abstain");
  ok("a directive buried on line two is refused", directive("prose first\nANOMALY:deadEnd") === null);
  ok("an unknown anomaly is refused", directive("ANOMALY:ghost") === null);
  ok("the directive is stripped before the numeral check", m.stripReplayDirective("ANOMALY:deadEnd\nonly this survives") === "only this survives");
  ok("verifyReplayText flags an invented numeral", m.verifyReplayText("it was 97 percent", env).includes("97"));
  ok("verifyReplayText accepts an envelope numeral", m.verifyReplayText(`it was ${snap.recorded.visits} visits`, env).length === 0);

  let s = m.replayBuild(m.replayPreflight(m.createReplay("en"), snap));
  ok("the graph builds before it asks the model", s.status === "model" && s.trace.length === 2);
  s = m.replayModelChose(s, "entryBounce");
  ok("a model choice is labelled chosenBy model", s.status === "precommit" && s.chosenBy === "model" && s.anomaly === "entryBounce");
  s = m.replayCommit(m.replayPrecommit(s, "pass"), "the measured bounce is 1");
  ok("a verified answer commits with a full trace", s.status === "commit" && s.trace.length === 5);
  const refused = m.replayAbstained(m.replayBuild(m.replayPreflight(m.createReplay("en"), snap)), "fold");
  ok("an abstention refuses instead of committing", refused.status === "refused" && refused.trace.at(-1).note === "modelAbstained");
} finally {
  await server.close();
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
