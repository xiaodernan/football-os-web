import { createServer } from "vite";
import { readFileSync } from "node:fs";

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
const { attributeLabel } = await server.ssrLoadModule("/domain/attributes.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const lesson = (id) => LESSONS.find((l) => l.id === id);
const rec = (id, over = {}) => ({ id, completedAt: "", quizCorrect: false, attempts: 0, ...over });

// ---------------------------------------------------------------------------
// Catalogue integrity — the editorial content the whole module counts over.
// ---------------------------------------------------------------------------
ok("LESSONS is non-empty and LESSON_IDS mirrors it", LESSONS.length > 0 && JSON.stringify(LESSON_IDS) === JSON.stringify(LESSONS.map((l) => l.id)));
ok("lesson ids are unique", new Set(LESSON_IDS).size === LESSON_IDS.length);
ok("every lesson carries title/category/level/summary", LESSONS.every((l) => l.title && l.category && l.summary && ["Beginner", "Intermediate", "Advanced"].includes(l.level)));
ok("every lesson has positive integer minutes", LESSONS.every((l) => Number.isInteger(l.minutes) && l.minutes > 0));
ok("every lesson body has 3+ non-empty paragraphs", LESSONS.every((l) => l.body.length >= 3 && l.body.every((p) => p.trim().length > 20)));
ok("every quiz answer index is in range of its options", LESSONS.every((l) => Number.isInteger(l.quiz.answer) && l.quiz.answer >= 0 && l.quiz.answer < l.quiz.options.length));
ok("quiz options are unique so the answer index is unambiguous", LESSONS.every((l) => new Set(l.quiz.options).size === l.quiz.options.length));
ok("every lesson has at least one tag (recommendLessons scores on tags)", LESSONS.every((l) => l.tags.length > 0));
ok("the store key is registered and distinct from the legacy key", LEARN_STORE_KEY.startsWith("football-os.") && LEGACY_LEARN_KEY !== LEARN_STORE_KEY);

// ---------------------------------------------------------------------------
// M133: the try-it contract. Every lesson must offer a live destination, and
// that destination must be a route the app dispatches.
// ---------------------------------------------------------------------------
const appSrc = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const dispatched = new Set([...appSrc.matchAll(/path === "(\/[a-z-]+)"|path\.startsWith\("(\/[a-z-]+)"\)/g)].map((m) => m[1] || m[2]));
ok("the router's own source yields a non-empty route set", dispatched.size > 10);
ok("every lesson offers a try-it (the hub claims a place to try EACH idea)", LESSONS.every((l) => l.tryIt && l.tryIt.label && l.tryIt.to));
ok("every try-it target is a route App actually dispatches", LESSONS.every((l) => dispatched.has(l.tryIt.to)));
ok("no try-it label names the screen it links from (nothing points at /learn)", LESSONS.every((l) => l.tryIt.to !== "/learn" && l.tryIt.to !== "/"));

// The press dial: Tactical Studio arranges shape and mentality only — the press
// intensity control is in the Simulation Lab. Read both files' text, never import them.
const studioSrc = readFileSync(new URL("../features/tactical/TacticalStudio.tsx", import.meta.url), "utf8");
const labSrc = readFileSync(new URL("../features/sim/SimulationLab.tsx", import.meta.url), "utf8");
ok("Tactical Studio really has no press control", !/press/i.test(studioSrc));
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
ok("summarizeLearn: no records → zeroed, hasData false", empty.completed === 0 && empty.mastered === 0 && empty.pct === 0 && empty.masteredPct === 0 && empty.hasData === false && empty.started === 0);
ok("summarizeLearn: totalLessons is the whole catalogue, not the records seen", empty.totalLessons === N);
ok("summarizeLearn: sources name the local device and label the lessons editorial", empty.sources.some((s) => /this device/i.test(s)) && empty.sources.some((s) => /editorial/i.test(s)) && !empty.sources.join(" ").toLowerCase().includes("scraped"));
ok("summarizeLearn: per-category totals sum to the catalogue size", empty.byCategory.reduce((s, c) => s + c.total, 0) === N);
ok("summarizeLearn: byCategory is sorted by category name", JSON.stringify(empty.byCategory.map((c) => c.category)) === JSON.stringify(empty.byCategory.map((c) => c.category).sort((a, b) => a.localeCompare(b))));
ok("summarizeLearn: with nothing done the weakest category is the first untouched one", empty.weakestCategory && empty.weakestCategory.completed === 0 && empty.evidence.some((e) => /No lesson completed/.test(e)));

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
  const want = { Analytics: 1, Tactics: 1, Scouting: 0, Development: 0 };
  return Object.entries(want).every(([k, v]) => partial.byCategory.find((c) => c.category === k).completed === v);
})());
ok("summarizeLearn: unknown ids inflate nothing but `started`", (() => {
  const s = summarizeLearn([rec("xg", { completedAt: "t" }), rec("ghost", { completedAt: "t", attempts: 5 })]);
  return s.completed === 1 && s.started === 2;
})());
ok("summarizeLearn: evidence drops the empty attemptedOnly line", summarizeLearn([rec("xg", { completedAt: "t" })]).evidence.every((e) => e.length > 0) && partial.evidence.some((e) => /attempted but not marked learned/.test(e)));
ok("summarizeLearn: attempts are summed for the evidence line", summarizeLearn([rec("xg", { attempts: 2 }), rec("press", { attempts: 3 })]).evidence.some((e) => /5 quiz attempts recorded/.test(e)));
ok("summarizeLearn: one attempt renders the evidence line in the singular", summarizeLearn([rec("xg", { attempts: 1 })]).evidence.some((e) => /1 quiz attempt recorded/.test(e)));
ok("summarizeLearn: once every category has a completion the weakest is null", (() => {
  const cats = new Set(LESSONS.map((l) => l.category));
  const picks = [...cats].map((c) => rec(LESSONS.find((l) => l.category === c).id, { completedAt: "t" }));
  const s = summarizeLearn(picks);
  return s.weakestCategory === null && s.evidence.some((e) => /Every category has at least one/.test(e));
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
ok("recommendLessons: with no local data at all every reason is the honest default", recommendLessons([], sig(), 9).every((r) => /Next unfinished lesson/.test(r.reason)));
ok("recommendLessons: the limit is respected (and 0 yields nothing)", recommendLessons([], sig(), 2).length === 2 && recommendLessons([], sig(), 0).length === 0);
ok("recommendLessons: default limit is 3", recommendLessons([], sig()).length === 3);
ok("recommendLessons: scores accumulate across every matching branch, last reason wins", (() => {
  const picks = recommendLessons([], sig({ hasCareer: true, watchlist: 3, filmClips: 2 }), 9);
  const v = picks.find((p) => p.lesson.id === "value");
  return v.score === 7 && /watching 3 players/.test(v.reason) && !/Manager career/.test(v.reason);
})());
ok("recommendLessons: the reason interpolates the real signal number, not a fixed string", recommendLessons([], sig({ watchlist: 1 }), 9).find((p) => p.lesson.id === "value").reason === "You are watching 1 player — value vs ability decides whether you should act on them.");
ok("recommendLessons: an empty watchlist cannot trigger the scouting reason", !recommendLessons([], sig({ hasCareer: true, watchlist: 0, filmClips: 0 }), 9).some((p) => /You are watching/.test(p.reason)));
ok("recommendLessons: 3 sessions in the log triggers the dose reason on a development lesson", recommendLessons([], sig({ completedSessions: 3 }), 9).find((p) => p.lesson.id === "sample").reason === "You have completed 3 training sessions — the dose-vs-effort idea applies to your log right now.");
ok("recommendLessons: 1 session still reads the singular", recommendLessons([], sig({ completedSessions: 1 }), 9).find((p) => p.lesson.id === "load").reason.includes("1 training session —"));
ok("recommendLessons: the development branch wins over the load branch when both tags are present", lesson("load").tags.includes("development") && lesson("load").tags.includes("load") && recommendLessons([], sig({ completedSessions: 5, weakestAttributes: ["sprint"] }), 9).find((p) => p.lesson.id === "load").reason.startsWith("You have completed 5"));
ok("recommendLessons: at 0 sessions the load branch takes over and names the attribute label", (() => {
  const r = recommendLessons([], sig({ weakestAttributes: ["sprint", "passing"] }), 9).find((p) => p.lesson.id === "load").reason;
  return r === `Your lowest attributes (${attributeLabel("sprint")}, ${attributeLabel("passing")}) improve through consistent load, not one hard session.`;
})());
ok("recommendLessons: only the first two weakest attributes are quoted", (() => {
  const keys = ["sprint", "passing", "shooting", "dribbling"];
  const r = recommendLessons([], sig({ weakestAttributes: keys }), 9).find((p) => p.lesson.id === "load").reason;
  return keys.slice(2).every((k) => !r.includes(attributeLabel(k))) && r.includes(attributeLabel("sprint"));
})());
ok("recommendLessons: 12+ sessions moves a development lesson out of the dose band", (() => {
  const v = recommendLessons([], sig({ completedSessions: 12 }), 9).find((p) => p.lesson.id === "sample");
  return !/dose-vs-effort/.test(v.reason);
})());
ok("recommendLessons: the analytics reason only appears at 12+ sessions", recommendLessons([], sig({ completedSessions: 12 }), 9).find((p) => p.lesson.id === "xg").reason === "With 12 sessions logged, rates and samples matter more than single results.");
ok("recommendLessons: a career without sessions gets the manager-dial reason", recommendLessons([], sig({ hasCareer: true }), 9).find((p) => p.lesson.id === "press").reason === "Your Manager career uses exactly these press and mentality dials each fixture.");
ok("recommendLessons: a career WITH sessions gets the linking reason instead", recommendLessons([], sig({ hasCareer: true, completedSessions: 4 }), 9).find((p) => p.lesson.id === "press").reason === "You manage a career and train as a player — this links the two models you are already using.");
ok("recommendLessons: results are ranked score-desc, then shorter, then by title", (() => {
  const ids = recommendLessons([], sig({ hasCareer: true, watchlist: 3, filmClips: 2 }), 9).map((p) => p.lesson.id);
  const picks2 = recommendLessons([], sig({ hasCareer: true, watchlist: 3, filmClips: 2 }), 9);
  const sortedOk = picks2.every((p, i) => i === 0 || picks2[i - 1].score >= p.score);
  const tieOk = (() => {
    for (let i = 1; i < picks2.length; i++) {
      const a = picks2[i - 1].lesson, b = picks2[i].lesson;
      if (a === b) return false;
      if (picks2[i - 1].score === b.score && (a.minutes > b.minutes || (a.minutes === b.minutes && a.title.localeCompare(b.title) > 0))) return false;
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

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
