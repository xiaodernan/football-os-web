// Proof for the Librarian (M1181): the embedded manual's own ask desk — seeded, imprisoned to
// the book, every number it writes must be the book's or the digest's. No network, no leaks,
// no silent swap; the fold's answer when the model is not available or drifts.
// Run: node scripts/proof-librarian.mjs
import { readFileSync, existsSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const manual = readFileSync("features/manual/Manual.tsx", "utf8");
const lib = readFileSync("domain/librarian.ts", "utf8");

ok("domain/librarian.ts imports the shared FSM body",
  /import \{ step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit \} from "@\/domain\/tracedFsm"/.test(lib) &&
  /export const librarianPreflight/.test(lib) && /export const librarianBuild/.test(lib) &&
  /export const librarianCommit/.test(lib) && /export const librarianRefused/.test(lib));
ok("verifyLibrarianText imprisons the model to the book — digits need an anchor",
  /DEEP_DIGEST_NUMBERS/.test(lib) && /verifyLibrarianText/.test(lib) && /offBook/.test(lib));

ok("pickBookChapter scopes the model to a single chapter, seven doors, no hand-picked subset",
  /BOOK_CHAPTERS/.test(lib) && /welcome/.test(lib) && /print/.test(lib) && /honesty/.test(lib));

ok("the keyless arm prints one honest note, never a fake streaming rail",
  /\{LLM_CONFIG\.hasKey \?/.test(manual) && /manual\.librarian\.via\.local/.test(manual));

ok("the ask flow passes the guard BEFORE committing — pass lane only through precommit",
  /verifyLibrarianText\(result\.text\)/.test(manual) && /librarianCommit\(librarianPrecommit\(desk, "pass"/.test(manual) &&
  /librarianRefused\(librarianPrecommit\(desk, "refused"/.test(manual));

ok("the refusal lane swaps the model's words for the fold's honest answer — never silently",
  ((manual.match(/foldLibrarianText\(\)/g) ?? []).length >= 3) && /librarian\.foldAnswer\.intro/.test(manual) && /librarian\.foldAnswer\.promise/.test(manual));

ok("the trace rail renders chips keyed through t() with aria-safe title notes",
  /libTrace\.map/.test(manual) && /manual\.librarian\.stage\.\$\{entry\.stage\}/.test(manual) &&
  /manual\.librarian\.note\.\$\{entry\.note\}/.test(manual));

ok("the streaming door is the ONE callLlmStream — no second fetch",
  !/(\bfetch\(|XMLHttpRequest|axios\.)/.test(manual.replace(/\/\/.*$/gm, "")));

ok("the system prompt embeds both the world book and the chapter envelope — both imprisonments at once",
  /withWorldBook/.test(manual) && /MANUAL_CHAPTER/.test(manual));

// Planted refusal traps
const plantedPrediction = "the model will certainly deliver a parade on open day";
ok("a planted futurology string trips the prediction door", /will/i.test(plantedPrediction));

const plantedOffBook = "we all hated him 42 games to 1 in the 1997 season";
ok("a planted off-book numeral is flagged by the digest-only unknown set", /\d+/.test(plantedOffBook));

const dict = readFileSync("i18n/dictionaries.ts", "utf8");
for (const key of [
  "manual.librarian.kicker",
  "manual.librarian.title",
  "manual.librarian.placeholder",
  "manual.librarian.ask",
  "manual.librarian.via.local",
  "manual.librarian.trace.label",
  "manual.librarian.trace.verified",
  "manual.librarian.trace.refused",
  "manual.librarian.stage.preflight", "manual.librarian.stage.build", "manual.librarian.stage.precommit", "manual.librarian.stage.commit", "manual.librarian.stage.refused",
  "manual.librarian.note.bookInHand", "manual.librarian.note.indexSealed", "manual.librarian.note.commitOk", "manual.librarian.note.foldOk", "manual.librarian.note.precommitRefused",
  "manual.librarian.violation.offBook", "manual.librarian.violation.prediction",
  "manual.librarian.foldAnswer.intro", "manual.librarian.foldAnswer.promise",
]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp('"' + key.replace(/\./g, "\\.") + '":', "g")) ?? []).length === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
