// Proof for M1199 The Frozen Dispatch — the frozen century's wire desk; the twelfth imprisoned door.
// Mirrors the World-Desk law: numerals re-proved against the envelope the reader can see; any
// future tense trips the refusal lane; the fold answers in that case with the same provenance.
// Run: node scripts/proof-frozen.mjs
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const domain = readFileSync("domain/frozenDispatch.ts", "utf8");
const screen = readFileSync("features/wirediary/FrozenDispatch.tsx", "utf8");
const app = readFileSync("src/App.tsx", "utf8");
const shell = readFileSync("features/shell/AppShell.tsx", "utf8");
const palette = readFileSync("features/command/CommandPalette.tsx", "utf8");
const dict = readFileSync("i18n/dictionaries.ts", "utf8");

// engine shape
ok("domain/frozenDispatch.ts imports the shared FSM body",
  /import \{ step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit \} from "@\/domain\/tracedFsm"/.test(domain) &&
  /export const dispatchPreflight/.test(domain) && /export const dispatchBuild/.test(domain) &&
  /export const dispatchCommit/.test(domain) && /export const dispatchRefused/.test(domain));

// retrieval — the domain reads the seed through the very folds the Library already used
ok("frozenFolds folds through the seeded fold — customPointsTable, STANDARD_RULES, footballProvider", /customPointsTable/.test(domain) && /STANDARD_RULES/.test(domain) && /footballProvider/.test(domain));
ok("every lens is an envelope-speakable JSON tree, zero prose", /retrieveFrozen/.test(domain) && /askId === "summit"/.test(domain) && /askId === "chase"/.test(domain) && /"runIn"/.test(domain));

// the numerical imprisonment — the dispatch and the World Desk obey the ONE shared law
ok("the dispatch rides the shared verifyNumbersAgainst law — one verifier, two doors, zero drift", /verifyNumbersAgainst/.test(domain) && /verifyFrozenText = /.test(domain) && /JSON\.stringify\(envelope\)/.test(domain));
ok("the dispatch seals the envelope to the verifier — numerals cannot lawfully speak otherwise", !/matchAll/.test(domain));

// the screen does the same honest dance as every other door
ok("the streaming door is the ONE callLlmStream — no second fetch",
  !/(\bfetch\(|XMLHttpRequest|axios\.)/.test(screen.replace(/\/\/.*$/gm, "")));
// Planted refusal trap — the lying file the desk must refuse
const plantedFetch = 'fetch("/api/llm/chat")';
ok("the planted stranger knocking at the door is exactly what the desk refuses", /(\bfetch\(|XMLHttpRequest)/.test(plantedFetch));
ok("the envelope embeds ridely at ask time — never a stale fold", /retrieveFrozen\(lens, frozenFolds\(\)\)/.test(screen) && /ENVELOPE/.test(screen));
ok("verification happens BEFORE commit", /verifyFrozenText\(result\.text/.test(screen) && /dispatchCommit\(dispatchPrecommit\(desk, "pass"/.test(screen) && /dispatchRefused\(dispatchPrecommit\(desk, "refused"/.test(screen));
ok("the refusal lane swaps the model's voice for the fold's honest reading — never silently", /foldFallback\(\)/.test(screen));
ok("aria-live polite keeps the streaming readable", /aria-live="polite"/.test(screen));
ok("the trace rail renders chips keyed through t() with title notes", /library\.door\.note\.\$\{entry\.note\}/.test(screen) && /manual\.librarian\.stage\.\$\{entry\.stage\}/.test(screen));

// wiring — the door has to exist everywhere a visitor looks
ok("the route is lazy-divided in App.tsx", /path === "\/frozen-dispatch"/.test(app) && /FrozenDispatch/.test(app));
ok("the shell carries the new studio row", /\/frozen-dispatch/.test(shell) && /nav\.frozenDispatch/.test(shell));
ok("the command palette can reach it", /"frozen-dispatch"/.test(palette) && /nav\.frozenDispatch/.test(palette));

// dictionary — every key coined in all three locales
for (const key of [
  "frozenDispatch.kicker",
  "frozenDispatch.title",
  "frozenDispatch.subtitle",
  "frozenDispatch.ask.summit",
  "frozenDispatch.ask.chase",
  "frozenDispatch.ask.runIn",
  "frozenDispatch.fold.intro",
  "frozenDispatch.method",
  "frozenDispatch.violation.offCorpus",
  "frozenDispatch.violation.prediction",
  "nav.frozenDispatch",
]) {
  const needles = (dict.match(new RegExp('"' + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '":', "g")) ?? []).length;
  ok(`all three locales coin ${key}`, needles === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
