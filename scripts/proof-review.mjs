// M179. The weekly review model's prose is rows, and this is the gate that keeps them
// rows. It walks every branch of buildReview, resolves each row through the app's own
// translate() in all three locales, and checks what a reader would actually see: no key
// left on the page, no placeholder unfilled, the right One/Many arm for the count, and
// every figure in the sentence equal to the number the model computed.
// Run: node scripts/proof-review.mjs
import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { makeSay } from "./lib/rows.mjs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { buildReview } = await server.ssrLoadModule("/domain/review.ts");
const { buildLoad } = await server.ssrLoadModule("/domain/load.ts");
const { baselineAttributes, ATTRIBUTE_KEYS } = await server.ssrLoadModule("/domain/attributes.ts");
const { say, locales, DICTIONARIES } = await makeSay(server);

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? "  — " + String(detail).slice(0, 200) : "")); }
};

const DAY = 86400000;
const NOW = Date.parse("2026-09-22T12:00:00Z");
const iso = (ms) => new Date(ms).toISOString();
const attrs = { ...baselineAttributes("CM", 0.45), game_intelligence: 41, passing: 47 };

const done = (daysAgo, minutes, xp, rating, focus) => ({
  id: `s-${daysAgo}-${minutes}`,
  date: iso(NOW - daysAgo * DAY),
  completedAt: iso(NOW - daysAgo * DAY),
  status: "completed",
  targetMinutes: minutes,
  exercises: [{ minutes }],
  xpAwarded: xp,
  selfRating: rating,
  focusAttributes: focus,
});
const missed = (daysAgo) => ({
  id: `m-${daysAgo}`,
  date: iso(NOW - daysAgo * DAY),
  status: "missed",
  targetMinutes: 20,
  xpAwarded: 0,
  focusAttributes: [],
});
const clip = (daysAgo, durationSec, scans, focus) => ({
  at: iso(NOW - daysAgo * DAY),
  durationSec,
  confidence: 80,
  events: [...Array(scans).fill({ kind: "scan" }), { kind: "pass" }],
  recommendedFocus: focus,
});

const review = (o) =>
  buildReview({
    nowMs: NOW,
    windowDays: o.windowDays ?? 7,
    sessions: o.sessions ?? [],
    goals: o.goals ?? [],
    progress: o.progress ?? [],
    attributes: attrs,
    streak: o.streak ?? 0,
    learn: o.learn ?? [],
    film: o.film ?? [],
  });

// One fixture per branch the model can take, so a row that only exists on a path nobody
// exercises is caught here rather than on a screen.
const FIX = {
  empty: review({ goals: [{ id: "g", title: "x", createdAt: iso(NOW - DAY), done: false }] }),
  one: review({
    sessions: [done(1, 40, 60, 5, ["passing"])],
    progress: [{ date: iso(NOW - 6 * DAY), overall: 60, xp: 10 }, { date: iso(NOW - DAY), overall: 60, xp: 70 }],
    learn: [{ at: iso(NOW - 2 * DAY), quizCorrect: true }],
  }),
  many: review({
    sessions: [done(1, 30, 45, 3, ["passing"]), done(2, 20, 30, 3, ["dribbling"]), done(3, 50, 75, 4, ["passing", "first_touch"])],
    progress: [{ date: iso(NOW - 6 * DAY), overall: 62, xp: 10 }, { date: iso(NOW - 5 * DAY), overall: 61, xp: 20 }],
  }),
  busy: review({
    sessions: [done(1, 30, 45, 3, ["passing"]), done(2, 20, 30, 3, ["passing"]), done(3, 50, 75, 4, ["passing"]), missed(4), missed(5)],
    progress: [{ date: iso(NOW - 6 * DAY), overall: 58, xp: 10 }, { date: iso(NOW - 1 * DAY), overall: 61, xp: 200 }],
    streak: 5,
    learn: [{ at: iso(NOW - 2 * DAY), quizCorrect: false }, { at: iso(NOW - 3 * DAY), quizCorrect: false }],
    film: [clip(1, 120, 10, ["game_intelligence"]), clip(2, 180, 20, ["game_intelligence"]), clip(3, 60, 4, ["shooting"])],
  }),
  oneClip: review({ sessions: [done(1, 30, 45, 4, ["passing"])], film: [clip(1, 100, 8, ["passing"])] }),
  agree: review({
    sessions: [done(1, 30, 45, 4, ["passing"]), done(2, 30, 45, 4, ["passing"])],
    film: [clip(1, 120, 10, ["passing"]), clip(2, 120, 10, ["passing"])],
  }),
};

const ROWS = (r) => [
  ...r.insights.map((i) => i.text),
  ...(r.recommendation ? [r.recommendation.reason] : []),
  ...r.evidence,
  ...r.sources,
];
const keyOf = (row) => ("key" in row ? row.key : null);
const hasRow = (r, key) => r.insights.some((i) => keyOf(i.text) === key);
const armIn = (r, prefix) => r.insights.map((i) => i.text).find((t) => (keyOf(t) ?? "").startsWith(prefix));
const phs = (s) => [...new Set((s.match(/\{\w+\}/g) ?? []))].sort();

// 1. Nothing the model hands the page is a sentence any more.
const FIXTURES = Object.entries(FIX);
ok("every fixture is a review the page would actually render", FIXTURES.length === 6 && FIXTURES.every(([, r]) => r.hasData));
const ALL = FIXTURES.flatMap(([, r]) => ROWS(r));
ok("every prose field the model publishes is a row, never a bare string",
  ALL.every((x) => x && typeof x === "object" && ("key" in x || "value" in x)));
ok("the model mints no row value of its own", !/\{\s*value:\s*["'`]/.test(readFileSync("domain/review.ts", "utf8")));
ok("the published interface names the row union for all four prose surfaces",
  /text:\s*RowText/.test(readFileSync("domain/review.ts", "utf8")) &&
  /reason:\s*RowText/.test(readFileSync("domain/review.ts", "utf8")) &&
  /evidence:\s*RowText\[\]/.test(readFileSync("domain/review.ts", "utf8")) &&
  /sources:\s*RowText\[\]/.test(readFileSync("domain/review.ts", "utf8")));
const keysUsed = [...new Set(ALL.map(keyOf).filter(Boolean))];
ok("the scan is reading enough of the model to matter (" + ALL.length + " rows over " + FIXTURES.length + " fixtures)",
  ALL.length >= 40 && keysUsed.length >= 25);

// 2. What a reader sees — the failure this line of milestones exists to stop.
const leaks = [];
for (const [name, r] of FIXTURES) for (const row of ROWS(r)) for (const loc of locales) {
  const s = say(loc)(row);
  const k = keyOf(row);
  if (!s.trim()) leaks.push(`${name}/${loc}: blank`);
  else if (/\{\w+\}/.test(s)) leaks.push(`${name}/${loc}: unfilled {x} in ${s.slice(0, 60)}`);
  else if (k && s === k) leaks.push(`${name}/${loc}: prints its own key`);
}
ok("no row leaks a key, an unfilled placeholder or a blank line in any locale (" + leaks.length + " leaks)",
  leaks.length === 0);
for (const l of leaks.slice(0, 8)) console.log("       leak: " + l);

const CJK = /[一-鿿]/;
const zhLocales = locales.filter((l) => l !== "en");
ok("the ledger line reads as CJK in both Chinese locales and Latin in English",
  zhLocales.length === 2 && zhLocales.every((l) => CJK.test(say(l)(FIX.many.evidence[0]))) && !CJK.test(say("en")(FIX.many.evidence[0])));
ok("every row the model can publish is translated in both Chinese locales",
  FIXTURES.every(([, r]) => ROWS(r).every((row) => zhLocales.every((l) => CJK.test(say(l)(row))))));
ok("a reader of 简体中文 is not served 繁體中文 by inheritance",
  FIXTURES.every(([, r]) => ROWS(r).every((row) => say("zh-CN")(row) !== say("zh-TW")(row))));
ok("every key the model can reach exists in all three dictionaries",
  keysUsed.every((k) => locales.every((l) => (DICTIONARIES[l][k] ?? "").trim().length > 0)));

// 3. The countable rows: One for one, Many for more, and never the wrong arm.
ok("a single completed session takes the singular row", keyOf(armIn(FIX.one, "rv.ins.done")) === "rv.ins.doneOne");
ok("three completed sessions take the plural row", keyOf(armIn(FIX.many, "rv.ins.done")) === "rv.ins.doneMany");
ok("no row whose value names a count of one is ever chosen for two",
  FIX.many.insights.every((i) => !(keyOf(i.text) ?? "").endsWith("One")) ||
  FIX.many.insights.filter((i) => (keyOf(i.text) ?? "").endsWith("One")).every((i) => {
    const k = keyOf(i.text);
    return /\b1\b/.test(DICTIONARIES.en[k]) && !/\{n\}/.test(DICTIONARIES.en[k]);
  }));
// A pair is either countable — the singular arm spells its own 1 and the plural
// interpolates it — or it is singular by pronoun only (the unfed rows say "carried it"
// vs "carried any of them"). What is not allowed is a pair that mixes the two.
const countable = (k) => /\b1\b/.test(DICTIONARIES.en[k]);
ok("every …One row either spells its own 1 or is singular by pronoun",
  keysUsed.filter((k) => k.endsWith("One")).every((k) => !/\{n\}/.test(DICTIONARIES.en[k])));
ok("each countable pair hands its number to the plural arm",
  keysUsed.filter((k) => k.endsWith("One") && countable(k)).every((k) => /\{n\}/.test(DICTIONARIES.en[k.replace(/One$/, "Many")])));
ok("a pronoun-only pair mints no number for either arm to disagree about",
  keysUsed.filter((k) => k.endsWith("One") && !countable(k)).every((k) => !/\{n\}/.test(DICTIONARIES.en[k.replace(/One$/, "Many")])));
// The real risk in a pair is one arm carrying a figure the other forgot: the sentence
// then loses a number on one side of the count and no locale check can see it.
const pairDrift = keysUsed.filter((k) => k.endsWith("One")).filter((k) => {
  const many = DICTIONARIES.en[k.replace(/One$/, "Many")];
  if (many === undefined) return true;
  const one = phs(DICTIONARIES.en[k]);
  const m = phs(many).filter((p) => p !== "{n}");
  return one.join() !== m.join();
});
ok("each One/Many pair carries the same figures apart from its count (" + pairDrift.length + " adrift)",
  pairDrift.length === 0);
ok("one missed session is singular, two are plural",
  keyOf(armIn(FIX.busy, "rv.ins.missed")) === "rv.ins.missedMany" &&
  hasRow(review({ sessions: [done(1, 30, 45, 4, ["passing"]), missed(2)] }), "rv.ins.missedOne"));
ok("a rising rating takes the rise row and a falling one the dip row",
  armIn(FIX.busy, "rv.ins.rise") !== undefined && armIn(FIX.many, "rv.ins.dip") !== undefined);
ok("a flat overall takes neither", !FIX.one.insights.some((i) => /^rv\.ins\.(rise|dip)/.test(keyOf(i.text) ?? "")));

// 4. The figures inside the sentences are the model's own numbers.
const en = (r) => say("en")(r);
const busyIns = FIX.busy.insights.map((i) => en(i.text));
ok("the sessions line totals the real minutes and XP",
  busyIns.includes("You completed 3 sessions totalling 100 minutes and earned 150 XP."), busyIns[0]);
ok("the quality line quotes the mean of the self-ratings, to one decimal",
  busyIns.some((t) => t.includes("Quality averaged 3.3/5")), busyIns.join(" | "));
ok("the rise line quotes the delta the progress history actually gives",
  busyIns.includes("Your overall rating rose 3 points across the window.") && FIX.busy.overallDelta === 3);
ok("the dip line quotes the magnitude, not a doubled minus",
  armIn(FIX.many, "rv.ins.dip") !== undefined &&
  en(armIn(FIX.many, "rv.ins.dip")).includes("dipped 1 point") && !en(armIn(FIX.many, "rv.ins.dip")).includes("-"));
ok("the streak line quotes the streak and appears only at three or more",
  busyIns.some((t) => t.includes("on a 5-day streak")) && !FIX.many.insights.some((i) => keyOf(i.text) === "rv.ins.streak"));
ok("the film line reports clips, footage, confidence and detections as computed",
  busyIns.some((t) => t === `You analysed 3 film clips in this window — ${FIX.busy.filmMinutes.toFixed(1)} min of video, ${FIX.busy.filmConfidence}% mean provider confidence, detection count ${FIX.busy.filmDetections}.`),
  busyIns.find((t) => t.includes("film clips")));
ok("the scanning line quotes the rate and both half-window rates",
  busyIns.some((t) => t === `Scanning off the ball averaged ${FIX.busy.filmScanRate.toFixed(2)} per minute of analysed video — 4.00 → 5.00 per minute between the older and newer half (+1).`),
  busyIns.find((t) => t.startsWith("Scanning")));
ok("one clip asks for a second rather than inventing a trend",
  hasRow(FIX.oneClip, "rv.ins.scanSecond") && !hasRow(FIX.oneClip, "rv.ins.scanTrend") &&
  FIX.oneClip.filmScanTrend === null);
ok("when the clips and the training agree the review says so instead of flagging a gap",
  hasRow(FIX.agree, "rv.ins.focusAgreeMany") && !FIX.agree.insights.some((i) => (keyOf(i.text) ?? "").startsWith("rv.ins.unfed")));
ok("when they disagree the gap is named and the agreement row is absent",
  hasRow(FIX.busy, "rv.ins.unfedMany") && !FIX.busy.insights.some((i) => (keyOf(i.text) ?? "").startsWith("rv.ins.focusAgree")));

// 5. Attribute names reach the reader as words, in their own language.
const unfed = FIX.busy.insights.find((i) => keyOf(i.text) === "rv.ins.unfedMany");
ok("the unfed focus is a code the reader's locale resolves, never a code on the page",
  en(unfed.text).includes(DICTIONARIES.en["attr.name.game_intelligence"]) && !en(unfed.text).includes("game_intelligence"));
ok("the same row resolves in both Chinese locales",
  zhLocales.every((l) => say(l)(unfed.text).includes(DICTIONARIES[l]["attr.name.game_intelligence"])));
const imbRow = armIn(FIX.many, "rv.ins.imbalanced");
ok("the imbalance row carries two distinct attribute codes",
  imbRow !== undefined && ATTRIBUTE_KEYS.includes(imbRow.vars.a) && ATTRIBUTE_KEYS.includes(imbRow.vars.b) && imbRow.vars.a !== imbRow.vars.b);
ok("both attribute words are the reader's own, in all three locales",
  locales.every((l) => {
    const s = say(l)(imbRow);
    return s.includes(DICTIONARIES[l][`attr.name.${imbRow.vars.a}`]) && s.includes(DICTIONARIES[l][`attr.name.${imbRow.vars.b}`]) && !/[a-z]+_[a-z]+/.test(s);
  }));

// 6. The ledger lines.
const evOf = (r) => r.evidence.map(en);
ok("the window line names the window the review was built for", evOf(FIX.busy)[0] === "Window: last 7 days");
ok("the focus line lists the trained focuses by name and totals the blocks",
  evOf(FIX.busy).includes(`Focus mix: ${DICTIONARIES.en["attr.name.passing"]} · 3 focus blocks`), evOf(FIX.busy).join(" | "));
ok("the focus line names all three distinct focuses of a spread log",
  evOf(FIX.many).includes("Focus mix: Passing + Dribbling + First Touch · 4 focus blocks"), evOf(FIX.many).join(" | "));
ok("a positive overall change is signed and a negative one keeps its own minus",
  evOf(FIX.busy).includes("Overall change +3") && evOf(FIX.many).includes("Overall change -1"));
ok("the goals line is a fraction of the real records",
  review({ sessions: [done(1, 30, 45, 4, ["passing"])], goals: [{ id: "a", title: "t", createdAt: iso(NOW), done: true }, { id: "b", title: "t", createdAt: iso(NOW), done: false }] })
    .evidence.map(en).includes("Goals met 1/2"));
ok("the academy line separates completions from passed checks",
  evOf(FIX.busy).includes("Academy 2 completed · 0 with a passed check"));
ok("the scanning ledger line quotes the trend with its sign",
  evOf(FIX.busy).includes("Scanning 5.67/min (trend +1)"), evOf(FIX.busy).join(" | "));
ok("the film ledger line counts only in-window clips",
  evOf(FIX.busy).includes("Film · 3 clips · 6.0 min · detection count 37"));
ok("a review with no film publishes no film ledger line",
  FIX.many.evidence.filter((e) => (keyOf(e) ?? "").startsWith("rv.ev.film")).length === 0);

// 7. Sources: which chips exist, and the shared row that must not be minted twice.
ok("three sources always, five when the log has academy records and film",
  FIX.many.sources.length === 3 && FIX.one.sources.length === 4 && FIX.busy.sources.length === 5);
ok("the training-log chip is the same row the load screen prints",
  keyOf(FIX.one.sources[0]) === "common.src.log" &&
  keyOf(buildLoad({ nowMs: NOW, sessions: [done(1, 30, 45, 4, [])] }).sources[0]) === "common.src.log");
ok("no source chip repeats another chip's words",
  new Set(FIX.busy.sources.map(en)).size === FIX.busy.sources.length);

// 8. The empty-window case is a row too, and it is reachable.
ok("a log with goals but no completed session still speaks",
  FIX.empty.insights.length === 1 && keyOf(FIX.empty.insights[0].text) === "rv.ins.none" &&
  en(FIX.empty.insights[0].text).startsWith("No sessions completed in this window."));

// 9. The screen resolves every one of these rows — a row the page prints raw is the same
// bug in the other direction.
const PAGE = readFileSync("features/review/ReviewPage.tsx", "utf8");
const interpreted = new Set([...PAGE.matchAll(/rowLine\(\s*([A-Za-z_.]+)/g)].map((m) => m[1]));
ok("the screen interprets every prose field the model publishes",
  ["ins.text", "review.recommendation.reason", "e", "s"].every((f) => interpreted.has(f)));
ok("and nothing else, so a new prose surface has to be declared here before it can ship unread",
  interpreted.size === 4);

console.log(`\n${ALL.length} rows read · ${keysUsed.length} distinct keys · ${locales.length} locales`);
console.log(`${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
