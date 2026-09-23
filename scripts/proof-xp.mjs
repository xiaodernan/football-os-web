import { createServer } from "vite";

// Pins domain/xp.ts — the XP curve + level read that powers the level/progress bar
// on the shell, dashboard, profile, review and achievements, and the XP a completed
// session awards in the store. Its header makes two promises this proof guards:
//   (1) the curve is a fixed, gentle-quadratic, strictly-increasing ladder, and
//   (2) XP is granted only for genuine completed behaviour (a per-session floor and
//       a capped consistency bonus), never an unbounded number.
// Every asserted figure is hand-computed against the source formulas so a silent
// retune of the curve or the scoring would break the build rather than drift.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { xpForLevel, levelFromXp, levelInfo, xpForSession, streakBonus } = await server.ssrLoadModule("/domain/xp.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// --- xpForLevel: the exact curve + monotonicity ----------------------------
ok("level 1 (and any level<=1) needs zero XP", xpForLevel(1) === 0 && xpForLevel(0) === 0 && xpForLevel(-5) === 0);
ok("xpForLevel(2..5) equals the hand-computed quadratic ladder",
  xpForLevel(2) === 68 && xpForLevel(3) === 152 && xpForLevel(4) === 252 && xpForLevel(5) === 368);
ok("cumulative cost is strictly increasing", [1, 2, 3, 4, 5, 6, 7, 8].every((l) => xpForLevel(l + 1) > xpForLevel(l)));
const d = (l) => xpForLevel(l + 1) - xpForLevel(l);
ok("the increments themselves grow (gentle-early, quadratic-later)", d(1) < d(2) && d(2) < d(3) && d(3) < d(4));
ok("xpForLevel is deterministic and integer-valued",
  xpForLevel(9) === xpForLevel(9) && [3, 10, 25, 40].every((l) => Number.isInteger(xpForLevel(l))));

// --- levelFromXp: boundaries and round-trip --------------------------------
ok("0 or negative XP is level 1", levelFromXp(0) === 1 && levelFromXp(-100) === 1);
ok("an exact threshold promotes to that level",
  levelFromXp(xpForLevel(2)) === 2 && levelFromXp(xpForLevel(3)) === 3 && levelFromXp(xpForLevel(10)) === 10);
ok("one XP below a threshold stays on the lower rung",
  levelFromXp(xpForLevel(3) - 1) === 2 && levelFromXp(xpForLevel(10) - 1) === 9);
let roundTripOk = true, monotonicLvl = true, prev = 0;
for (let xp = 0; xp <= 2000; xp += 7) {
  const L = levelFromXp(xp);
  if (!(xpForLevel(L) <= xp && xp < xpForLevel(L + 1))) roundTripOk = false;
  if (L < prev) monotonicLvl = false; else prev = L;
}
ok("levelFromXp is the exact inverse of xpForLevel across 0..2000", roundTripOk);
ok("levelFromXp never decreases as XP rises", monotonicLvl);

// --- levelInfo: base/next/progress consistency ------------------------------
const i0 = levelInfo(0);
ok("at 0 XP: level 1, nothing into level, progress 0", i0.level === 1 && i0.intoLevel === 0 && i0.progress === 0);
const iMid = levelInfo(110); // 68<=110<152 -> level 2
ok("mid-level info is internally consistent",
  iMid.level === 2 && iMid.intoLevel === 110 - 68 && iMid.forNext === 152 - 68 && Math.abs(iMid.progress - (110 - 68) / (152 - 68)) < 1e-9);
const iTop = levelInfo(1000); // 992<=1000<1188 -> level 9
ok("a large XP value resolves to level 9 with a small progress slice",
  iTop.level === 9 && iTop.intoLevel === 8 && iTop.progress > 0 && iTop.progress < 1);
let progressBounded = true, infoMatchesLevel = true;
for (let xp = 0; xp <= 2000; xp += 11) {
  const li = levelInfo(xp);
  if (!(li.progress >= 0 && li.progress <= 1)) progressBounded = false;
  if (li.level !== levelFromXp(xp) || li.intoLevel !== xp - xpForLevel(li.level) || li.forNext !== xpForLevel(li.level + 1) - xpForLevel(li.level)) infoMatchesLevel = false;
}
ok("progress always sits in [0,1]", progressBounded);
ok("levelInfo agrees with levelFromXp/xpForLevel on every field", infoMatchesLevel);
ok("forNext is strictly positive so progress never divides by zero",
  [1, 2, 3, 9, 20, 40].every((l) => levelInfo(xpForLevel(l)).forNext > 0));

// --- xpForSession: genuine-completion floor, caps, monotonicity -------------
ok("a textbook session scores exactly 54",
  xpForSession({ minutes: 45, intensity: 3, selfRating: 3, focusCount: 1 }) === 54);
ok("a maximal 90-min/5/5/4-focus session scores exactly 210",
  xpForSession({ minutes: 90, intensity: 5, selfRating: 5, focusCount: 4 }) === 210);
ok("even a degenerate 0-minute completion still floors at 10 (never a bare zero)",
  xpForSession({ minutes: 0, intensity: 1, selfRating: 1, focusCount: 1 }) === 10);
ok("the time factor saturates at 90 minutes (extra hours add nothing)",
  xpForSession({ minutes: 90, intensity: 1, selfRating: 1, focusCount: 1 }) === xpForSession({ minutes: 600, intensity: 1, selfRating: 1, focusCount: 1 }));
const baseS = { minutes: 60, intensity: 2, selfRating: 2, focusCount: 2 };
ok("more intensity never lowers XP", xpForSession({ ...baseS, intensity: 1 }) <= xpForSession({ ...baseS, intensity: 3 }) && xpForSession({ ...baseS, intensity: 3 }) <= xpForSession({ ...baseS, intensity: 5 }));
ok("a higher self-rating never lowers XP", xpForSession({ ...baseS, selfRating: 1 }) <= xpForSession({ ...baseS, selfRating: 5 }));
ok("broader focus never lowers XP", xpForSession({ ...baseS, focusCount: 1 }) <= xpForSession({ ...baseS, focusCount: 5 }));
ok("session XP is always an integer >= 10",
  [[1, 1, 1, 1], [15, 2, 3, 1], [120, 4, 5, 6]].every(([m, i, r, f]) => { const x = xpForSession({ minutes: m, intensity: i, selfRating: r, focusCount: f }); return Number.isInteger(x) && x >= 10; }));

// --- streakBonus: small, monotonic, hard-capped -----------------------------
ok("no bonus before a 3-streak", streakBonus(0) === 0 && streakBonus(2) === 0);
ok("the bonus steps every third session", streakBonus(3) === 1 && streakBonus(6) === 2 && streakBonus(9) === 3);
ok("the bonus is capped at 5 (consistency never runs away)", streakBonus(15) === 5 && streakBonus(9999) === 5);
let streakMono = true, streakPrev = -1;
for (let s = 0; s <= 25; s++) { const b = streakBonus(s); if (b < streakPrev) streakMono = false; streakPrev = b; }
ok("streakBonus is non-decreasing in the streak", streakMono);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
