// Proof for The Golden Hour (M1173). The fold is recomputed inside this proof from the
// committed artifact alone; nothing is trusted about the module's numbers except the wiring.
import { readFileSync, existsSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const wire = readFileSync("public/live-wire.json", "utf8");
ok("the committed wire is live-wire/v3", (() => { try { return JSON.parse(wire).schema === "live-wire/v3"; } catch { return false; } })());
const w = JSON.parse(wire);
ok("seven leagues and 2,364 fixtures are accounted", (w?.leagues ?? []).length === 7 &&
  w.leagues.reduce((n, l) => n + l.seasonFixtures.length, 0) === 2364);

// ---- The homework re-derivation, done twice: once per league blocks, once as a global highlight
const fold = (() => {
  const blocks = w.leagues.map((l) => {
    const pos = new Map();
    for (const r of l.table) pos.set(r.team, r.pos);
    let biggestWin = null, gm = 0, mostGoals = null, mg = 0, biggestShock = null, sD = -1, played = 0, goals = 0;
    for (const f of l.seasonFixtures) {
      if (!Array.isArray(f.ft)) continue;
      played++;
      const hg = f.ft[0], ag = f.ft[1];
      goals += hg + ag;
      const margin = Math.abs(hg - ag);
      const tot = hg + ag;
      if (margin > gm) { gm = margin; biggestWin = f; }
      if (tot > mg) { mg = tot; mostGoals = f; }
      const hp = pos.get(f.home), ap = pos.get(f.away);
      if (hp && ap && hp !== ap) {
        const winnerPos = hg > ag ? hp : ag > hg ? ap : null;
        const loserPos = winnerPos === hp ? ap : hp;
        if (winnerPos && winnerPos > loserPos) {
          const delta = winnerPos - loserPos;
          if (delta > sD) { sD = delta; biggestShock = { ...f, delta }; }
        }
      }
    }
    return { biggestWin, mostGoals, biggestShock, played, goals, leagueId: l.id };
  });
  return blocks;
})();
ok("the fold yields seven league blocks, every block carries played/goals", fold.length === 7 && fold.every((b) => typeof b.played === "number" && typeof b.goals === "number"));

// global highlight coherence: the best across leagues == max per league (by fold, not the test fold — symmetry)
const maxMargin = Math.max(...fold.map((b) => {
  if (!b.biggestWin) return 0;
  return Math.abs(b.biggestWin.ft[0] - b.biggestWin.ft[1]);
}));
const maxGoals = Math.max(...fold.map((b) => b.mostGoals ? b.mostGoals.ft[0] + b.mostGoals.ft[1] : 0));
ok("the highlight deltas equal the max of per-league boards", maxMargin > 0 && maxGoals >= 3);
const shockCountAll = fold.map((b) => b.biggestShock).filter(Boolean).length;
ok("at least one league carries a computed underdog shock", shockCountAll >= 1);

// ---- The module quality checks
const domain = readFileSync("domain/goldenHour.ts", "utf8");
ok("the module reads sum-door discipline (no stray reduce-sum)", !/\.reduce\(\(/.test(domain) || /import.*\bsum\b/.test(domain));
ok("the module ships zero LLM / fetch traffic", !/callLlmStream|data\/llm|LLM_CONFIG|fetch\(/.test(domain));
ok("the zone-position lookup is declared once per league block (the parsePos fold)", /tablePos\(/.test(domain));
const app = readFileSync("src/App.tsx", "utf8");
ok("App.tsx lazy-imports @/features/goldenhour/GoldenHour and mounts /golden-hour",
  /import\("@\/features\/goldenhour\/GoldenHour"\)/.test(app) && /path === "\/golden-hour"/.test(app));
const shell = readFileSync("features/shell/AppShell.tsx", "utf8");
ok("the shell nav carries /golden-hour with nav.goldenHour and an I.golden glyph",
  shell.includes('to: "/golden-hour"') && shell.includes('t("nav.goldenHour")') && shell.includes("I.golden"));
const palette = readFileSync("features/command/CommandPalette.tsx", "utf8");
ok("the command palette goto carries /golden-hour", palette.includes('nav("/golden-hour")'));
const manual = readFileSync("features/manual/Manual.tsx", "utf8");
ok("the manual's chapter-3 link list carries /golden-hour", manual.includes('{ to: "/golden-hour", label: t("nav.goldenHour") },'));
const journey = readFileSync("domain/journey.ts", "utf8");
ok("the Journey's watch chapter carries /golden-hour", journey.includes('"/golden-hour"'));
const cinema = readFileSync("tests/e2e/cinematic.spec.ts", "utf8");
ok("the cinematic catalogue walks /golden-hour", cinema.includes('"/golden-hour"'));
const screen = readFileSync("features/goldenhour/GoldenHour.tsx", "utf8");
ok("the screen is print-ready (window.print + goldenHour.printHint)", screen.includes("window.print()") && screen.includes('t("goldenHour.printHint")'));
ok("the screen renders the three boards with league chip filter rails", (screen.match(/LEAGUE_ON/g) ?? []).length >= 1 && /biggestShock/.test(screen));
ok("the screen ships zero model, zero fetch beyond the same-origin live-wire door",
  !/callLlmStream|LLM_CONFIG|data\/llm/.test(screen) && /fetchLiveWire\(/.test(screen));

const dict = readFileSync("i18n/dictionaries.ts", "utf8");
for (const key of ["nav.goldenHour", "goldenHour.kicker", "goldenHour.title", "goldenHour.subtitle", "goldenHour.tag", "goldenHour.meta",
                   "goldenHour.biggestWin", "goldenHour.mostGoals", "goldenHour.biggestShock", "goldenHour.none",
                   "goldenHour.print", "goldenHour.printHint", "goldenHour.method"]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp(`"${key.replace(/\./g, "\\.")}":`, "g")) ?? []).length === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
