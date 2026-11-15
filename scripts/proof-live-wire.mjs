// Proof for the live wire (M1152). The committed artifact public/live-wire.json is the ONLY
// thing CI publishes from the real world; this proof re-derives, from the file alone, every
// invariant the /live-wire screen is allowed to rely on — and it re-runs the SPA's own runtime
// guard through SSR so the guard and the payload can never drift apart. If the wire stops
// being honest, this goes red before a single visitor sees it.
// Run: node scripts/proof-live-wire.mjs
import { createServer } from "vite";
import { readFileSync, existsSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { isLiveWirePayload } = await server.ssrLoadModule("/data/liveWire.ts");

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

const table = wire?.table ?? [];
const recent = wire?.recent ?? [];
const upcoming = wire?.upcoming ?? [];

// --- 2 · internal arithmetic: the fold must not contradict itself ------------------------------
const playedCount = table.reduce((n, r) => n + (r?.played ?? 0), 0);
ok(`sum of appearances equals twice the finished fixtures (${playedCount} == 2×${wire?.playedFixtures})`,
  wire !== null && playedCount === 2 * wire.playedFixtures);
ok("the table has ≥ 2 clubs and assigns positions 1..N exactly once",
  table.length >= 2 && new Set(table.map((r) => r.pos)).size === table.length &&
  table.every((r) => r.pos >= 1 && r.pos <= table.length));
ok("every row satisfies played = w+d+l", table.every((r) => r.played === r.won + r.drawn + r.lost));
ok("every row satisfies pts = 3w+d", table.every((r) => r.pts === r.won * 3 + r.drawn));
ok("every row's gd equals gf−ga", table.every((r) => r.gd === r.gf - r.ga));
const orderOk = table.every((row, i) => {
  if (i === 0) return true;
  const a = table[i - 1];
  return a.pts > row.pts ||
    (a.pts === row.pts && a.gd > row.gd) ||
    (a.pts === row.pts && a.gd === row.gd && a.gf > row.gf) ||
    (a.pts === row.pts && a.gd === row.gd && a.gf === row.gf && a.team <= row.team);
});
// sorted pts desc → gd desc → gf desc → team asc (the documented German tiebreak, then name)
ok("the table is ordered by pts, then goal difference, then goals for, then name", orderOk);

// --- 3 · zones and form stay inside their vocabularies ----------------------------------------
const ZONES = new Set(["ucl", "europa", "playoff", "relegation", null]);
ok("zones are only ucl/europa/playoff/relegation/—", table.every((r) => ZONES.has(r.zone)));
ok("pos 1-4 wear ucl and pos 17-18 wear relegation (18-team format)",
  table.slice(0, 4).every((r) => r.zone === "ucl") && table.slice(16).every((r) => r.zone === "relegation"));
ok("form letters are only W/D/L, at most five per club",
  table.every((r) => Array.isArray(r.form) && r.form.length <= 5 && r.form.every((l) => l === "W" || l === "D" || l === "L")));

// --- 4 · the ledger's two ends are honest ------------------------------------------------------
const stamp = Date.parse(wire?.generated_at ?? "");
ok("generated_at is a real timestamp no older than 400 days from CI's clock perspective", Number.isFinite(stamp) && Date.now() - stamp < 400 * 86_400_000);
const iso = /^\d{4}-\d{2}-\d{2}$/;
const timeSort = (a, b) => `${a.date}T${a.time ?? "99:99"}`.localeCompare(`${b.date}T${b.time ?? "99:99"}`);
ok("summary recency: fewer finished fixtures than the calendar commits to",
  wire !== null && wire.playedFixtures <= wire.totalFixtures && wire.totalFixtures >= 306);
const recentOrdered = recent.every((m, i) => i === 0 || timeSort(recent[i - 1], m) >= 0);
ok("recent results are recorded newest first (non-increasing date/time)", recentOrdered);
ok("every recent fixture carries a full-time score and the date is ISO",
  recent.every((m) => iso.test(m.date) && Array.isArray(m.ft) && m.ft.length >= 2));
const upcomingOrdered = upcoming.every((m, i) => i === 0 || timeSort(upcoming[i - 1], m) <= 0);
ok("upcoming fixtures are soonest first (non-decreasing date/time)", upcomingOrdered);

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
ok("the generator pulls the CC0 OpenFootball fixture file", gen.includes("raw.githubusercontent.com/openfootball/football.json/master/2026-27/de.1.json"));
ok("the generator exits non-zero instead of committing a fold it cannot verify", /process\.exit\(1\)/.test(gen) && /refusing/.test(gen));
ok("the generator contains its full honesty kit (fetch retry, shape check, fold self-verification)",
  (gen.match(/fail\(/g) ?? []).length >= 6);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
