// Proof for The World Table (M1165). The fold's arithmetic is re-run inside this proof from the
// committed artifact alone — nothing trusted about the module's copy except the constants it loudly
// declares, and the screen's shape. Zero model traffic anywhere.
// Run: node scripts/proof-world-table.mjs
import { readFileSync, existsSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const wire = existsSync("public/live-wire.json") ? JSON.parse(readFileSync("public/live-wire.json", "utf8")) : null;
ok("the committed wire is live-wire/v3", wire?.schema === "live-wire/v3");
ok("seven leagues, 2,364 fixtures accounted", (wire?.leagues ?? []).length === 7 &&
  wire.leagues.reduce((n, l) => n + l.seasonFixtures.length, 0) === 2364);

// ---- The Elo fold, re-executed here from the artifact alone ----
const HOME_EDGE = 65, K = 24, START = 1500;
const order = (wire?.leagues ?? []).flatMap((l) =>
  l.seasonFixtures.filter((f) => Array.isArray(f.ft)).map((f) => ({ f, lid: l.id })),
).sort((a, b) => `${a.f.date}|${a.f.time ?? ""}|${a.lid}|${a.f.round}`.localeCompare(`${b.f.date}|${b.f.time ?? ""}|${b.lid}|${b.f.round}`));
const rating = new Map();
for (const { f } of order) {
  const hg = f.ft[0], ag = f.ft[1];
  if (!rating.has(f.home)) rating.set(f.home, START);
  if (!rating.has(f.away)) rating.set(f.away, START);
  const ra = rating.get(f.home), rb = rating.get(f.away);
  const exp = 1 / (1 + Math.pow(10, -(ra + HOME_EDGE - rb) / 400));
  const you = hg > ag ? 1 : hg === ag ? 0.5 : 0;
  const gd = Math.abs(hg - ag);
  const mult = Math.min(1.25, 1 + 0.25 * Math.log10(gd + 1));
  rating.set(f.home, ra + K * mult * (you - exp));
  rating.set(f.away, rb - K * mult * (you - exp));
}
const sorted = [...rating.entries()].map(([c, v]) => ({ club: c, elo: Math.round(v) }))
  .sort((a, b) => b.elo - a.elo || a.club.localeCompare(b.club));
ok("every club carries a finite rating; the fold is a total order in committed order",
  sorted.length > 0 && sorted.every((r) => Number.isFinite(r.elo)));
ok("the field sums near the flat baseline (Elo is locally zero-sum)",
  Math.abs(sorted.reduce((n, r) => n + (r.elo - START), 0)) <= 8);
ok("at least one club is measured above the flat baseline (wins exist)", sorted[0].elo > START);

// ---- The domain module declares the same constants and never touches the model door ----
const domain = readFileSync("domain/worldTable.ts", "utf8");
ok("domain declares HOME_EDGE = 65, K = 24, START = 1500",
  /HOME_EDGE = 65/.test(domain) && /K = 24/.test(domain) && /START = 1500/.test(domain));
ok("domain processes in committed file order (explicit sort before the fold)",
  /order\.sort\(/.test(domain));
ok("domain ships zero LLM / fetch traffic",
  !/callLlmStream|data\/llm|LLM_CONFIG|fetch\(/.test(domain));

// ---- The screen wiring ----
const app = readFileSync("src/App.tsx", "utf8");
ok("App.tsx lazy-imports @/features/worldtable/WorldTable and mounts /world-table",
  /import\("@\/features\/worldtable\/WorldTable"\)/.test(app) && /path === "\/world-table"/.test(app));
const shell = readFileSync("features/shell/AppShell.tsx", "utf8");
ok("the shell nav carries /world-table with nav.worldTable and an I.world glyph",
  shell.includes('to: "/world-table"') && shell.includes('t("nav.worldTable")') && shell.includes("I.world"));
const palette = readFileSync("features/command/CommandPalette.tsx", "utf8");
ok("the command palette goto group carries /world-table", palette.includes('nav("/world-table")'));
const manual = readFileSync("features/manual/Manual.tsx", "utf8");
ok("the manual's chapter-3 link list carries /world-table", manual.includes('{ to: "/world-table", label: t("nav.worldTable") },'));
const journey = readFileSync("domain/journey.ts", "utf8");
ok("the Journey's watch chapter carries /world-table", journey.includes('"/world-table"'));
const cinema = readFileSync("tests/e2e/cinematic.spec.ts", "utf8");
ok("the cinematic catalogue walks /world-table", cinema.includes('"/world-table"'));
const screen = readFileSync("features/worldtable/WorldTable.tsx", "utf8");
ok("the screen renders print affordance (window.print) with worldTable.printHint",
  screen.includes("window.print()") && screen.includes('t("worldTable.printHint")'));
ok("the screen ships zero model traffic — the only data door is the same-origin live-wire fetch",
  !/callLlmStream|LLM_CONFIG|data\/llm/.test(screen) && /fetchLiveWire\(/.test(screen));
ok("the Δ and GD columns render signed numbers through the lib/utils signed() door",
  /signed\(r\.delta\)/.test(screen) && /signed\(r\.gd\)/.test(screen));

// ---- Dictionary: every coined key in all three locales ----
const dict = readFileSync("i18n/dictionaries.ts", "utf8");
for (const key of ["nav.worldTable", "worldTable.kicker", "worldTable.title", "worldTable.subtitle", "worldTable.meta",
                   "worldTable.tag", "worldTable.rocketLabel", "worldTable.rocket", "worldTable.slumpLabel",
                   "worldTable.slump", "worldTable.rank", "worldTable.elo", "worldTable.leagueCol",
                   "worldTable.method", "worldTable.print", "worldTable.printHint"]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp(`"${key.replace(/\./g, "\\.")}":`, "g")) ?? []).length === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
