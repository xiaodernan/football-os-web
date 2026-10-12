import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { makeSay } from "./lib/rows.mjs";
import { normalize } from "./lib/rawUiScan.mjs";

// Pins domain/learn.ts — the Knowledge Academy accounting layer (/learn), and
// with it the M133 contract that every lesson's "Try it" link lands on a screen
// that can actually perform the promised action.
//
// The academy makes two kinds of promise, and both are checked here:
//  1. ARITHMETIC — completed/mastered/percentages/per-category progress must be
//     re-derivable by hand from the raw local records, and a lesson is never
//     "mastered" without a recorded passed check (the module's own honesty rule).
//  2. NAVIGATION — a deep link that points at a route the app does not dispatch
//     is a dead end, and a link whose label names a control the destination does
//     not have is an overclaim. Because proof scripts may not import React
//     components, the destination is verified by reading the router's own source
//     text and the linked screen's source text — no hardcoded route list to rot.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const {
  LESSONS, LESSON_IDS, LEARN_STORE_KEY, LEGACY_LEARN_KEY,
  parseLearnRecords, isCompleted, summarizeLearn, recommendLessons,
} = await server.ssrLoadModule("/domain/learn.ts");
const { DICTIONARIES } = await server.ssrLoadModule("/i18n/dictionaries.ts");
const { indexById } = await server.ssrLoadModule("/lib/utils.ts");
// Rows are read through the app's own interpreter at every locale, so a reason that
// reaches a reader without its words is visible here rather than only on screen.
const { say } = await makeSay(server);

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const lesson = (id) => LESSONS.find((l) => l.id === id);
const rec = (id, over = {}) => ({ id, completedAt: "", quizCorrect: false, attempts: 0, ...over });

// ---------------------------------------------------------------------------
// Catalogue integrity — the editorial content the whole module counts over.
// ---------------------------------------------------------------------------
ok("LESSONS is non-empty and LESSON_IDS mirrors it", LESSONS.length > 0 && JSON.stringify(LESSON_IDS) === JSON.stringify(LESSONS.map((l) => l.id)));
ok("lesson ids are unique", new Set(LESSON_IDS).size === LESSON_IDS.length);
ok("every lesson carries titleKey/category/level/summaryKey", LESSONS.every((l) => l.titleKey && l.summaryKey && l.category && ["Beginner", "Intermediate", "Advanced"].includes(l.level)));
ok("every key a lesson carries is a real row in every locale", LESSONS.every((l) =>
  [l.titleKey, l.summaryKey, ...l.bodyKeys, ...(l.tryIt ? [l.tryIt.labelKey] : []), l.quiz.qKey, ...l.quiz.optionKeys]
    .every((k) => Object.values(DICTIONARIES).every((d) => k in d && d[k].trim()))));
ok("every lesson has positive integer minutes", LESSONS.every((l) => Number.isInteger(l.minutes) && l.minutes > 0));
ok("every lesson body carries 3+ paragraph keys", LESSONS.every((l) => l.bodyKeys.length >= 3 && l.bodyKeys.every((k) => k.startsWith("learn.l."))));
ok("every quiz answer index is in range of its options", LESSONS.every((l) => Number.isInteger(l.quiz.answer) && l.quiz.answer >= 0 && l.quiz.answer < l.quiz.optionKeys.length));
ok("quiz options are unique so the answer index is unambiguous", LESSONS.every((l) => new Set(l.quiz.optionKeys).size === l.quiz.optionKeys.length));
ok("every lesson has at least one tag (recommendLessons scores on tags)", LESSONS.every((l) => l.tags.length > 0));
ok("the store key is registered and distinct from the legacy key", LEARN_STORE_KEY.startsWith("football-os.") && LEGACY_LEARN_KEY !== LEARN_STORE_KEY);

// ---------------------------------------------------------------------------
// M133: the try-it contract. Every lesson must offer a live destination, and
// that destination must be a route the app dispatches.
// ---------------------------------------------------------------------------
const appSrc = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const dispatched = new Set([...appSrc.matchAll(/path === "(\/[a-z-]+)"|path\.startsWith\("(\/[a-z-]+)"\)/g)].map((m) => m[1] || m[2]));
ok("the router's own source yields a non-empty route set", dispatched.size > 10);
ok("every lesson offers a try-it (the hub claims a place to try EACH idea)", LESSONS.every((l) => l.tryIt && l.tryIt.labelKey && l.tryIt.to));
ok("every try-it target is a route App actually dispatches", LESSONS.every((l) => dispatched.has(l.tryIt.to)));
ok("no try-it label names the screen it links from (nothing points at /learn)", LESSONS.length > 0 && LESSONS.every((l) => l.tryIt.to !== "/learn" && l.tryIt.to !== "/"));

// The press dial: Tactical Studio arranges shape and mentality only — the press
// intensity control is in the Simulation Lab. Read both files' text, never import them.
const studioSrc = readFileSync(new URL("../features/tactical/TacticalStudio.tsx", import.meta.url), "utf8");
const labSrc = readFileSync(new URL("../features/sim/SimulationLab.tsx", import.meta.url), "utf8");
ok("Tactical Studio really has no press control", studioSrc.length > 0 && !/press/i.test(studioSrc));
// M220 keyed the four slider labels, so the dial is now named by the key its label reads
// instead of by the English word in the attribute. The control is the same one; what has
// to stay true is that the lab is the screen carrying it, which the key's own provenance
// (mgr.press is the Manager OS press word) and the dictionary gate both hold.
ok("the Simulation Lab really renders a press slider", /label=\{t\("mgr\.press"\)\}/.test(labSrc));
ok("the press lesson points at the screen that has the dial", lesson("press").tryIt.to === "/simulation");
ok("the formations lesson keeps pointing at the shape board", lesson("formations").tryIt.to === "/tactical-studio" && /applyFormation/.test(studioSrc));
ok("the load lesson points at the load page the app dispatches", lesson("load").tryIt.to === "/load" && dispatched.has("/load"));
ok("the value lesson points at a board that prints fee and headroom", lesson("value").tryIt.to === "/transfers");
const transfersSrc = readFileSync(new URL("../features/transfers/TransferCentre.tsx", import.meta.url), "utf8");
ok("the Transfer Board really shows asking fee and potential headroom side by side", /transfers\.askingFee/.test(transfersSrc) && /transfers\.headroom/.test(transfersSrc));

// ---------------------------------------------------------------------------
// parseLearnRecords — the storage-boundary repair, including the legacy shape.
// ---------------------------------------------------------------------------
ok("parseLearnRecords: a non-array is discarded, not crashed on", JSON.stringify(parseLearnRecords(null)) === "[]" && JSON.stringify(parseLearnRecords({})) === "[]");
ok("parseLearnRecords: legacy plain ids become completed-with-no-check records", JSON.stringify(parseLearnRecords(["xg"])) === JSON.stringify([rec("xg", { completedAt: "migrated" })]));
ok("parseLearnRecords: an unknown id (string or object) never enters the store", JSON.stringify(parseLearnRecords(["nope", rec("ghost")])) === "[]");
ok("parseLearnRecords: a missing completedAt reads as started-not-completed", parseLearnRecords([rec("press", { completedAt: undefined })])[0].completedAt === "");
ok("parseLearnRecords: quizCorrect is strict true (a truthy string is not a pass)", parseLearnRecords([{ id: "xg", completedAt: "t", quizCorrect: "yes", attempts: 1 }])[0].quizCorrect === false);
ok("parseLearnRecords: attempts coerces numerics and floors junk at 0", parseLearnRecords([{ id: "xg", attempts: "3" }])[0].attempts === 3 && parseLearnRecords([{ id: "press", attempts: -5 }])[0].attempts === 0 && parseLearnRecords([{ id: "value", attempts: "abc" }])[0].attempts === 0);
ok("parseLearnRecords: duplicate ids keep the FIRST record and drop later ones", (() => { const out = parseLearnRecords([rec("xg", { attempts: 2 }), rec("xg", { attempts: 9 })]); return out.length === 1 && out[0].attempts === 2; })());
ok("parseLearnRecords: input order is preserved", JSON.stringify(parseLearnRecords(LESSON_IDS.slice().reverse()).map((r) => r.id)) === JSON.stringify(LESSON_IDS.slice().reverse()));
ok("parseLearnRecords: a whole-catalogue store round-trips to the same length", parseLearnRecords(LESSON_IDS.map((id) => rec(id))).length === LESSON_IDS.length);

// ---------------------------------------------------------------------------
// isCompleted — presence of a record is not completion.
// ---------------------------------------------------------------------------
ok("isCompleted: undefined is not completed", isCompleted(undefined) === false);
ok("isCompleted: an empty completedAt (attempt only) is not completed", isCompleted(rec("xg", { attempts: 3 })) === false);
ok("isCompleted: any non-empty completedAt counts", isCompleted(rec("xg", { completedAt: "migrated" })) === true);

// ---------------------------------------------------------------------------
// summarizeLearn — hand-checked arithmetic over the catalogue.
// ---------------------------------------------------------------------------
const N = LESSONS.length;
const empty = summarizeLearn([]);
ok("summarizeLearn: no records → zeroed, hasData false", N > 0 && empty.completed === 0 && empty.mastered === 0 && empty.pct === 0 && empty.masteredPct === 0 && empty.hasData === false && empty.started === 0);
ok("summarizeLearn: totalLessons is the whole catalogue, not the records seen", empty.totalLessons === N);
ok("summarizeLearn: sources name the local device and label the lessons editorial", (() => {
  const keys = empty.sources.map((s) => s.key);
  const text = keys.map((k) => DICTIONARIES.en[k]).join(" ").toLowerCase();
  return JSON.stringify(keys) === JSON.stringify(["learn.src.device", "learn.src.catalogue"]) &&
    /this device/.test(text) && /editorial/.test(text) && !text.includes("scraped");
})());
ok("summarizeLearn: per-category totals sum to the catalogue size", N > 0 && empty.byCategory.reduce((s, c) => s + c.total, 0) === N);
ok("summarizeLearn: byCategory is sorted by category name", JSON.stringify(empty.byCategory.map((c) => c.category)) === JSON.stringify(empty.byCategory.map((c) => c.category).sort((a, b) => a.localeCompare(b))));
ok("summarizeLearn: with nothing done the weakest category is the first untouched one", empty.byCategory.length > 0 && empty.weakestCategory && empty.weakestCategory.completed === 0 && empty.evidence.some((e) => e.key === "learn.ev.noCat"));

const partial = summarizeLearn([
  rec("xg", { completedAt: "2026-01-01", quizCorrect: true, attempts: 1 }),
  rec("press", { completedAt: "2026-01-02", quizCorrect: false, attempts: 4 }),
  rec("value", { completedAt: "", quizCorrect: true, attempts: 2 }),
]);
const expectedCompleted = 2;
ok("summarizeLearn: completed counts only records with a completedAt", partial.completed === expectedCompleted && partial.completed === LESSONS.filter((l) => ["xg", "press"].includes(l.id)).length);
ok("summarizeLearn: pct is the rounded share of the catalogue", partial.pct === Math.round((expectedCompleted / N) * 100));
ok("summarizeLearn: a passed quiz with no completion is NOT mastered", partial.mastered === 1 && partial.masteredPct === Math.round((1 / N) * 100));
ok("summarizeLearn: a completed lesson that failed the check is not mastered", LESSONS.length > 0 && summarizeLearn([rec("press", { completedAt: "t", quizCorrect: false, attempts: 1 })]).mastered === 0);
ok("summarizeLearn: attemptedOnly counts quiz tries that never marked learned", partial.attemptedOnly === 1 && partial.attemptedOnly === 0 + 1);
ok("summarizeLearn: started is the raw record count (presence, not validity)", partial.started === 3);
ok("summarizeLearn: hasData is true once anything is recorded", partial.hasData === true);
ok("summarizeLearn: per-category completed tallies match a hand tally", (() => {
  const want = { analytics: 1, tactics: 1, scouting: 0, development: 0 };
  return Object.entries(want).every(([k, v]) => partial.byCategory.find((c) => c.category === k).completed === v);
})());
ok("summarizeLearn: unknown ids inflate nothing but `started`", (() => {
  const s = summarizeLearn([rec("xg", { completedAt: "t" }), rec("ghost", { completedAt: "t", attempts: 5 })]);
  return s.completed === 1 && s.started === 2;
})());
ok("summarizeLearn: evidence drops the empty attemptedOnly line", summarizeLearn([rec("xg", { completedAt: "t" })]).evidence.every((e) => e.key) && partial.evidence.some((e) => e.key === "learn.ev.attemptedOne" && e.vars.n === 1));
ok("summarizeLearn: attempts are summed for the evidence line", summarizeLearn([rec("xg", { attempts: 2 }), rec("press", { attempts: 3 })]).evidence.some((e) => e.key === "learn.ev.attemptsMany" && e.vars.n === 5));
ok("summarizeLearn: one attempt renders the evidence line in the singular", summarizeLearn([rec("xg", { attempts: 1 })]).evidence.some((e) => e.key === "learn.ev.attemptsOne" && e.vars.n === 1));
ok("summarizeLearn: once every category has a completion the weakest is null", (() => {
  const cats = new Set(LESSONS.map((l) => l.category));
  const picks = [...cats].map((c) => rec(LESSONS.find((l) => l.category === c).id, { completedAt: "t" }));
  const s = summarizeLearn(picks);
  return s.weakestCategory === null && s.evidence.some((e) => e.key === "learn.ev.allCats");
})());
ok("summarizeLearn: a full catalogue reads 100%", (() => { const s = summarizeLearn(LESSON_IDS.map((id) => rec(id, { completedAt: "t", quizCorrect: true }))); return s.pct === 100 && s.masteredPct === 100 && s.completed === N && s.mastered === N; })());
ok("summarizeLearn: pure and deterministic (same records → same JSON, input untouched)", (() => {
  const input = [rec("xg", { completedAt: "t", quizCorrect: true, attempts: 2 })];
  const before = JSON.stringify(input);
  const a = JSON.stringify(summarizeLearn(input));
  const b = JSON.stringify(summarizeLearn(input));
  return a === b && JSON.stringify(input) === before;
})());

// ---------------------------------------------------------------------------
// recommendLessons — scores only on the learner's own data.
// ---------------------------------------------------------------------------
const sig = (o = {}) => ({ completedSessions: 0, weakestAttributes: [], hasCareer: false, filmClips: 0, watchlist: 0, ...o });
ok("recommendLessons: every tag the scorer branches on exists on some lesson (no dead branch)", (() => {
  const referenced = new Set([...recommendLessons.toString().matchAll(/has\("([a-z]+)"\)/g)].map((m) => m[1]));
  const present = new Set(LESSONS.flatMap((l) => l.tags));
  return referenced.size >= 5 && [...referenced].every((t) => present.has(t));
})());
ok("recommendLessons: a completed lesson is never suggested", (() => {
  const done = LESSON_IDS.map((id) => rec(id, { completedAt: "t" }));
  return recommendLessons(done, sig({ hasCareer: true, watchlist: 9 }), 9).length === 0;
})());
ok("recommendLessons: with no local data at all every reason is the honest default", recommendLessons([], sig(), 9).every((r) => r.reason.key === "learn.rec.default"));
ok("recommendLessons: the limit is respected (and 0 yields nothing)", recommendLessons([], sig(), 2).length === 2 && recommendLessons([], sig(), 0).length === 0);
ok("recommendLessons: default limit is 3", recommendLessons([], sig()).length === 3);
ok("recommendLessons: scores accumulate across every matching branch, last reason wins", (() => {
  const picks = recommendLessons([], sig({ hasCareer: true, watchlist: 3, filmClips: 2 }), 9);
  const v = picks.find((p) => p.lesson.id === "value");
  return v.score === 7 && v.reason.key === "learn.rec.watchMany" && v.reason.vars.n === 3 && v.reason.key !== "learn.rec.careerDials";
})());
ok("recommendLessons: the reason interpolates the real signal number, not a fixed string", (() => {
  const r = recommendLessons([], sig({ watchlist: 1 }), 9).find((p) => p.lesson.id === "value").reason;
  return r.key === "learn.rec.watchOne" && r.vars.n === 1;
})());
ok("recommendLessons: an empty watchlist cannot trigger the scouting reason", !recommendLessons([], sig({ hasCareer: true, watchlist: 0, filmClips: 0 }), 9).some((p) => p.reason.key.startsWith("learn.rec.watch")));
ok("recommendLessons: 3 sessions in the log triggers the dose reason on a development lesson", (() => {
  const r = recommendLessons([], sig({ completedSessions: 3 }), 9).find((p) => p.lesson.id === "sample").reason;
  return r.key === "learn.rec.doseMany" && r.vars.n === 3;
})());
ok("recommendLessons: 1 session still reads the singular", (() => {
  const r = recommendLessons([], sig({ completedSessions: 1 }), 9).find((p) => p.lesson.id === "load").reason;
  return r.key === "learn.rec.doseOne" && r.vars.n === 1;
})());
ok("recommendLessons: the development branch wins over the load branch when both tags are present", lesson("load").tags.includes("development") && lesson("load").tags.includes("load") && (() => {
  const r = recommendLessons([], sig({ completedSessions: 5, weakestAttributes: ["sprint"] }), 9).find((p) => p.lesson.id === "load").reason;
  return r.key === "learn.rec.doseMany" && r.vars.n === 5;
})());
ok("recommendLessons: at 0 sessions the load branch takes over and words the attribute codes through the reader's dictionary", (() => {
  const row = recommendLessons([], sig({ weakestAttributes: ["sprint", "passing"] }), 9).find((p) => p.lesson.id === "load").reason;
  const lines = { en: say("en")(row), "zh-CN": say("zh-CN")(row), "zh-TW": say("zh-TW")(row) };
  return lines.en.length > 0 && row.key === "learn.rec.load" && row.vars.attrs === "sprint,passing" &&
    Object.entries(lines).every(([loc, line]) =>
      line.includes(DICTIONARIES[loc]["attr.name.sprint"]) && line.includes(DICTIONARIES[loc]["attr.name.passing"])) &&
    !/sprint|passing/i.test(lines["zh-CN"]) && !lines["zh-CN"].includes("{");
})());
ok("recommendLessons: only the first two weakest attributes are quoted", (() => {
  const keys = ["sprint", "passing", "shooting", "dribbling"];
  const r = recommendLessons([], sig({ weakestAttributes: keys }), 9).find((p) => p.lesson.id === "load").reason;
  return r.key === "learn.rec.load" && r.vars.attrs === "sprint,passing" && keys.slice(2).every((k) => !r.vars.attrs.includes(k));
})());
ok("recommendLessons: 12+ sessions moves a development lesson out of the dose band", (() => {
  const v = recommendLessons([], sig({ completedSessions: 12 }), 9).find((p) => p.lesson.id === "sample");
  return !["learn.rec.doseOne", "learn.rec.doseMany"].includes(v.reason.key);
})());
ok("recommendLessons: the analytics reason only appears at 12+ sessions", (() => {
  const r = recommendLessons([], sig({ completedSessions: 12 }), 9).find((p) => p.lesson.id === "xg").reason;
  return r.key === "learn.rec.rates" && r.vars.n === 12;
})());
ok("recommendLessons: a career without sessions gets the manager-dial reason", recommendLessons([], sig({ hasCareer: true }), 9).find((p) => p.lesson.id === "press").reason.key === "learn.rec.careerDials");
ok("recommendLessons: a career WITH sessions gets the linking reason instead", recommendLessons([], sig({ hasCareer: true, completedSessions: 4 }), 9).find((p) => p.lesson.id === "press").reason.key === "learn.rec.careerLink");
ok("recommendLessons: results are ranked score-desc, then shorter, then by title", (() => {
  const ids = recommendLessons([], sig({ hasCareer: true, watchlist: 3, filmClips: 2 }), 9).map((p) => p.lesson.id);
  const picks2 = recommendLessons([], sig({ hasCareer: true, watchlist: 3, filmClips: 2 }), 9);
  const sortedOk = picks2.every((p, i) => i === 0 || picks2[i - 1].score >= p.score);
  const tieOk = (() => {
    for (let i = 1; i < picks2.length; i++) {
      const a = picks2[i - 1].lesson, b = picks2[i].lesson;
      if (a === b) return false;
      if (picks2[i - 1].score === b.score && (a.minutes > b.minutes || (a.minutes === b.minutes && a.titleKey.localeCompare(b.titleKey) > 0))) return false;
    }
    return true;
  })();
  return ids.length === N && sortedOk && tieOk;
})());
ok("recommendLessons: never mutates its inputs and is deterministic", (() => {
  const records = [rec("xg", { completedAt: "t" })];
  const s = sig({ hasCareer: true, watchlist: 2, filmClips: 1, completedSessions: 3, weakestAttributes: ["sprint"] });
  const rb = JSON.stringify(records), sb = JSON.stringify(s);
  const a = JSON.stringify(recommendLessons(records, s, 9).map((p) => [p.lesson.id, p.score, p.reason]));
  const b = JSON.stringify(recommendLessons(records, s, 9).map((p) => [p.lesson.id, p.score, p.reason]));
  return a === b && JSON.stringify(records) === rb && JSON.stringify(s) === sb;
})());

// ---- the by-id index is written once ----
// Eleven places in this app built `new Map(list.map((x) => [x.id, x]))`. Two of them are this
// seam: `domain/learn.ts` looked the academy's records up by id, and the Learn Hub page built
// the same index itself — the domain and a page, each with its own copy of one lookup, which is
// the shape M332-M340 charged six times. `indexById` in lib/utils.ts is the door. This census
// charges it in both directions and reads its own population.
const walkSrc = (dir) => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...walkSrc(p));
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
};
const APP_SRC = ["domain", "features", "lib", "store", "data", "src", "components"].flatMap(walkSrc);
// `normalize` is the shared scanner's comment stripper, reused rather than rewritten: a doc
// comment that quotes the expression is documentation about the door, not a build of the index.
const ID_INDEX = /new Map\(\s*[\w.]*\.map\(\((\w+)\)\s*=>\s*\[\s*\1\.id\s*,\s*\1\s*\]\s*\)/g;
const DOOR_FILE = "lib/utils.ts";
const indexSites = APP_SRC.filter((f) => ID_INDEX.test(normalize(readFileSync(f, "utf8"))));
ok(`the by-id index is written in exactly one place, and it is the shared door (${APP_SRC.length} app files walked, ${indexSites.length} site(s): ${indexSites.join(", ") || "none"})`,
  APP_SRC.length >= 90 && indexSites.length === 1 && indexSites[0] === DOOR_FILE);
const LEARN_READERS = ["domain/learn.ts", "features/learn/LearnHub.tsx"];
const learnReaderReads = LEARN_READERS.map((f) => [f, normalize(readFileSync(new URL(`../${f}`, import.meta.url), "utf8")).split(/\r?\n/).filter((l) => /indexById\(/.test(l)).length]);
ok(`every reader of the academy's records by id calls the door (${learnReaderReads.map(([f, n]) => `${f}: ${n}`).join("; ")})`,
  LEARN_READERS.length === 2 && learnReaderReads.every(([, n]) => n >= 1));
// The plant runs the same predicate both ways: a hand-built index must be flagged, and a reduce
// over another field must not — a reader that flagged every `new Map` would pass the clause above
// while accusing the whole app.
const plantedOwn = "const byId = new Map(records.map((r) => [r.id, r]));";
const plantedOther = "const byName = new Map(records.map((r) => [r.title, r]));";
ok(`the index reader, planted both ways, flags a hand-built by-id index and accuses a map keyed by anything else (${ID_INDEX.test(normalize(plantedOwn))} of 1 flagged, ${ID_INDEX.test(normalize(plantedOther))} of 0 flagged)`,
  ID_INDEX.test(normalize(plantedOwn)) === true && ID_INDEX.test(normalize(plantedOther)) === false);
// And the value: the door indexes by id, answers a miss with undefined rather than a crash, and
// returns a real Map so `.get`/`.has` are the same call they always were.
const doorRows = indexById([{ id: "a", n: 1 }, { id: "b", n: 2 }, { id: "c", n: 3 }]);
ok(`indexById keys the rows by their id and answers a miss with undefined (${doorRows.size} rows, get("b")=${doorRows.get("b")?.n}, has("z")=${doorRows.has("z")}, get("z")=${doorRows.get("z")})`,
  doorRows.size === 3 && doorRows.get("b")?.n === 2 && doorRows.has("z") === false && doorRows.get("z") === undefined);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
