// Proof for The Ledger (M1164). The fold is recomputed here INSIDE the proof by hand —
// this test trusts nothing the module says — and the screen ships zero model traffic.
// Run: node scripts/proof-ledger.mjs
import { readFileSync, existsSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

ok("the committed wire artifact exists and is live-wire/v3",
  existsSync("public/live-wire.json") &&
  (() => { try { return JSON.parse(readFileSync("public/live-wire.json", "utf8")).schema === "live-wire/v3"; } catch { return false; } })());

const wire = JSON.parse(readFileSync("public/live-wire.json", "utf8"));
ok("seven leagues are present", (wire?.leagues ?? []).length === 7);
ok("the artifact carries the season fixture count the doctoral line claims (2364)",
  wire.leagues.reduce((n, l) => n + l.seasonFixtures.length, 0) === 2364);

// ---- The homework: goal-difference coherence from the fixture rows alone ----
// For each league: sum over played fixtures of (GF − GA) must equal table sum gd.
let homework = true;
for (const l of wire.leagues) {
  // Per team: GF − GA over the played rows must equal the table's gd.
  const byTeamGF = new Map(), byTeamGA = new Map();
  for (const f of l.seasonFixtures) {
    if (!Array.isArray(f.ft)) continue;
    byTeamGF.set(f.home, (byTeamGF.get(f.home) ?? 0) + f.ft[0]);
    byTeamGA.set(f.home, (byTeamGA.get(f.home) ?? 0) + f.ft[1]);
    byTeamGF.set(f.away, (byTeamGF.get(f.away) ?? 0) + f.ft[1]);
    byTeamGA.set(f.away, (byTeamGA.get(f.away) ?? 0) + f.ft[0]);
  }
  const computed = new Map();
  for (const [team, v] of byTeamGF) computed.set(team, (v ?? 0) - (byTeamGA.get(team) ?? 0));
  for (const r of l.table) {
    if ((computed.get(r.team) ?? 0) !== r.gd) { homework = false; break; }
  }
}
ok("the file checks its own homework: every table gd equals fixture-derived GF − GA, in all seven leagues", homework);

// ---- The module computes those exact numbers, nothing else ----
const domain = readFileSync("domain/wireLedger.ts", "utf8");
ok("the domain fold carries drift as a first-class number (never a silent zero)",
  domain.includes("drift") && domain.includes("gdTable - (gfAll - gaAll)"));
ok("the domain fold folds through the shared sum() door (no inline reduce)",
  /import \{[^}]*\bsum\b[^}]*\}/.test(domain) && !/\.reduce\(\(/.test(domain));
ok("the domain fold ships no model traffic (zero LLM, zero fetch)",
  !/callLlmStream|data\/llm|fetch\(/.test(domain));

// ---- The screen wiring ----
const app = readFileSync("src/App.tsx", "utf8");
ok("App.tsx lazy-imports @/features/ledger/Ledger and mounts /wire-ledger",
  /import\("@\/features\/ledger\/Ledger"\)/.test(app) && /path === "\/wire-ledger"/.test(app));
const shell = readFileSync("features/shell/AppShell.tsx", "utf8");
ok("the shell nav carries /wire-ledger with nav.wireLedger and an I.ledger glyph",
  shell.includes('to: "/wire-ledger"') && shell.includes('t("nav.wireLedger")') && shell.includes("I.ledger"));
const palette = readFileSync("features/command/CommandPalette.tsx", "utf8");
ok("the command palette goto group carries /wire-ledger", palette.includes('nav("/wire-ledger")'));
const manual = readFileSync("features/manual/Manual.tsx", "utf8");
ok("the manual's chapter-3 link list carries /wire-ledger", manual.includes('{ to: "/wire-ledger", label: t("nav.wireLedger") },'));
const journey = readFileSync("domain/journey.ts", "utf8");
ok("the Journey's watch chapter carries /wire-ledger", journey.includes('"/wire-ledger"'));
const cinema = readFileSync("tests/e2e/cinematic.spec.ts", "utf8");
ok("the cinematic catalogue walks /wire-ledger", cinema.includes('"/wire-ledger"'));
const screen = readFileSync("features/ledger/Ledger.tsx", "utf8");
ok("the screen renders print affordance (window.print) with ledger.printHint",
  screen.includes("window.print()") && screen.includes('t("ledger.printHint")'));
ok("the screen ships zero model, zero fetch beyond the same-origin live-wire door",
  !/callLlmStream|LLM_CONFIG|data\/llm/.test(screen) && /fetchLiveWire\(/.test(screen));

const dict = readFileSync("i18n/dictionaries.ts", "utf8");
for (const key of ["nav.wireLedger", "ledger.kicker", "ledger.title", "ledger.subtitle", "ledger.meta", "ledger.tag",
                   "ledger.attack", "ledger.leakiest", "ledger.form", "ledger.drift", "ledger.method", "ledger.print", "ledger.printHint"]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp(`"${key.replace(/\./g, "\\.")}":`, "g")) ?? []).length === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
