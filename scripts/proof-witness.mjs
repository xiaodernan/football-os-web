// Proof for M1217 The Witness Bench — imprisoned LLM door #13.
// The new law: the model drives a graph edge. ABSTAIN as its opening word walks the FSM
// into the refused arm; any other sentence must still survive the shared numeral law.
// Run: node scripts/proof-witness.mjs
import { readFileSync } from "node:fs";
import { createServer } from "vite";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const domain = readFileSync("domain/witnessBench.ts", "utf8");
const screen = readFileSync("features/wirediary/WitnessBench.tsx", "utf8");
const app = readFileSync("src/App.tsx", "utf8");
const shell = readFileSync("features/shell/AppShell.tsx", "utf8");
const palette = readFileSync("features/command/CommandPalette.tsx", "utf8");
const manual = readFileSync("features/manual/Manual.tsx", "utf8");
const dict = readFileSync("i18n/dictionaries.ts", "utf8");

// engine shape — one shared FSM, no second step body
ok("domain/witnessBench.ts imports the ONE shared FSM body",
  /import \{ step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit \} from "@\/domain\/tracedFsm"/.test(domain) &&
  !/export function step\b/.test(domain));
ok("every graph edge is exported and named",
  ["benchPreflight", "benchBuild", "benchModel", "benchPrecommit", "benchCommit", "benchRefused", "benchAbstained"].every((fn) => new RegExp(`export const ${fn}\\b`).test(domain)));

// the envelope and the verifier are borrowed, never rewritten
ok("the three lenses ride the Frozen Dispatch's sealed envelopes",
  /BENCH_TO_FROZEN/.test(domain) && /retrieveFrozen\(BENCH_TO_FROZEN\[lens\], frozenFolds\(footballProvider\)\)/.test(domain));
ok("the Bench rides the ONE shared numeral law — zero second verifier",
  /verifyFrozenText/.test(domain) && !/matchAll/.test(domain) && !/export function verifyNumbersAgainst/.test(domain));

// the screen does the honest dance — one streaming door, verification before commit
ok("the streaming door is the ONE callLlmStream — no second fetch",
  (screen.match(/callLlmStream\(/g) ?? []).length === 1 && !/(\bfetch\(|XMLHttpRequest|axios\.)/.test(screen.replace(/\/\/.*$/gm, "")));
ok("the envelope is sealed at ask time, never a stale fold", /benchEnvelope\(lens\)/.test(screen) && /ENVELOPE/.test(screen));
ok("the model's opening word is read before any commit", /const route = benchRoute\(result\.text\)/.test(screen) && /benchModel\(desk, route\)/.test(screen) && /if \(route === "abstain"\)/.test(screen));
ok("verification happens BEFORE commit", /verifyBenchText\(result\.text, envelope\)/.test(screen) && /benchCommit\(benchPrecommit\(routed, "pass"/.test(screen) && /benchRefused\(benchPrecommit\(routed, "refused"/.test(screen));
ok("the abstain arm swaps the model's voice for the fold's honest reading", /benchAbstained\(routed, foldFallback\(lens\)\)/.test(screen) && /witnessBench\.badge\.abstained/.test(screen));
ok("the fold fallback answers the lens that was asked, never a canned crown summary", /foldFallback = \(lens: WitnessLens\)/.test(screen) && /foldSummary\(benchEnvelope\(lens\)\)/.test(screen) && (screen.match(/foldFallback\(lens\)/g) ?? []).length === 8 && !/foldFallback\(\)/.test(screen));
ok("aria-live polite keeps the streaming readable", /aria-live="polite"/.test(screen));
ok("the trace rail renders chips keyed through t() with note titles", /library\.door\.note\.\$\{entry\.note\}/.test(screen) && /manual\.librarian\.stage\.\$\{entry\.stage\}/.test(screen));

// wiring — a door nobody can find is not a door
ok("the route is lazy-divided in App.tsx", /path === "\/witness-bench"/.test(app) && /WitnessBench/.test(app));
ok("the shell carries the Witness Bench row", /"\/witness-bench"/.test(shell) && /nav\.witnessBench/.test(shell));
ok("the command palette can reach it", /"witness-bench"/.test(palette) && /nav\.witnessBench/.test(palette));
ok("the in-app manual links it", /"\/witness-bench"/.test(manual) && /nav\.witnessBench/.test(manual));

// dictionary — every coined key in all three locales
for (const key of [
  "nav.witnessBench",
  "witnessBench.kicker",
  "witnessBench.title",
  "witnessBench.subtitle",
  "witnessBench.hint",
  "witnessBench.method",
  "witnessBench.badge.abstained",
  "witnessBench.ask.crown",
  "witnessBench.ask.chase",
  "witnessBench.ask.form",
  "witnessBench.fold.intro",
  "witnessBench.violation.offCorpus",
  "witnessBench.violation.prediction",
  "library.door.note.modelRouted",
  "library.door.note.modelAbstained",
  "library.door.note.abstainFold",
  "manual.librarian.stage.model",
]) {
  const needles = (dict.match(new RegExp('"' + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '":', "g")) ?? []).length;
  ok(`all three locales coin ${key}`, needles === 3);
}

// ---- execute the graph, not just read it ---------------------------------------
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const W = await server.ssrLoadModule("/domain/witnessBench.ts");
  ok("ABSTAIN as the opening word is a graph edge",
    W.benchRoute("ABSTAIN") === "abstain" && W.benchRoute("[ABSTAIN]") === "abstain" && W.benchRoute("  abstain — no support") === "abstain");
  ok("mid-prose abstain is ordinary language, never a hidden edge",
    W.benchRoute("The crowd may abstain from chanting.") === "answer" && W.benchRoute("We do not ABSTAIN here.") === "answer");

  const raw = W.createBench("crown", "en");
  ok("the bench carries the lens into the graph and preflight refuses a stranger lens",
    raw.lens === "crown" && raw.route === null &&
    W.benchPreflight(raw).status === "build" &&
    W.benchPreflight({ ...raw, lens: "stranger" }).status === "preflight");

  const base = W.benchBuild(W.benchPreflight(raw));
  const abstainRoute = W.benchModel(base, "abstain");
  ok("the model's abstain transitions the FSM to precommit with a refused model edge",
    abstainRoute.status === "precommit" && abstainRoute.route === "abstain" &&
    abstainRoute.trace.at(-1)?.stage === "model" &&
    abstainRoute.trace.at(-1)?.verdict === "refused" && abstainRoute.trace.at(-1)?.note === "modelAbstained");
  const abstained = W.benchAbstained(abstainRoute, "FOLD");
  ok("the abstain arm lands in refused with the fold's answer and an honest note",
    abstained.status === "refused" && abstained.answer === "FOLD" && abstained.trace.at(-1)?.note === "abstainFold");

  const answerRoute = W.benchModel(base, "answer");
  const committed = W.benchCommit(W.benchPrecommit(answerRoute, "pass"), "Atletico 70 pts.");
  ok("a grounded answer still commits through the same precommit gate",
    committed.status === "commit" && committed.answer === "Atletico 70 pts." && committed.route === "answer" &&
    answerRoute.trace.at(-1)?.note === "modelRouted" &&
    committed.trace.filter((e) => e.stage === "precommit").length === 1 &&
    abstained.trace.filter((e) => e.stage === "precommit").length === 0);
} finally {
  await server.close();
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
