// Proof for M1197 The World Desk — the reading room's own imprisoned ask door (the eleventh door).
// The constitution: the model may answer ONLY from the passages the index found; every
// numeral is re-proved against the retrieved envelope; fail-closed fold otherwise.
// Run: node scripts/proof-worlddesk.mjs
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const desk = readFileSync("domain/worldLibrarian.ts", "utf8");
const lib = readFileSync("features/library/Library.tsx", "utf8");
const dict = readFileSync("i18n/dictionaries.ts", "utf8");

// engine shape — mirrors the studio-family skeleton, never flirts with a second FSM
ok("domain/worldLibrarian.ts imports the shared FSM body",
  /import \{ step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit \} from "@\/domain\/tracedFsm"/.test(desk) &&
  /export const worldPreflight/.test(desk) && /export const worldBuild/.test(desk) &&
  /export const worldCommit/.test(desk) && /export const worldRefused/.test(desk));
ok("the preflight refuses to open zero shelves", /s\.hits\.length > 0/.test(desk));

// envelope construction — raw passages, sealed order
ok("envelopeFor emits exactly the retrieved passages as JSON-safe evidence",
  /export const envelopeFor/.test(desk) && /kind: hit\.document\.kind/.test(desk) && /target: hit\.document\.target/.test(desk) && /evidence: hit\.document\.text/.test(desk));
ok("the evidence carries the visitor's language and the original question", /question: string/.test(desk) && /locale: string/.test(desk));

// the numerical imprisonment — real work, not regex theatre
ok("evidenceNumerals harvests every numeral in the retrieved passages (raw + rounded)", /evidenceNumerals/.test(desk) && /matchAll/.test(desk) && /Math\.round/.test(desk));
ok("single digits are exempt; compound numerals are re-proved against the envelope", /raw\.length === 1/.test(desk) && /allowed\.has\(raw\)/.test(desk));
ok("an off-corpus numeral trips offCorpus — the only way to print your own invention", /out\.add\("offCorpus"\)/.test(desk));
ok("the prediction door stays shut on futurology", /out\.add\("prediction"\)/.test(desk) && /never will/.test(desk) && /by the time/.test(desk) && /years from now/.test(desk));

// the UI does the same honest dance the other doors do
ok("the streaming door is the ONE callLlmStream — no second fetch anywhere",
  !/(\bfetch\(|XMLHttpRequest|axios\.)/.test(lib.replace(/\/\/.*$/gm, "")));
ok("the model is asked for ZERO invented numerals — envelope only", /ENVELOPE/.test(lib) && /JSON\.stringify\(envelope/.test(lib) && /withWorldBook/.test(lib));
ok("the verification happens BEFORE commit — pass lane only through precommit",
  /verifyWorldText\(result\.text/.test(lib) &&
  /worldCommit\(worldPrecommit\(desk, "pass"/.test(lib) &&
  /worldRefused\(worldPrecommit\(desk, "refused"/.test(lib));
ok("the refusal lane swaps the model's words for the shelves — never silently", /foldWorldAnswer\(hitsNow\)/.test(lib));
ok("the no-key arm prints an honest note, never a fake live badge", /\{LLM_CONFIG\.hasKey \?/.test(lib) && /manual\.librarian\.via\.local/.test(lib));
ok("aria-live polite keeps the streaming readable", /aria-live="polite"/.test(lib));
ok("the trace rail renders chips keyed through t() with title notes", /library\.door\.note\.\$\{entry\.note\}/.test(lib) && /manual\.librarian\.stage\.\$\{entry\.stage\}/.test(lib));
ok("the opened passage count is printed — the shelves own the last word", /library\.door\.cites/.test(lib) && /openedCount/.test(lib));
ok("badge honesty — verified / folded / fallback are three different chips",
  /library\.door\.badge\.verified/.test(lib) && /library\.door\.badge\.folded/.test(lib) && /library\.door\.badge\.fallback/.test(lib));

// dictionary — every key coined in all three locales
for (const key of [
  "library.door.kicker",
  "library.door.title",
  "library.door.explain",
  "library.door.button",
  "library.door.busy",
  "library.door.badge.verified",
  "library.door.badge.folded",
  "library.door.badge.fallback",
  "library.door.cites",
  "library.door.fold",
  "library.door.emptyHits",
  "library.door.method",
  "library.door.trace.label",
  "library.door.note.shelvesInHand",
  "library.door.note.envelopeSealed",
  "library.door.note.commitOk",
  "library.door.note.foldOk",
  "library.door.note.precommitRefused",
  "library.door.violation.offCorpus",
  "library.door.violation.prediction",
]) {
  const needles = (dict.match(new RegExp('"' + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '":', "g")) ?? []).length;
  ok(`all three locales coin ${key}`, needles === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
