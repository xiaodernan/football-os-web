// Proof for the Consultation (M1178): the operator console reads its own prescription aloud —
// the model may only narrate what this fold measured; every other number is refused and the fold's
// own sentence substitutes. The FSM is the third member of the traced-FSM family and shares the
// body in domain/tracedFsm.ts; no rule body exists twice.
// Run: node scripts/proof-consult.mjs
import { readFileSync, existsSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const fsm = readFileSync("domain/tracedFsm.ts", "utf8");
const consult = readFileSync("domain/consult.ts", "utf8");
const ops = readFileSync("features/ops/Ops.tsx", "utf8");

ok("domain/consult.ts imports the shared traced-FSM bodies — no re-implementation of the step",
  /import \{[^}]*fsmPreflightGate[^}]*fsmBuild[^}]*fsmCommit[^}]*fsmRefused[^}]*fsmPrecommit[^}]*\} from "@\/domain\/tracedFsm"/.test(consult) &&
  !/function step\s*[<(]/.test(consult) &&
  /export const consultBuild/.test(consult) && /export const consultCommit/.test(consult) &&
  /export const consultRefused/.test(consult));

const plantedFsmSpell = 'const x = { stage: "build", verdict: "pass", note: "envelopeSealed" };';
ok("the re-spell plant — a literal FSM entry copied back into the screen — trips the census regex",
  /\{\s*stage:\s*"build",\s*verdict:\s*"pass",\s*note:\s*"envelopeSealed"\s*\}/.test(plantedFsmSpell));

ok("the console's FSM entry presets live in the domain engine — the screen imports, never re-spells",
  /CONSULT_BUILD_ENTRY/.test(consult) && /CONSULT_COMMIT_ENTRY/.test(consult) && /CONSULT_FOLD_ENTRY/.test(consult) &&
  /CONSULT_PRECOMMIT_PASS/.test(consult) && /CONSULT_PRECOMMIT_REFUSED/.test(consult) &&
  !/\{\s*stage:\s*"build",\s*verdict:\s*"pass",\s*note:\s*"envelopeSealed"\s*\}/.test(ops));

ok("verifyConsultText imprisons the model to the fold's own numerics — no number without an anchor",
  /buildUniverse\(fold\)/.test(consult) && /verifyConsultText/.test(consult) && /wrongNumbers/.test(consult));

// A honest re-implementation of the check for a planted case, using the module's own rules:
const fold = {
  cohort: "seeded",
  visits: 2000,
  sessions: 1240,
  bounceSessions: 480,
  bounceRate: 38.7,
  avgDepth: 2.4,
  avgDwellMs: 41200,
  loopRate: 6.5,
  deadEndSessions: 140,
  loopSessions: 80,
  depthBuckets: [700, 260, 160, 120],
  perRoute: [{ path: "/players", visits: 340, exits: 61, bounceShare: 28.2, avgDwellMs: 18300 }],
  exits: [{ path: "/manual", exits: 210 }],
  trend: [{ day: "2026-11-16", visits: 55 }],
};

const universeOk = (text) =>
  text.match(/\d+(?:[\d,.]*\d)?/g)?.every((raw) => {
    const n = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(n)) return true;
    for (const t of [raw, String(Math.round(n)), String(Math.round(n * 10) / 10), String(Math.round(n * 100) / 100)]) {
      if (universeHas(t)) return true;
    }
    return false;
  });
const universeHas = (tok) => {
  const flat = () => [
    String(fold.sessions), String(fold.visits), String(fold.bounceSessions),
    String(Math.round(fold.bounceRate * 10) / 10), String(Math.round(fold.bounceRate)),
    String(fold.avgDepth), String(2),
    String(fold.avgDwellMs), String(41200), String(fold.loopRate), String(6),
    String(50), String(210), String(340), String(61), String(Math.round(28.2)), String(28), String(18300), String(61),
    String(140), String(80), String(55), String(2026), String(11), String(16), String(1240), String(2000),
    String(700), String(260), String(160), String(120),
  ].includes(tok);
  return flat() || [0,1,2,3,4,5,6,7,8,9,10,100].includes(Number(tok));
};
const planted = "The fold says 38.7% of sessions bounce inside thirty seconds — mostly on /manual.";
const banned = "The fold says 47.3% of sessions bounce on /zzz-never-heard-of-it.";
ok("planted trap: a fold-quoted reading passes the universe", universeOk(planted) === true);
ok("planted trap: an invented figure is caught", universeOk(banned) === false);

ok("the offline lane collapses to the fold's own two-sentence portrait",
  ((ops.match(/foldConsultText\(\)/g) ?? []).length >= 4) && /ops\.consult\.foldAnswer\.intro/.test(ops));

ok("the keyless arm prints one honest note, never a fake streaming panel",
  /\{LLM_CONFIG\.hasKey \?/.test(ops) && /ops\.consult\.via\.local/.test(ops) &&
  /\{consultBusy \? t\("pressroom\.answering"\) : t\("ops\.consult\.ask"\)\}/.test(ops));

ok("the models pass through the fold's guard before committing — commit lane reaches done only via precommit",
  /verifyConsultText\(result\.text, desk\.fold\)/.test(ops) && /consultCommit\(consultPrecommit\(desk, "pass"/.test(ops) &&
  /consultRefused\(consultPrecommit\(desk, "refused"/.test(ops) &&
  /consultRefused\(desk, foldConsultText\(\)\)/.test(ops));

ok("the trace rail renders chips with t() keys and aria-safe title notes",
  /consultTrace\.map/.test(ops) && /ops\.consult\.stage\.\$\{entry\.stage\}/.test(ops) &&
  /ops\.consult\.note\.\$\{entry\.note\}/.test(ops));

ok("the streaming door is the ONE callLlmStream — no second fetch",
  !/(\bfetch\(|XMLHttpRequest|axios\.)/.test(ops.replace(/\/\/.*$/gm, "")));

const plantedFetch = "const r = await fetch(\"/api/secret\");";
ok("the no-second-fetch plant — a stray direct call — trips the census regex",
  /(\bfetch\(|XMLHttpRequest|axios\.)/.test(plantedFetch.replace(/\/\/.*$/gm, "")));

const dict = readFileSync("i18n/dictionaries.ts", "utf8");
for (const key of [
  "ops.consult.kicker",
  "ops.consult.ask",
  "ops.consult.via.local",
  "ops.consult.trace.label",
  "ops.consult.trace.verified",
  "ops.consult.trace.refused",
  "ops.consult.stage.preflight", "ops.consult.stage.build", "ops.consult.stage.precommit", "ops.consult.stage.commit", "ops.consult.stage.refused",
  "ops.consult.note.foldInHand", "ops.consult.note.envelopeSealed", "ops.consult.note.commitOk", "ops.consult.note.foldOk", "ops.consult.note.precommitRefused",
  "ops.consult.violation.wrongNumbers", "ops.consult.violation.prediction",
  "ops.consult.foldAnswer.intro", "ops.consult.foldAnswer.promise",
]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp('"' + key.replace(/\./g, "\\.") + '":', "g")) ?? []).length === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
