import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { evaluateAchievements, summary, ACHIEVEMENTS } = await server.ssrLoadModule("/domain/achievements.ts");

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
ok("no clips: first_clip locked", !find(r, "first_clip").unlocked);
ok("no clips: first_clip value 0", find(r, "first_clip").value === 0);
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

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
