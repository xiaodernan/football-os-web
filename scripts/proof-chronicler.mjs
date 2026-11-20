// M1224 · Proof for The Long-Context Chronicler: one sealed chapter from the COMPLETE tape,
// two verifiers in order (structure, then the shared numeral law), and an honest fold fallback.
// Offline by construction — the real one-call witness is scripts/verify-chronicler-live.mjs.
// Run: node scripts/proof-chronicler.mjs
import { readFileSync } from "node:fs";
import { createServer } from "vite";

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? " — " + detail : "")); }
};

const domain = readFileSync("domain/chronicler.ts", "utf8");
const screen = readFileSync("features/chronicle/LongChronicler.tsx", "utf8");
const app = readFileSync("src/App.tsx", "utf8");
const dict = readFileSync("i18n/dictionaries.ts", "utf8");
const e2e = readFileSync("tests/e2e/chronicler.spec.ts", "utf8");

ok("the chronicler graph is the shared traced FSM, never a second hand-rolled loop",
  /from "@\/domain\/tracedFsm"/.test(domain) &&
  ["step", "fsmBuild", "fsmCommit", "fsmRefused"].every((s) => domain.includes(s)));
ok("the chronicle reuses the shared evidence-number door and the shared bench route",
  /verifyReplayText/.test(domain) && /BenchRoute/.test(domain) && !/Math\.random/.test(domain));
ok("the domain has no data-layer import — the caller passes the tape, keeping layers acyclic",
  !/from "@\/data\//.test(domain));
ok("exactly one streamed model call writes the chapter; the keyless arm never fakes a rail",
  (screen.match(/callLlmStream\(/g) ?? []).length === 1 &&
  /withWorldBook\(\[/.test(screen) && /LLM_CONFIG\.hasKey \?/.test(screen) && /ai\.via\.local/.test(screen));
ok("the complete tape rides the SHARED prefix; only the fixture list is the dynamic suffix",
  /DEEP_DIGEST/.test(screen) && /withWorldBook\(\[/.test(screen) &&
  /OFFERED FIXTURES FROM THE COMPLETE TAPE/.test(screen));
const runBody = (screen.split("const run = async () => {")[1] ?? "").split("const badgeLabel")[0];
ok("the strict first line is taught, parsed against the offered ids and stripped before both verifiers",
  /FIRST LINE: exactly CHAPTER:/.test(screen) &&
  /parseChapterDirective\(result\.text, offered\)/.test(runBody) &&
  /stripChapterDirective\(result\.text\)/.test(runBody));
ok("structure runs BEFORE numerals and each refusal walks the graph instead of committing",
  runBody.indexOf("verifyChapterStructure") >= 0 &&
  runBody.indexOf("verifyChapterStructure") < runBody.indexOf("verifyChapterNumerals") &&
  /chapterStructureRefused\(/.test(runBody) && /chapterNumeralsRefused\(/.test(runBody) &&
  /chapterCommit\(chapterNumeralsPassed\(/.test(runBody));
ok("every offline, failed, invalid, abstain and verified arm ends in an explicit graph status",
  ["chapterRefused", "chapterDirectiveInvalid", "chapterAbstained", "chapterCommit"].every((s) => runBody.includes(s)));
ok("the new screen is a lazy route, a nav tab, a palette entry and a manual chapter link",
  /\/chronicler/.test(app) && /const LongChronicler = lazy/.test(app));

const keys = [
  "nav.chronicler",
  "chronicler.kicker", "chronicler.title", "chronicler.subtitle", "chronicler.hint", "chronicler.ask",
  "chronicler.method", "chronicler.offered", "chronicler.tape", "chronicler.picked", "chronicler.structure",
  "chronicler.numerals", "chronicler.withoutModel", "chronicler.stategraph",
  ...["verified", "folded", "invalid", "abstained", "noModel"].map((k) => `chronicler.badge.${k}`),
  ...["missingSection", "wrongOrder", "emptySection", "tooLong"].map((k) => `chronicler.violation.${k}`),
  ...["tapeSealed", "chapterChose", "directiveInvalid", "structurePassed", "structureRefused", "numeralsPassed", "numeralsRefused"].map((k) => `library.door.note.${k}`),
  ...["structure", "numerals"].map((k) => `manual.librarian.stage.${k}`),
];
for (const key of keys) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp('"' + key.replace(/\./g, "\\.") + '":', "g")) ?? []).length === 3);
}
ok("the offline E2E refuses the transport and asserts the fold chapter and both verifier stages",
  /503/.test(e2e) && /chronicler/.test(e2e) && /fold/i.test(e2e) && /structure/i.test(e2e) && /numeral/i.test(e2e));

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
try {
  const m = await server.ssrLoadModule("/domain/chronicler.ts");
  const d = await server.ssrLoadModule("/data/deepDigest.ts");
  const fixtures = m.fixturesFromTape(d.DEEP_DIGEST);
  ok("the parser reads real finished fixtures from the complete tape", fixtures.length > 500 && fixtures[0].id.startsWith("M"));
  ok("scheduled lines cannot seal a chapter — only numeric-score lines parse",
    d.DEEP_DIGEST.includes("scheduled") && fixtures.every((f) => f.status === "FINISHED"));
  ok("the parser keeps the line verbatim and the goals in order",
    fixtures[0].line.includes(fixtures[0].id) && fixtures[0].home !== fixtures[0].away);
  const offered = m.pickTapeFixtures(fixtures, 3);
  ok("three distinct fixtures are offered, spread across the tape",
    offered.length === 3 && new Set(offered.map((f) => f.id)).size === 3 &&
    offered[0].id !== offered[2].id);
  ok("the projection is byte-stable under re-pick", JSON.stringify(m.pickTapeFixtures(fixtures, 3)) === JSON.stringify(offered));
  ok("an empty or tiny tape is refused honestly, never padded", m.pickTapeFixtures([], 3).length === 0 && m.pickTapeFixtures(fixtures.slice(0, 1), 3).length === 1);

  const law = "Write only numerals printed in the chosen fixture's tape line.";
  const env = m.chronicleEnvelope(offered[0], law);
  ok("the envelope seals the verbatim tape line and the fixture's own figures",
    env.tapeLine === offered[0].line && env.fixture.homeGoals === offered[0].homeGoals && env.law === law);

  const directive = (s) => m.parseChapterDirective(s, offered);
  ok("the first line alone is the graph edge", directive(`CHAPTER:${offered[0].id}\nfree prose`).fixtureId === offered[0].id);
  ok("ABSTAIN is a real refused arm, not a parse failure", directive("ABSTAIN").route === "abstain" && directive("[ABSTAIN]").route === "abstain");
  ok("a directive buried on line two is refused", directive(`prose first\nCHAPTER:${offered[0].id}`) === null);
  ok("an id outside the offered three is refused", directive("CHAPTER:M9999") === null);
  ok("the directive is stripped before verification", m.stripChapterDirective(`CHAPTER:${offered[0].id}\nonly this survives`) === "only this survives");

  const good = `SETTING: ${offered[0].date} ${offered[0].competition} matchday ${offered[0].matchday}.\nTURN: ${offered[0].home} ${offered[0].homeGoals}-${offered[0].awayGoals} ${offered[0].away}.\nECHO: ${offered[0].id} on the tape.`;
  ok("a well-formed three-section chapter passes structure", m.verifyChapterStructure(good).length === 0);
  ok("a missing section is caught by step one", m.verifyChapterStructure("SETTING: x\nTURN: y").includes("missingSection"));
  ok("out-of-order sections are caught by step one", m.verifyChapterStructure("TURN: y\nSETTING: x\nECHO: z").includes("wrongOrder"));
  ok("an empty section is caught by step one", m.verifyChapterStructure("SETTING: x\nTURN:\nECHO: z").includes("emptySection"));
  ok("an overlong chapter is caught by step one", m.verifyChapterStructure(Array.from({ length: 160 }, () => "word ").join("") ).includes("tooLong"));
  ok("step two flags an invented numeral and a future promise", m.verifyChapterNumerals("it ended 97-1 and will be replayed", env).includes("97"));
  ok("step two accepts a figure the envelope carries", m.verifyChapterNumerals(`matchday ${offered[0].matchday}`, env).length === 0);
  // The caller localises the three sentences; the domain owns only the protocol markers.
  const foldLines = (f) => ({
    SETTING: `${f.date} ${f.competition} matchday ${f.matchday} · ${f.home} against ${f.away}.`,
    TURN: `${f.home} ${f.homeGoals}-${f.awayGoals} ${f.away}; the tape marks it ${f.status}.`,
    ECHO: `the seed's own line is the only telling: ${f.line}`,
  });
  const folded = m.foldChapter(offered[0], foldLines(offered[0]));
  ok("the fold chapter is itself structure-valid and numeral-clean",
    /^SETTING: .*\nTURN: .*\nECHO: /s.test(folded) &&
    m.verifyChapterStructure(folded).length === 0 &&
    m.verifyChapterNumerals(folded, env).length === 0);
  ok("the fold uses the fixture's own line and never a second randomness source",
    folded.includes(offered[0].line) && !/Math\.random/.test(domain));

  let s = m.chapterBuild(m.chapterPreflight(m.createChapter("en"), offered));
  ok("the graph builds before it asks the model", s.status === "model" && s.trace.length === 2);
  s = m.chapterModelChose(s, offered[0].id);
  ok("a sealed choice moves the graph to step one", s.status === "structure" && s.fixtureId === offered[0].id);
  s = m.chapterStructurePassed(s);
  ok("structure passed moves the graph to step two", s.status === "numerals" && s.trace.at(-1).note === "structurePassed");
  s = m.chapterCommit(m.chapterNumeralsPassed(s), good);
  ok("a chapter passing both verifiers commits with a full trace", s.status === "commit" && s.trace.length === 6);
  const sDrop = m.chapterModelChose(m.chapterBuild(m.chapterPreflight(m.createChapter("en"), offered)), offered[1].id);
  const badStructure = m.chapterStructureRefused(sDrop, "fold");
  ok("a structure refusal never reaches the numeral stage", badStructure.status === "refused" && badStructure.trace.at(-1).note === "structureRefused");
  const badNumerals = m.chapterNumeralsRefused(m.chapterStructurePassed(sDrop), "fold");
  ok("a numeral refusal after structure passed still refuses", badNumerals.status === "refused" && badNumerals.trace.at(-1).note === "numeralsRefused");
  const abstain = m.chapterAbstained(m.chapterBuild(m.chapterPreflight(m.createChapter("en"), offered)), "fold");
  ok("an abstention refuses and clears the seal", abstain.status === "refused" && abstain.fixtureId === null && abstain.trace.at(-1).note === "modelAbstained");
  const thin = m.chapterPreflight(m.createChapter("en"), offered.slice(0, 2));
  ok("a thin tape is refused at preflight instead of asking the model", thin.status === "refused" && thin.trace.at(-1).note === "foldOk");
} finally {
  await server.close();
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
