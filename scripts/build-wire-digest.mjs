// M1193 · The Wire Dossier builder.
//
// The user's report, twice: "why is the input context always so small — codex sends 5万–9万
// tokens and you don't." The frozen DEEP_DIGEST already briefs the model on the demo world;
// what was missing was REAL FOOTBALL. The committed, CC0 live-wire artifact (seven real
// leagues, 2026/27) carries every season fixture and every standing — the most honest,
// most voluminous, most cache-friendly context in the repo.
//
// This builder folds public/live-wire.json into ONE byte-stable text block — committed as
// scripts/wire-digest.txt and appended by scripts/llm-proxy.mjs to the system message of
// every ask, every door, every lane. Nothing time-dependent, nothing locale-dependent, nothing
// machine-dependent: the same committed JSON always produces the same bytes, and the provider's
// prefix cache sees one long shared lane — exactly the codex shape.
//
//   node scripts/build-wire-digest.mjs           # rebuild + print stats
//   node scripts/build-wire-digest.mjs --check   # rebuild to memory, exit 1 if bytes differ

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = resolve(root, "public/live-wire.json");
const TARGET = resolve(root, "scripts/wire-digest.txt");
const CHECK = process.argv.includes("--check");

const src = JSON.parse(readFileSync(SOURCE, "utf8"));

if (!src || !Array.isArray(src.leagues) || src.leagues.length === 0) {
  console.error("live-wire.json: no leagues found");
  process.exit(1);
}

const line = (s) => out.push(s);
const out = [];

line("THE REAL-WORLD WIRE DOSSIER — real football, 2026/27, not the demo world.");
line(`Source: OpenFootball · football.json (CC0-1.0), the committed snapshot the app serves at /live-wire, generated ${src.generated_at}.`);
line("This block is STATIC and identical on every call. The demo world above and this real world below never merge: when the visitor asks about the demo world, the frozen digest answers; when the visitor asks about real leagues, THIS dossier answers. Never invent a fixture, a score, a standing or a club that is not printed here; if it is not here, say so plainly.");
line("");

let fixtureLines = 0;
for (const league of src.leagues) {
  const played = league.playedFixtures;
  const total = league.totalFixtures;
  line(`══ ${league.league} — ${total} fixtures, ${played} played ══`);
  line("TABLE (position, club, points, played, W-D-L, goals, form):");
  for (const r of league.table) {
    const form = Array.isArray(r.form) ? r.form.join("") : "";
    const zone = r.zone ? ` ${r.zone}` : "";
    line(`  ${r.pos}. ${r.team} — ${r.pts}pts P${r.played} W${r.won} D${r.drawn} L${r.lost} ${r.gf}:${r.ga} (${r.gd >= 0 ? "+" : ""}${r.gd})${zone} [${form}]`);
  }
  line("ALL FIXTURES (date, round, home, score, away; a dashed score means not yet played):");
  for (const f of league.seasonFixtures ?? []) {
    const ft = Array.isArray(f.ft) ? `${f.ft[0]}-${f.ft[1]}` : "—";
    fixtureLines += 1;
    line(`  ${f.date} ${String(f.round).replace("Matchday ", "MD")} ${f.home} ${ft} ${f.away}`);
  }
  line("");
}

line("READING THE WIRE: the tables and the fixtures above are the same committed snapshot /live-wire prints. Zone tags in tables: ucl = Champions League, uel = Europa League, conf = Conference League, rel = relegation. A dashed score is a future fixture — describe it as scheduled, never as played.");
line("WHEN THE VISITOR ASKS ABOUT REAL FOOTBALL, quote from this dossier and nothing else. When they ask about the demo world, say plainly that this dossier is the real world and switch to the frozen digest. Never blur the two.");

const bytes = Buffer.byteLength(out.join("\n") + "\n", "utf8");

if (CHECK) {
  let current = null;
  try {
    current = readFileSync(TARGET);
  } catch {
    console.error("wire-digest.txt missing — run without --check to build it");
    process.exit(1);
  }
  const fresh = Buffer.from(out.join("\n") + "\n", "utf8");
  const same = current.equals(fresh);
  console.log(same ? `wire-digest.txt is byte-identical to a fresh build (${bytes} bytes)` : "wire-digest.txt DIFFERS from a fresh build — rebuild it");
  process.exit(same ? 0 : 1);
}

writeFileSync(TARGET, out.join("\n") + "\n", "utf8");
const lines = out.length;
console.log(`wire-digest.txt written: ${bytes} bytes · ${lines} lines · ${fixtureLines} league fixtures across ${src.leagues.length} leagues`);
console.log(`est. tokens (bytes/3.5): ~${Math.round(bytes / 3.5).toLocaleString()}`);
