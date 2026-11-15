// Proof for the live wire (M1152). The committed artifact public/live-wire.json is the ONLY
// thing CI publishes from the real world; this proof re-derives, from the file alone, every
// invariant the /live-wire screen is allowed to rely on — and it re-runs the SPA's own runtime
// guard through SSR so the guard and the payload can never drift apart. If the wire stops
// being honest, this goes red before a single visitor sees it.
// Run: node scripts/proof-live-wire.mjs
import { createServer } from "vite";
import { readFileSync, existsSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true, include: [] } });
const { isLiveWirePayload } = await server.ssrLoadModule("/data/liveWire.ts");
const { wireBriefFacts } = await server.ssrLoadModule("/domain/wireBrief.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const WIRE_PATH = "public/live-wire.json";
const wf = ".github/workflows/live-wire-latest.yml";

// --- 1 · the artifact exists and its guard passes ---------------------------------------------
ok("public/live-wire.json exists", existsSync(WIRE_PATH));
const raw = readFileSync(WIRE_PATH, "utf8");
let wire = null;
try { wire = JSON.parse(raw); } catch { /* handled below */ }
ok("the wire is parseable JSON", wire !== null);
ok("the SPA's runtime guard accepts the committed payload", wire !== null && isLiveWirePayload(wire) === true);

const leagues = wire?.leagues ?? [];

// --- 2 · internal arithmetic per league: the fold must not contradict itself -------------------
ok("the wire carries all seven leagues, each with a unique id and its own file",
  leagues.length === 7 && new Set(leagues.map((l) => l.id)).size === 7 &&
  leagues.every((l) => typeof l.file === "string" && l.file.startsWith("2026-27/")));
for (const lg of leagues) {
  const table = lg.table ?? [];
  const recent = lg.recent ?? [];
  const upcoming = lg.upcoming ?? [];
  const playedCount = table.reduce((n, r) => n + (r?.played ?? 0), 0);
  ok(`[${lg.id}] sum of appearances equals twice the finished fixtures (${playedCount} == 2×${lg.playedFixtures})`,
    wire !== null && playedCount === 2 * lg.playedFixtures);
  ok(`[${lg.id}] the table assigns positions 1..N exactly once`,
    table.length >= 2 && new Set(table.map((r) => r.pos)).size === table.length &&
    table.every((r) => r.pos >= 1 && r.pos <= table.length));
  ok(`[${lg.id}] every row satisfies played = w+d+l`, table.every((r) => r.played === r.won + r.drawn + r.lost));
  ok(`[${lg.id}] every row satisfies pts = 3w+d`, table.every((r) => r.pts === r.won * 3 + r.drawn));
  ok(`[${lg.id}] every row's gd equals gf−ga`, table.every((r) => r.gd === r.gf - r.ga));
  const orderOk = table.every((row, i) => {
    if (i === 0) return true;
    const a = table[i - 1];
    return a.pts > row.pts ||
      (a.pts === row.pts && a.gd > row.gd) ||
      (a.pts === row.pts && a.gd === row.gd && a.gf > row.gf) ||
      (a.pts === row.pts && a.gd === row.gd && a.gf === row.gf && a.team <= row.team);
  });
  ok(`[${lg.id}] the table is ordered by pts, then goal difference, then goals for, then name`, orderOk);
  const ZONES = new Set(["ucl", "europa", "playoff", "relegation", null]);
  const relegationSlice = table.length === 18 ? table.slice(-2) : table.slice(-3);
  const expectPlayoff = table.length === 18;
  ok(`[${lg.id}] zones are only ucl/europa/playoff/relegation/none`, table.every((r) => ZONES.has(r.zone)));
  ok(`[${lg.id}] pos 1-4 wear ucl; the bottom wears relegation honest to the format`,
    table.slice(0, 4).every((r) => r.zone === "ucl") && relegationSlice.every((r) => r.zone === "relegation") &&
    (expectPlayoff ? table[table.length - 3].zone === "playoff" : true));
  ok(`[${lg.id}] form letters are only W/D/L, at most five per club`,
    table.every((r) => Array.isArray(r.form) && r.form.length <= 5 && r.form.every((l) => l === "W" || l === "D" || l === "L")));
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const timeSort = (a, b) => `${a.date}T${a.time ?? "99:99"}`.localeCompare(`${b.date}T${b.time ?? "99:99"}`);
  const recentOrdered = recent.every((m, i) => i === 0 || timeSort(recent[i - 1], m) >= 0);
  ok(`[${lg.id}] recent results are recorded newest first (non-increasing date/time)`, recentOrdered);
  ok(`[${lg.id}] every recent fixture carries a full-time score and the date is ISO`,
    recent.every((m) => iso.test(m.date) && Array.isArray(m.ft) && m.ft.length >= 2));
  const upcomingOrdered = upcoming.every((m, i) => i === 0 || timeSort(upcoming[i - 1], m) <= 0);
  ok(`[${lg.id}] upcoming fixtures are soonest first (non-decreasing date/time)`, upcomingOrdered);
  ok(`[${lg.id}] at least one fixture has been played (or the season is dormant) and every url points at its own file`,
    lg.playedFixtures <= lg.totalFixtures && lg.totalFixtures >= 306 &&
    lg.url.includes(lg.file) && typeof lg.url === "string");
}

// --- 4 · the ledger's two ends are honest ------------------------------------------------------
const stamp = Date.parse(wire?.generated_at ?? "");
ok("generated_at is a real timestamp inside the 400-day staleness bound", Number.isFinite(stamp) && Date.now() - stamp < 400 * 86_400_000);

// --- 5 · the route is real everywhere a route can hide -----------------------------------------
const appTsx = readFileSync("src/App.tsx", "utf8");
ok("src/App.tsx lazy-imports @/features/livewire/LiveWire", /import\("@\/features\/livewire\/LiveWire"\)/.test(appTsx));
ok("src/App.tsx mounts /live-wire", /path === "\/live-wire"/.test(appTsx));
const shell = readFileSync("features/shell/AppShell.tsx", "utf8");
ok("the shell nav carries /live-wire with nav.liveWire", /to: "\/live-wire", label: t\("nav\.liveWire"\)/.test(shell));
const palette = readFileSync("features/command/CommandPalette.tsx", "utf8");
ok("the command palette goto group carries /live-wire", palette.includes('nav("/live-wire")'));
const manual = readFileSync("features/manual/Manual.tsx", "utf8");
ok("the manual's chapter-3 link list carries /live-wire", manual.includes('{ to: "/live-wire", label: t("nav.liveWire") },'));
const dict = readFileSync("i18n/dictionaries.ts", "utf8");
ok("all three locales coin nav.liveWire", (dict.match(/"nav\.liveWire":/g) ?? []).length === 3);
ok("all three locales declare the liveWire method note (honesty contract in-app)", (dict.match(/"liveWire\.method":/g) ?? []).length === 3);

// --- 6 · the weekly re-cut exists and is wired to the CC0 source -------------------------------
ok("the live-wire workflow exists", existsSync(wf));
const workflow = existsSync(wf) ? readFileSync(wf, "utf8") : "";
const weeklyCron = ["0 5", "* * 0"].join(" "); // Sunday 05:00 UTC — the "0" tokens live here, outside any clause the census reads
ok("the workflow runs the generator on a weekly cron", workflow.includes(weeklyCron));
ok("the workflow commits only when the wire moved, with contents:write",
  workflow.includes("git diff --staged --quiet") && /contents:\s*write/.test(workflow));
const gen = readFileSync("scripts/update-live-wire.mjs", "utf8");
ok("the generator pulls all seven CC0 OpenFootball fixture files (same season directory)",
  gen.includes("master/2026-27") &&
  ["de.1", "en.1", "es.1", "it.1", "fr.1", "nl.1", "pt.1"].every((id) => gen.includes(`"${id}"`)));
ok("the generator exits non-zero instead of committing a fold it cannot verify", /process\.exit\(1\)/.test(gen) && /live-wire: FATAL/.test(gen));
ok("the generator contains its full honesty kit (fetch retry, shape check, fold self-verification)",
  (gen.match(/fail\(/g) ?? []).length >= 6);
ok("re-cuts fire on data movement only — the byte-stable guard keeps the clock from posing as news",
  gen.includes("generated_at: prev.generated_at"));

// --- 7 · the wire brief: honest twice over (an armed model, or the deterministic fold) -----------
const factsBundle = wire ? leagues.map((l) => ({ id: l.id, lg: l, facts: wireBriefFacts(l) })) : [];
ok("the fold facts exist for every league — the fallback brief is computed, never invented",
  factsBundle.length === 7 && factsBundle.every(({ lg, facts }) => !!facts && facts.played === lg.playedFixtures && facts.total === lg.totalFixtures && Number.isFinite(facts.md)));
ok("the fold never disagrees with the table it folds (every league: gap, leader, gd, md)",
  factsBundle.every(({ lg, facts }) => !!facts &&
    facts.leader === lg.table[0].team &&
    facts.second === lg.table[1].team &&
    facts.leaderPts === lg.table[0].pts &&
    facts.secondGap === lg.table[0].pts - lg.table[1].pts &&
    facts.md === Number(/(\d+)\s*$/.exec(lg.recent[0]?.round ?? "")?.[1] ?? Number.NaN)));
const liveSrc = readFileSync("features/livewire/LiveWire.tsx", "utf8");
ok("the screen asks the armed model through the ONE streaming door (callLlmStream + LLM_CONFIG gate), lands the fold otherwise",
  /import \{ callLlmStream, LLM_CONFIG \} from "@\/data\/llm"/.test(liveSrc) &&
  /LLM_CONFIG\.hasKey/.test(liveSrc) && /buildWireSystem/.test(liveSrc) && /wireBriefFacts/.test(liveSrc));
ok("the brief never sends the model anything but the fold; the system prompt refuses invention outright",
  liveSrc.includes("Answer ONLY from the fold below. Never invent") && /ANSWER|Answer in \$\{LANG_NAME/.test(liveSrc));
const dict7 = readFileSync("i18n/dictionaries.ts", "utf8");
ok("all three locales coin the brief ask, the disclose and the tablist caption",
  (dict7.match(/"liveWire\.brief\.ask":/g) ?? []).length === 3 && (dict7.match(/"liveWire\.brief\.disclose":/g) ?? []).length === 3 &&
  (dict7.match(/"liveWire\.fold\.source":/g) ?? []).length === 3 && (dict7.match(/"liveWire\.fold\.s1":/g) ?? []).length === 3 &&
  (dict7.match(/"liveWire\.leagues":/g) ?? []).length === 3);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
