import { readFileSync } from "node:fs";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { evaluateAchievements, summary, ACHIEVEMENTS, achievementInput, nextBadges } = await server.ssrLoadModule("/domain/achievements.ts");
const { levelInfo } = await server.ssrLoadModule("/domain/xp.ts");
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
// Comment lines are prose about the code, not callers of it — the milestone narrative
// in features/player/PlayerOS.tsx quotes the deleted label, and quoting a dead string
// in a comment must not satisfy (or break) a check about the shipped UI.
const code = (p) => src(p).split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

const base = {
  level: 1,
  xp: 0,
  sessions: 0,
  streak: 0,
  goalsDone: 0,
  watchlist: 0,
  plans: 0,
  lessonsCompleted: 0,
  lessonsMastered: 0,
  filmClips: 0,
};

const analyst = () => ACHIEVEMENTS.filter((a) => a.group === "analyst").map((a) => a.id);
const find = (list, id) => list.find((a) => a.id === id);

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// 1. Analyst group exists and has three tiers.
const ids = analyst();
ok("analyst group present", ids.length === 3);
ok("analyst ids", JSON.stringify(ids) === JSON.stringify(["first_clip", "five_clips", "ten_clips"]));

// 2. No clips: zero analyst badges unlocked, pct = 0.
let r = evaluateAchievements(base);
ok("no clips: first_clip locked", ACHIEVEMENTS.length > 0 && !find(r, "first_clip").unlocked);
ok("no clips: first_clip value 0", ACHIEVEMENTS.length > 0 && find(r, "first_clip").value === 0);
ok("no clips: five_clips pct 0", find(r, "five_clips").pct === 0);

// 3. One clip: first_clip unlocked, five_clips at 1/5.
r = evaluateAchievements({ ...base, filmClips: 1 });
ok("1 clip: first_clip unlocked", find(r, "first_clip").unlocked);
ok("1 clip: first_clip value 1", find(r, "first_clip").value === 1);
ok("1 clip: five_clips value 1", find(r, "five_clips").value === 1);
ok("1 clip: five_clips locked", !find(r, "five_clips").unlocked);
ok("1 clip: five_clips pct 0.2", Math.abs(find(r, "five_clips").pct - 0.2) < 1e-9);

// 4. Five clips: five_clips unlocked, ten_clips at 1/2.
r = evaluateAchievements({ ...base, filmClips: 5 });
ok("5 clips: five_clips unlocked", find(r, "five_clips").unlocked);
ok("5 clips: ten_clips pct 0.5", Math.abs(find(r, "ten_clips").pct - 0.5) < 1e-9);

// 5. Ten clips: all three unlocked, tiers bronze/silver/gold.
r = evaluateAchievements({ ...base, filmClips: 10 });
ok("10 clips: all analyst unlocked", ids.every((id) => find(r, id).unlocked));
ok("10 clips: ten_clips is gold", find(r, "ten_clips").tier === "gold");
// value caps at target for progress display.
ok("10 clips: first_clip value capped for pct", find(r, "first_clip").pct === 1);
r = evaluateAchievements({ ...base, filmClips: 20 });
ok("20 clips: first_clip value stays 20 (uncapped)", find(r, "first_clip").value === 20);
ok("20 clips: pct still 1", find(r, "first_clip").pct === 1);

// 6. summary reports the analyst group with correct unlocked/total.
const s = summary(evaluateAchievements({ ...base, filmClips: 5 }));
ok("summary analyst total 3", s.byGroup.get("analyst").total === 3);
ok("summary analyst unlocked 2", s.byGroup.get("analyst").unlocked === 2);

// 7. Analyst clips never influence a non-analyst badge (evidence isolation).
const noFilm = evaluateAchievements({ ...base, sessions: 3 });
const withFilm = evaluateAchievements({ ...base, sessions: 3, filmClips: 9 });
const first = find(noFilm, "first_session");
const second = find(withFilm, "first_session");
ok("film count does not leak into training badges", first.value === second.value && first.unlocked === second.unlocked);

// 8-16. M176: three screens used to assemble AchievementInput by hand, and the Player OS
//       growth tab rendered six *typed-in* badge rows instead of the catalogue — one of
//       which ("1000 XP") named a badge no rule anywhere in this file can produce. Both
//       halves are now one derivation (achievementInput) and one ranking (nextBadges), so
//       the contract that was duplicated three times is stated once and asserted.
//       Checks 14-16 read the screens' source text: a proof may not import a React
//       component, but it can prove the component no longer re-implements the domain.

// 8. The mapper's output shape is exactly the interface every badge reads from —
//    a new AchievementInput field with no derivation line shows up as a missing key.
const raw = {
  xp: 400,
  sessions: [{ status: "completed" }, { status: "planned" }, { status: "completed" }, { status: "missed" }],
  goals: [{ done: true }, { done: false }, { done: true }],
  streak: 3,
  watchlist: ["a", "b"],
  plans: [{}],
  lessons: { completed: 4, mastered: 2 },
  filmClips: 5,
};
const got = achievementInput(raw);
ok("achievementInput produces exactly the badge-facing shape",
  JSON.stringify(Object.keys(got).sort()) === JSON.stringify(Object.keys(base).sort()));

// 9. Each field is derived by the documented formula, not copied from a neighbouring
//    screen: 2 of 4 sessions count, 2 of 3 goals, level comes from the XP ladder alone.
ok("sessions counts completed only", got.sessions === 2);
ok("goalsDone counts done only", got.goalsDone === 2);
ok("lengths map arrays to counts", got.watchlist === 2 && got.plans === 1 && got.filmClips === 5);
ok("lesson totals pass through the academy summary", got.lessonsCompleted === 4 && got.lessonsMastered === 2);
ok("xp carries through untouched", got.xp === 400);
ok("level is derived from xp by the same ladder the progress bar uses",
  got.level === levelInfo(400).level && got.level > 1);

// 10. It never mutates what it was handed — the three callers pass live store arrays.
const before = JSON.stringify(raw);
achievementInput(raw);
ok("achievementInput does not touch its input", JSON.stringify(raw) === before);

// 11. Streak is read, not counted: the same input with a different streak changes only
//     that field. A mapper that re-derived streak from sessions would pass check 9.
const streakOnly = achievementInput({ ...raw, streak: 9 });
const differs = Object.keys(base).filter((k) => streakOnly[k] !== got[k]);
ok("only the field that changed differs", JSON.stringify(differs) === JSON.stringify(["streak"]));

// 12. nextBadges returns locked badges in the stated order (pct desc, then the lower
//     target first as the tie-break) and no unlocked badge.
const mixed = [
  { id: "u", unlocked: true, pct: 1, target: 1 },
  { id: "a", unlocked: false, pct: 0.5, target: 10 },
  { id: "b", unlocked: false, pct: 0.9, target: 20 },
  { id: "c", unlocked: false, pct: 0.5, target: 4 },
];
const ranked = nextBadges(mixed, 6).map((a) => a.id);
ok("nextBadges ranks pct desc, tie-break lower target, locked only", JSON.stringify(ranked) === JSON.stringify(["b", "c", "a"]));
ok("nextBadges caps at n", JSON.stringify(nextBadges(mixed, 2).map((a) => a.id)) === JSON.stringify(["b", "c"]));
ok("nextBadges(…, 0) is empty and a huge n returns every locked badge",
  nextBadges(mixed, 0).length === 0 && nextBadges(mixed, 99).length === 3);
ok("nextBadges does not reorder the list it was given",
  JSON.stringify(mixed.map((a) => a.id)) === JSON.stringify(["u", "a", "b", "c"]));

// 13. The two callers disagree only on how many rows they show: the Dashboard's single
//     tile and Player OS's six-row panel must agree on who is next.
const real = evaluateAchievements(got);
ok("a one-row request is the head of a six-row request",
  nextBadges(real, 1)[0].id === nextBadges(real, 6)[0].id);
ok("the ranking covers every locked badge in the catalogue",
  nextBadges(real, 99).length === real.filter((a) => !a.unlocked).length &&
  nextBadges(real, 99).every((a) => !a.unlocked));

// 14. The fabricated row cannot come back: no badge in the catalogue is an XP total,
//     and no screen types "1000 XP" any more.
ok("no achievement in the catalogue has a 1000 target", ACHIEVEMENTS.length > 0 && ACHIEVEMENTS.every((a) => a.target !== 1000));
const typedLabels = ["features/player/PlayerOS.tsx", "features/dashboard/Dashboard.tsx", "features/achievements/AchievementsPage.tsx"];
ok("the string \"1000 XP\" is gone from every screen",
  typedLabels.every((p) => !code(p).includes("1000 XP")));

// 15. One derivation, no hand-built input: no screen calls evaluateAchievements with an
//     inline object literal any more, and all three go through achievementInput. These
//     three are the engine's only call sites (grep-confirmed at M176), and check 8's
//     shape assertion is what makes a fourth screen's hand-built input impossible to
//     add silently — it would have to re-derive all ten fields.
const inline = typedLabels.filter((p) => /evaluateAchievements\(\s*\{/.test(code(p)));
ok(`no screen assembles an AchievementInput by hand (${inline.join(", ") || "all three call achievementInput"})`,
  typedLabels.length > 0 && inline.length === 0 && typedLabels.every((p) => code(p).includes("achievementInput(")));

// 16. Player OS reads badge names out of the dictionary and caps its panel at six —
//     the same space /achievements walks, so a row can never name a badge that
//     does not exist.
const squeezed = code("features/player/PlayerOS.tsx").replace(/\s+/g, "");
ok("the growth panel renders catalogue badges through t() and the shared cap",
  squeezed.includes("{t(`ach.name.${a.id}`)}") &&
  squeezed.includes("nextBadges(evaluateAchievements(achievementInput({") &&
  /\}\)\),6\)/.test(squeezed));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
