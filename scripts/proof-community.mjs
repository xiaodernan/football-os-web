// M204 — a proof for domain/community.ts, the largest domain module with no gate of its own.
//
// The module's header makes three claims that are easy to write and easy to lose:
//   · thread topics are derived deterministically from the real dataset,
//   · authors and replies are GENERATED SAMPLE content, flagged as such, and "sample posts
//     never claim likes",
//   · the discussion starters are "assembled ONLY from numbers the user's own pillars actually
//     produced".
// None of that was checked anywhere. This file checks it, and where a claim is about a NUMBER
// (standings points, credibility %, a record's win-draw-loss, a session count) the expectation is
// recomputed here from the same source the module read, not copied out of its output.
import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { makeSay } from "./lib/rows.mjs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const COMM = await server.ssrLoadModule("/domain/community.ts");
const { seedThreads, allTags, buildStarters } = COMM;
const { footballProvider, getClub, getCompetition, newsFeed } = await server.ssrLoadModule("/data/footballService.ts");
// M241 moved a seeded thread's title, body and every sample reply onto rows, so this proof no
// longer reads those words out of the module — it asks the app what the row says, in each
// locale, through the same seam every other row-reading proof uses.
const { say, locales } = await makeSay(server);

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log(`ok   ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(here, "..", "domain", "community.ts"), "utf8");
// The handle bank is still a list of words, so it is read out of the module rather than
// retyped: a thread authored by someone outside it has to be caught. The two reply banks are
// lists of KEYS now, so they are read the same way and compared against the keys the rows carry.
const bank = (name) => {
  const m = SRC.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  return m ? [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]) : [];
};
const HANDLES = bank("HANDLES");
const OPINION_KEYS = bank("OPINION_KEYS");
const QUESTION_KEYS = bank("QUESTION_KEYS");
ok(`the three name/content banks were parsed out of the module (${HANDLES.length} handles, ${OPINION_KEYS.length} opinions, ${QUESTION_KEYS.length} questions)`,
  HANDLES.length >= 5 && OPINION_KEYS.length >= 5 && QUESTION_KEYS.length >= 3);
ok("every reply key names a sentence the dictionary actually holds, in every locale",
  [...OPINION_KEYS, ...QUESTION_KEYS].every((k) => locales.every((l) => say(l)({ key: k }) !== k)));

// ---------------------------------------------------------------------------
// 1 · seedThreads: shape, determinism, and grounding in the real table.
// ---------------------------------------------------------------------------
const T = seedThreads();
const T2 = seedThreads();
ok(`seedThreads returns ${T.length} threads — ${T.filter((t) => t.id.startsWith("t-race-")).length} from the title races and ${T.filter((t) => t.id.startsWith("t-news-")).length} from the news feed`,
  T.length > 0 && T.every((t) => /^(t-race-|t-news-)/.test(t.id)));
ok("ids are unique (a duplicate would merge two discussions in the UI)",
  new Set(T.map((t) => t.id)).size === T.length);
const withoutTime = (list) => JSON.stringify(list.map((t) => ({ ...t, at: "", comments: t.comments.map((c) => ({ ...c, at: "" })) })));
ok("two calls agree on everything except the wall-clock stamps (ago() reads Date.now(), so `at` is the one declared exception)",
  withoutTime(T) === withoutTime(T2));
ok(`every stamp is a parseable ISO instant (${T.flatMap((t) => [t.at, ...t.comments.map((c) => c.at)]).filter((s) => Number.isNaN(Date.parse(s))).length} unparseable)`,
  T.flatMap((t) => [t.at, ...t.comments.map((c) => c.at)]).every((s) => !Number.isNaN(Date.parse(s))));

// Race threads: the title names the top two of the REAL table and the body quotes their points.
// Both are rows now, so the words are read through the reader rather than off the object.
const en = say("en");
const races = T.filter((t) => t.id.startsWith("t-race-"));
const badRace = races.filter((t) => {
  const comp = t.id.replace("t-race-", "");
  const table = footballProvider.standings(comp).slice(0, 2);
  const a = getClub(table[0].clubId), b = getClub(table[1].clubId);
  const title = en(t.title), body = en(t.body);
  return !title.includes(a.name) || !title.includes(b.name) ||
    !body.includes(String(table[0].points)) || !body.includes(String(table[1].points)) ||
    title.startsWith("t-race");
});
ok(`every title-race thread names the real top two and quotes their actual points (${races.length} threads, comps ${races.map((t) => t.id.replace("t-race-", "")).join("/")})`,
  races.length > 0 && badRace.length === 0, badRace.map((t) => t.id).join(", "));
ok(`the competition name in a race title is the dataset's own (${races.map((t) => en(t.title).split(" title race")[0]).join(" | ")})`,
  races.every((t) => {
    const comp = t.id.replace("t-race-", "");
    const name = getCompetition(comp)?.name ?? comp;
    return en(t.title).startsWith(`${name} title race:`);
  }));
ok("a race thread is tagged as a debate, never as news", races.every((t) => t.tag === "Debates"));
ok("…and a race thread is written in the reader's own language, not the module's",
  races.every((t) => en(t.title) !== say("zh-CN")(t.title) && /争冠/.test(say("zh-CN")(t.title))));

// News threads: title, tag, timestamp and credibility all come from the item, verbatim.
const news = T.filter((t) => t.id.startsWith("t-news-"));
const badNews = news.filter((t) => {
  const item = newsFeed.find((n) => `t-news-${n.id}` === t.id);
  if (!item) return true;
  const wantTag = item.kind === "Rumor" ? "Rumours" : "News";
  const pct = (item.credibility * 100).toFixed(0);
  // The headline is the article's own word and stays a value; the summary and the credibility
  // figure are variables of a keyed sentence.
  return !("value" in t.title) || t.title.value !== item.title || t.tag !== wantTag || t.at !== item.publishedAt ||
    !en(t.body).startsWith(item.summary) || !en(t.body).includes(`${pct}%`);
});
ok(`every news thread copies its item's title, tag, published time and credibility (${news.length} items, kinds ${news.map((t) => t.tag).join("/")})`,
  news.length > 0 && badNews.length === 0, badNews.map((t) => `${t.id}:${t.tag}`).join(", "));
ok("…so no thread invents a timestamp: a news thread's `at` IS the article's publishedAt",
  news.every((t) => newsFeed.some((n) => n.publishedAt === t.at)));
ok("…and the credibility figure quoted in the body equals the item's own, as a percentage",
  news.every((t) => {
    const item = newsFeed.find((n) => `t-news-${n.id}` === t.id);
    return en(t.body).includes(`${(item.credibility * 100).toFixed(0)}%`);
  }));

// ---------------------------------------------------------------------------
// 2 · the honesty flags: sample content says so, and never claims popularity.
// ---------------------------------------------------------------------------
const C = T.flatMap((t) => t.comments);
ok(`every thread is flagged seeded and every comment flagged sample (${T.length} threads, ${C.length} comments)`,
  T.every((t) => t.seeded === true) && C.every((c) => c.sample === true));
ok(`no sample comment claims a like (${C.filter((c) => c.likes !== 0).length} would have to be real)`,
  C.every((c) => c.likes === 0));
ok("authors come only from the declared handle bank — no invented person",
  T.every((t) => HANDLES.includes(t.author)) && C.every((c) => HANDLES.includes(c.author)),
  [...new Set([...T.map((t) => t.author), ...C.map((c) => c.author)].filter((a) => !HANDLES.includes(a)))].join(", "));
ok("reply text comes only from the two opinion banks, never generated on the fly",
  C.every((c) => OPINION_KEYS.includes(c.body.key) || QUESTION_KEYS.includes(c.body.key)),
  C.filter((c) => !OPINION_KEYS.includes(c.body.key) && !QUESTION_KEYS.includes(c.body.key)).map((c) => String(c.body.key).slice(0, 30)).join(" | "));
const fromQ = C.filter((c) => QUESTION_KEYS.includes(c.body.key)).length;
const fromO = C.filter((c) => OPINION_KEYS.includes(c.body.key)).length;
ok(`both banks are actually used over the seeded corpus (${fromQ} questions / ${fromO} opinions), so the two-line check above is not satisfied by one bank`,
  fromQ > 0 && fromO > 0);
ok("comment ids are unique across threads",
  new Set(C.map((c) => c.id)).size === C.length);
ok(`each thread carries between 1 and 4 replies (${Math.min(...T.map((t) => t.comments.length))}–${Math.max(...T.map((t) => t.comments.length))} observed)`,
  T.every((t) => t.comments.length >= 1 && t.comments.length <= 4));

// ---------------------------------------------------------------------------
// 3 · the hydration repair: stored strings become values, never keys
// ---------------------------------------------------------------------------
// Everything written before M241 holds plain strings. The repair has to wrap them as values,
// because a stored sentence is the writer's own words — re-reading one as a key is how a
// visitor's post would turn into a dictionary lookup.
const { repairCommunityTexts } = COMM;
const legacyStore = {
  userThreads: [{ id: "u-t-1", title: "My own headline", body: "comm.opinion.1", tag: "General", author: "You", at: "2026-01-01T00:00:00.000Z", seeded: false, comments: [] }],
  replies: { "t-race-x": [{ id: "u-c-1", author: "You", body: "comm.question.2", at: "2026-01-01T00:00:00.000Z", likes: 0, sample: false }] },
  likes: ["t-race-x"],
};
const fixed = repairCommunityTexts(legacyStore);
ok("a stored thread and reply written as strings are repaired into values, not re-read as keys",
  fixed.userThreads[0].title.value === "My own headline" && fixed.replies["t-race-x"][0].body.value === "comm.question.2");
ok("…and the repair does not translate them: a stored sentence that LOOKS like a key stays the writer's words",
  say("zh-CN")(fixed.userThreads[0].body) === "comm.opinion.1");
ok("…and every other field of the store survives the repair",
  fixed.likes.join() === "t-race-x" && fixed.userThreads[0].tag === "General" && fixed.replies["t-race-x"][0].likes === 0);
const modern = { userThreads: [{ ...legacyStore.userThreads[0], title: { value: "x" }, body: { value: "y" } }], replies: {}, likes: [] };
ok("a store that already carries rows comes back as the same object, so hydration on every load is not an edit",
  repairCommunityTexts(modern) === modern);

// ---------------------------------------------------------------------------
// 4 · tags
// ---------------------------------------------------------------------------
ok(`allTags is the fixed filter list, "All" first (${allTags().join(", ")})`,
  allTags()[0] === "All" && allTags().length === 7 && new Set(allTags()).size === allTags().length);
ok("…and every tag any thread carries is in it",
  T.every((t) => allTags().includes(t.tag)));

// ---------------------------------------------------------------------------
// 4 · buildStarters — the drafts are only as strong as their inputs.
// ---------------------------------------------------------------------------
const career = { clubName: "Northgate FC", position: 3, clubCount: 20, won: 5, drawn: 2, lost: 1, pointsPerGame: 1.89, gamesRemaining: 7 };
const training = { sessions: 6, minutes: 270, topFocusKey: "dribbling", topFocusSessions: 4, avgRating: 3.5 };
const academy = { completed: 3, mastered: 2, lastLesson: "Third man runs" };
const FULL = { career, training, academy, watchlist: 4 };
const all = buildStarters(FULL, 5);
ok(`a fully populated visitor gets all four drafts in the declared order (${all.map((d) => d.id).join(" → ")})`,
  all.map((d) => d.id).join(",") === "starter-career,starter-training,starter-academy,starter-watchlist");
ok("…and the default limit is 3", buildStarters(FULL).length === 3 && buildStarters(FULL, 4).length === 4 && buildStarters(FULL, 1).length === 1);
ok("an empty input offers nothing rather than inventing something", buildStarters({}, 5).length === 0);

// Each arm's own admission rule, asserted at the boundary and one either side.
const GAMES = [{ won: 1, drawn: 1, lost: 0 }, { won: 1, drawn: 1, lost: 1 }, { won: 2, drawn: 0, lost: 1 }];
const admitted = GAMES.map((g) => buildStarters({ career: { ...career, ...g } }, 5).some((d) => d.id === "starter-career"));
ok(`a career draft needs 3 played games (${GAMES.map((g, i) => `${g.won}-${g.drawn}-${g.lost}=${g.won + g.drawn + g.lost}:${admitted[i] ? "offered" : "held back"}`).join(" · ")})`,
  JSON.stringify(admitted) === JSON.stringify([false, true, true]));
const trainingHeld = (over) => buildStarters({ training: { ...training, ...over } }, 5).every((d) => d.id !== "starter-training");
ok("a training draft needs 2 sessions, a known top focus AND its count — an incomplete record is held back, not guessed",
  trainingHeld({ sessions: 1 }) && trainingHeld({ topFocusKey: undefined }) && trainingHeld({ topFocusSessions: undefined }) &&
    buildStarters({ training }, 5).some((d) => d.id === "starter-training"));
ok(`…and nothing is ever printed as "undefined" (${buildStarters({ training: { sessions: 4, minutes: 100, topFocusKey: "passing", avgRating: null } }, 5).length} drafts from a focus with no count)`,
  buildStarters({ training: { sessions: 4, minutes: 100, topFocusKey: "passing", avgRating: null } }, 5).every((d) => !/undefined|NaN/.test(`${d.title} ${d.body} ${d.evidence.join(" ")}`)));
ok("an academy draft needs a completed lesson AND its title",
  buildStarters({ academy: { completed: 0, mastered: 0, lastLesson: "x" } }, 5).every((d) => d.id !== "starter-academy") &&
  buildStarters({ academy: { completed: 2, mastered: 0 } }, 5).every((d) => d.id !== "starter-academy") &&
  buildStarters({ academy }, 5).some((d) => d.id === "starter-academy"));
ok("a watchlist draft needs at least one watched player",
  buildStarters({ watchlist: 0 }, 5).every((d) => d.id !== "starter-watchlist") && buildStarters({ watchlist: 1 }, 5).some((d) => d.id === "starter-watchlist"));

// The numbers in a draft must be the numbers it was given — recomputed here.
const one = (d, dft) => buildStarters(d, 5)[0];
const cd = one(FULL);
ok(`the career draft's title and body quote the record it was handed (${cd.title})`,
  cd.title.includes("5-2-1") && cd.title.includes("1.89 pts/game") && cd.body.includes("#3 of 20") && cd.body.includes("7 fixtures left"));
const td = buildStarters({ training }, 5)[0];
ok(`the training draft quotes sessions, minutes, focus count and self-rating (${td.evidence.join(" / ")})`,
  td.body.includes("6 sessions totalling 270 minutes") && td.body.includes("4 of them hit") && td.body.includes("self-rated 3.5/5"));
const ad = buildStarters({ academy }, 5)[0];
ok("the academy draft pluralises from the count it was given", ad.body.includes("3 lessons completed") && ad.body.includes("2 with a passed check"));
ok("…and keeps the singular when the count is 1",
  buildStarters({ academy: { completed: 1, mastered: 1, lastLesson: "X" } }, 5)[0].body.includes("1 lesson completed, 1 with a passed check"));
const wd = buildStarters({ watchlist: 1 }, 5)[0];
ok("…same for the watchlist wording", wd.title.includes("1 player —") && buildStarters({ watchlist: 3 }, 5)[0].title.includes("3 players —"));
const noRating = buildStarters({ training: { ...training, avgRating: null } }, 5)[0];
ok(`a visitor with no self-ratings is not given one (${noRating.evidence[2]})`,
  noRating.evidence[2] === "no self-ratings yet" && !noRating.body.includes("self-rated"));

// Every figure in an evidence row has to appear in the draft that cites it. The rows
// restate the numbers in their own compact form ("6 sessions · 270 min"), so the claim
// being checked is that no figure is quoted in one place and invented in the other —
// not that the row is a substring of the prose.
const orphans = all.flatMap((d) => d.evidence.flatMap((e) => {
  const nums = e.match(/\d+(\.\d+)?/g) ?? [];
  const text = `${d.title} ${d.body}`;
  return nums.filter((n) => !text.includes(n)).map((n) => `${d.id}: ${n} missing from the draft that cites "${e}"`);
}));
ok(`every number in an evidence row is quoted by its own draft (${all.reduce((n, d) => n + d.evidence.length, 0)} rows across ${all.length} drafts${orphans.length ? `; ${orphans.join(" | ")}` : ", all present"})`,
  orphans.length === 0);
ok("…and each draft carries at least one evidence row, so the check above is not vacuous",
  all.every((d) => d.evidence.length >= 1));

// "feel" of the record: the word is chosen by points/game, at 1.8 and 1.2.
const feels = (ppg) => buildStarters({ career: { ...career, pointsPerGame: ppg } }, 5)[0].body.match(/feel (\w+)/)?.[1] ?? buildStarters({ career: { ...career, pointsPerGame: ppg } }, 5)[0].body.match(/performances (are )?([\w ]+? the points)/)?.[2] ?? "?";
const FEEL_CASES = [
  [2.4, "ahead"], [1.8, "ahead"], [1.79, "in"], [1.2, "in"], [1.19, "behind"], [0.4, "behind"],
];
const feelBad = FEEL_CASES.filter(([ppg, want]) => !feels(ppg).startsWith(want));
ok(`the record-feeling word switches at 1.8 and 1.2, measured on both sides of each (${FEEL_CASES.map(([p, w]) => `${p}→${feels(p)}`).join(" ")})`,
  feelBad.length === 0);
ok("…and the sentence never claims a number that is not the one it was given",
  FEEL_CASES.every(([ppg]) => buildStarters({ career: { ...career, pointsPerGame: ppg } }, 5)[0].title.includes(`${ppg.toFixed(2)} pts/game`)));

// The claim the wording must not overreach: a plurality is not "most of my work".
const plurality = buildStarters({ training: { sessions: 5, minutes: 200, topFocusKey: "dribbling", topFocusSessions: 1, avgRating: null } }, 5)[0];
ok(`a 1-of-5 top focus is described as a plurality, never as most of the work (${plurality.title})`,
  !/^Most of my work/.test(plurality.title));
ok("…while a genuine majority still says most (4 of 5 sessions)",
  /^Most of my work/.test(buildStarters({ training: { sessions: 5, minutes: 200, topFocusKey: "dribbling", topFocusSessions: 4, avgRating: null } }, 5)[0].title));
const mixed = [1, 2, 3, 4, 5].map((k) => buildStarters({ training: { sessions: 5, minutes: 50, topFocusKey: "passing", topFocusSessions: k, avgRating: 4 } }, 5)[0].title);
ok(`…and the switch happens between 2 of 5 and 3 of 5 — a strict majority, not a bare plurality (${mixed[1].split(" (")[0]} vs ${mixed[2].split(" (")[0]})`,
  mixed.slice(0, 2).every((t) => !/^Most of my work/.test(t)) && mixed.slice(2).every((t) => /^Most of my work/.test(t)));

// The drafts never contradict their inputs when only some pillars exist.
ok("a visitor with only a watchlist gets only the watchlist draft",
  buildStarters({ watchlist: 2 }, 5).map((d) => d.id).join() === "starter-watchlist");
ok("…and the limit cuts from the end, so the order above is the priority order",
  buildStarters(FULL, 2).map((d) => d.id).join(",") === "starter-career,starter-training");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
