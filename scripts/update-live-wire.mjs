#!/usr/bin/env node
// M1152 · The Live Wire — the weekly generator behind the real-world wire.
//
// This script is the ONLY door real-world data takes into this repository. It runs in CI
// (and on a maintainer's machine), never in the browser, never at request time. It pulls the
// public-domain Bundesliga 2026/27 fixture file from OpenFootball's football.json project
// (CC0 — no key, no rate limit, no attribution required, and we give it anyway), folds the
// league table deterministically, and writes ONE committed artifact:
//
//   public/live-wire.json   — the payload the /live-wire screen fetches same-origin.
//
// Honesty contract (enforced, not suggested):
//   · If the fetch fails, the JSON cannot be pulled apart, or the fold contradicts itself,
//     the script exits non-zero and the workflow fails loudly. The previously committed file
//     stays in place and is allowed to age — a stale-but-labelled file is honest; a fresh-
//     looking fabrication is not.
//   · Scores are shown exactly as the source carries them. Variant score shapes in the
//     source are tolerated explicitly (`{score: {ft:[a,b]}}` and bare `{score:[a,b]}`).
//   · Nothing here touches the frozen seeded world's folds; the two never mix.
//
// Usage: node scripts/update-live-wire.mjs
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SOURCE_URL =
  "https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/de.1.json";
const OUT = resolve(process.cwd(), "public", "live-wire.json");

const fail = (msg) => {
  console.error(`live-wire: FATAL — ${msg}`);
  process.exit(1);
};

const fetchWithTimeout = async (url) => {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": "football-os-live-wire/1.0 (+https://github.com/xiaodernan/football-os-web)" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 2_000));
    }
  }
  throw new Error("unreachable");
};

let raw;
try {
  raw = await fetchWithTimeout(SOURCE_URL);
} catch (err) {
  fail(`fetch failed after 2 attempts — ${String(err)}`);
}

let doc;
try {
  doc = JSON.parse(raw);
} catch (err) {
  fail(`source is not parseable JSON — ${String(err)}`);
}

const leagueName = String(doc?.name ?? "").trim();
const matches = Array.isArray(doc?.matches) ? doc.matches : null;
if (!leagueName || !matches || matches.length === 0) {
  fail("source carries no league name or no matches — refusing to fold an empty world");
}

// --- score tolerance: {score: {ht, ft}} or a bare [h, a] array (observed in the source) ---
const readPair = (score, key) => {
  if (!score) return null;
  if (Array.isArray(score)) return score.length >= 2 ? [Number(score[0]), Number(score[1])] : null;
  const v = score[key];
  return Array.isArray(v) && v.length >= 2 ? [Number(v[0]), Number(v[1])] : null;
};

const fixtures = matches.map((m) => ({
  round: String(m.round ?? "").trim(),
  date: String(m.date ?? "").trim(),
  time: m.time != null ? String(m.time).trim() : null,
  home: String(m.team1 ?? "").trim(),
  away: String(m.team2 ?? "").trim(),
  ht: readPair(m.score, "ht"),
  ft: Array.isArray(m.score) ? readPair(m.score, null) : readPair(m.score, "ft"),
}));

for (const [i, f] of fixtures.entries()) {
  if (!f.home || !f.away || !/^\d{4}-\d{2}-\d{2}$/.test(f.date)) {
    fail(`match #${i} (${f.round}) is missing a team or a sane date — source shape changed?`);
  }
}

const finished = fixtures.filter((f) => f.ft !== null);
const byTime = (a, b) =>
  `${a.date}T${a.time ?? "99:99"}`.localeCompare(`${b.date}T${b.time ?? "99:99"}`);

// --- the table, folded from full time only ---------------------------------------------------
const tableMap = new Map();
const rowFor = (team) => {
  if (!tableMap.has(team)) {
    tableMap.set(team, { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0, form: [] });
  }
  return tableMap.get(team);
};

const teamForm = new Map(); // team -> chronological results, W/D/L from that team's side
for (const f of [...fixtures].sort(byTime)) {
  if (!f.ft) continue;
  const [hg, ag] = f.ft;
  if (!Number.isInteger(hg) || !Number.isInteger(ag)) fail(`non-integer score in ${f.round} ${f.home} v ${f.away}`);
  const home = rowFor(f.home);
  const away = rowFor(f.away);
  home.played += 1; away.played += 1;
  home.gf += hg; home.ga += ag; away.gf += ag; away.ga += hg;
  if (hg > ag) { home.won += 1; away.lost += 1; home.pts += 3; }
  else if (hg < ag) { away.won += 1; home.lost += 1; away.pts += 3; }
  else { home.drawn += 1; away.drawn += 1; home.pts += 1; away.pts += 1; }
  for (const [team, scored, conceded] of [[f.home, hg, ag], [f.away, ag, hg]]) {
    const letter = scored > conceded ? "W" : scored < conceded ? "L" : "D";
    const arr = teamForm.get(team) ?? [];
    arr.push(letter);
    teamForm.set(team, arr);
  }
}

const table = [...tableMap.values()].map((row) => ({
  team: row.team,
  played: row.played,
  won: row.won,
  drawn: row.drawn,
  lost: row.lost,
  gf: row.gf,
  ga: row.ga,
  gd: row.gf - row.ga,
  pts: row.pts,
  form: (teamForm.get(row.team) ?? []).slice(-5),
}));

table.sort(
  (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team),
);

// zone: 1-4 UCL · 5-6 Europa · 16 play-off · 17-18 relegation (18-team Bundesliga)
const zoneFor = (pos) =>
  pos <= 4 ? "ucl" : pos <= 6 ? "europa" : pos === 16 ? "playoff" : pos >= 17 ? "relegation" : null;

const standings = table.map((row, i) => ({ pos: i + 1, zone: zoneFor(i + 1), ...row }));

// --- internal consistency: the fold must not contradict itself -------------------------------
const teamsSeen = new Set(fixtures.flatMap((f) => [f.home, f.away]));
if (teamsSeen.size !== standings.length) {
  fail(`table covers ${standings.length} teams but fixtures mention ${teamsSeen.size} — refusing to publish`);
}
for (const row of standings) {
  if (row.played !== row.won + row.drawn + row.lost) fail(`row ${row.team}: played != w+d+l`);
  if (row.pts !== row.won * 3 + row.drawn) fail(`row ${row.team}: pts != 3w+d`);
  if (row.gd !== row.gf - row.ga) fail(`row ${row.team}: gd != gf-ga`);
}
for (let i = 1; i < standings.length; i += 1) {
  const cmp =
    standings[i - 1].pts - standings[i].pts ||
    standings[i - 1].gd - standings[i].gd ||
    standings[i - 1].gf - standings[i].gf ||
    standings[i].team.localeCompare(standings[i - 1].team);
  if (cmp < 0) fail(`table order broken at position ${i + 1} (${standings[i].team} above ${standings[i - 1].team})`);
}

const recent = [...finished]
  .sort(byTime)
  .reverse()
  .slice(0, 9)
  .map((f) => ({ round: f.round, date: f.date, time: f.time, home: f.home, away: f.away, ft: f.ft, ht: f.ht }));

const upcoming = fixtures
  .filter((f) => f.ft === null)
  .sort(byTime)
  .slice(0, 6)
  .map((f) => ({ round: f.round, date: f.date, time: f.time, home: f.home, away: f.away }));

const payload = {
  schema: "live-wire/v1",
  generated_at: new Date().toISOString(),
  season: leagueName.match(/\d{4}\/\d{2}/)?.[0] ?? leagueName,
  league: leagueName,
  source: {
    name: "OpenFootball · football.json",
    file: "2026-27/de.1.json",
    url: SOURCE_URL,
    license: "CC0-1.0",
  },
  totalFixtures: fixtures.length,
  playedFixtures: finished.length,
  table: standings,
  recent,
  upcoming,
};

writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
const mb = (readFileSync(OUT).length / 1024).toFixed(1);
console.log(
  `live-wire: wrote ${OUT} (${mb} KB) — ${standings.length} teams · ${finished.length}/${fixtures.length} fixtures played · ${recent.length} recent · ${upcoming.length} upcoming`,
);
