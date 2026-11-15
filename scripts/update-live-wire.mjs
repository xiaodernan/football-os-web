#!/usr/bin/env node
// M1154 · The Live Wire — the weekly generator behind the real-world wire.
//
// This script is the ONLY door real-world data takes into this repository. It runs in CI
// (and on a maintainer's machine), never in the browser, never at request time. It pulls the
// public-domain 2026/27 season fixture files for seven top European leagues from OpenFootball's
// football.json project (CC0 — no key, no rate limit, no attribution required, and we give it
// anyway), folds each league's table deterministically, and writes ONE committed artifact:
//
//   public/live-wire.json   — the v2 payload the /live-wire screen fetches same-origin.
//
// Honesty contract (enforced, not suggested):
//   · If ANY league's fetch fails, parse fails or fold contradicts itself, the script exits
//     non-zero and the workflow is red. A partial wire (six truths, one blank) is not published.
//   · Scores are shown exactly as the source carries them. Variant score shapes in the
//     source are tolerated explicitly (`{score: {ft:[a,b]}}` and bare `{score:[a,b]}`).
//   · Re-cuts are byte-stable: a week in which nothing but the clock moved yields a file
//     identical in bytes to the committed one, so "commit only if it moved" is a true gate.
//   · Nothing here touches the frozen seeded world's folds; the two never mix.
//
// Usage: node scripts/update-live-wire.mjs
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const BASE = "https://raw.githubusercontent.com/openfootball/football.json/master/2026-27";
const LEAGUES = [
  ["de.1", "2026-27/de.1.json"],
  ["en.1", "2026-27/en.1.json"],
  ["es.1", "2026-27/es.1.json"],
  ["it.1", "2026-27/it.1.json"],
  ["fr.1", "2026-27/fr.1.json"],
  ["nl.1", "2026-27/nl.1.json"],
  ["pt.1", "2026-27/pt.1.json"],
];
const OUT = resolve(process.cwd(), "public", "live-wire.json");

const fail = (msg) => {
  console.error(`live-wire: FATAL — ${msg}`);
  process.exit(1);
};

const fetchWithTimeout = async (url) => {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": "football-os-live-wire/2.0 (+https://github.com/xiaodernan/football-os-web)" },
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

// --- score tolerance: {score: {ht, ft}} or a bare [h, a] array ----------------------------------
const readPair = (score, key) => {
  if (!score) return null;
  if (Array.isArray(score)) return score.length >= 2 ? [Number(score[0]), Number(score[1])] : null;
  const v = score[key];
  return Array.isArray(v) && v.length >= 2 ? [Number(v[0]), Number(v[1])] : null;
};

const order = (a, b) =>
  `${a.date}T${a.time ?? "99:99"}`.localeCompare(`${b.date}T${b.time ?? "99:99"}`);

// Zone: 1-4 UCL · 5-6 Europa · 16-18th relegate (18-team) · bottom-3 relegate (20-team).
const zoneFor = (pos, size) => {
  if (pos <= 4) return "ucl";
  if (pos <= 6) return "europa";
  if (size === 18) {
    if (pos === size - 2) return "playoff";
    if (pos >= size - 1) return "relegation";
  }
  if (pos >= size - 2) return "relegation";
  return null;
};

const foldLeague = (id, file, raw) => {
  let doc;
  try { doc = JSON.parse(raw); } catch (err) { fail(`${file} is not parseable JSON — ${String(err)}`); }
  const leagueName = String(doc?.name ?? "").trim();
  const matches = Array.isArray(doc?.matches) ? doc.matches : null;
  if (!leagueName || !matches || matches.length === 0) fail(`${file} carries no league name or no matches`);

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
      fail(`${file} match #${i} (${f.round}) has a missing team or a bad date — source shape changed?`);
    }
  }
  const finished = fixtures.filter((f) => f.ft !== null);

  const tableMap = new Map();
  const rowFor = (team) => {
    if (!tableMap.has(team)) tableMap.set(team, { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0, form: [] });
    return tableMap.get(team);
  };
  const teamForm = new Map();
  for (const f of [...fixtures].sort(order)) {
    if (!f.ft) continue;
    const [hg, ag] = f.ft;
    if (!Number.isInteger(hg) || !Number.isInteger(ag)) fail(`${file}: non-integer score in ${f.round} ${f.home} v ${f.away}`);
    const home = rowFor(f.home), away = rowFor(f.away);
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
    team: row.team, played: row.played, won: row.won, drawn: row.drawn, lost: row.lost,
    gf: row.gf, ga: row.ga, gd: row.gf - row.ga, pts: row.pts,
    form: (teamForm.get(row.team) ?? []).slice(-5),
  }));
  table.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
  const standings = table.map((row, i) => ({ pos: i + 1, zone: zoneFor(i + 1, table.length), ...row }));

  const teamsSeen = new Set(fixtures.flatMap((f) => [f.home, f.away]));
  if (teamsSeen.size !== standings.length) fail(`${file}: table covers ${standings.length} teams but fixtures mention ${teamsSeen.size}`);
  for (const row of standings) {
    if (row.played !== row.won + row.drawn + row.lost) fail(`${file} ${row.team}: played != w+d+l`);
    if (row.pts !== row.won * 3 + row.drawn) fail(`${file} ${row.team}: pts != 3w+d`);
    if (row.gd !== row.gf - row.ga) fail(`${file} ${row.team}: gd != gf-ga`);
  }
  for (let i = 1; i < standings.length; i += 1) {
    const cmp = standings[i - 1].pts - standings[i].pts || standings[i - 1].gd - standings[i].gd
      || standings[i - 1].gf - standings[i].gf || standings[i].team.localeCompare(standings[i - 1].team);
    if (cmp < 0) fail(`${file}: table order broken at position ${i + 1}`);
  }

  const recent = [...finished].sort(order).reverse().slice(0, 9)
    .map((f) => ({ round: f.round, date: f.date, time: f.time, home: f.home, away: f.away, ft: f.ft, ht: f.ht }));
  const upcoming = fixtures.filter((f) => f.ft === null).sort(order).slice(0, 6)
    .map((f) => ({ round: f.round, date: f.date, time: f.time, home: f.home, away: f.away }));
  // M1160 · the whole season, folded honestly: every committed fixture (scores where they exist) —
  // the same CC0 window the screen reads, so the page can show one calendar without holding another server.
  const seasonFixtures = fixtures.map((f) => ({
    round: f.round, date: f.date, time: f.time, home: f.home, away: f.away,
    ...(f.ft ? { ft: f.ft } : {}),
  }));

  return {
    id, file, url: `${BASE}/${id}.json`, league: leagueName,
    season: leagueName.match(/\d{4}\/\d{2}/)?.[0] ?? leagueName,
    totalFixtures: fixtures.length,
    playedFixtures: finished.length,
    table: standings, recent, upcoming, seasonFixtures,
  };
};

const leaguesOut = [];
for (const [id, file] of LEAGUES) {
  const raw = await fetchWithTimeout(`${BASE}/${id}.json`).catch((err) => fail(`fetch failed for ${file} — ${String(err)}`));
  leaguesOut.push(foldLeague(id, file, raw));
  console.log(`live-wire: folded ${id} — ${leaguesOut[leaguesOut.length - 1].playedFixtures}/${leaguesOut[leaguesOut.length - 1].totalFixtures} fixtures played`);
}

let payload = {
  schema: "live-wire/v3",
  generated_at: new Date().toISOString(),
  source: {
    name: "OpenFootball · football.json",
    license: "CC0-1.0",
  },
  leagues: leaguesOut,
};

// Keep re-cuts honest about movement: if the only thing that changed is the clock, keep the
// committed generated_at so the file is byte-stable week to week when the fold did not move.
if (existsSync(OUT)) {
  try {
    const prev = JSON.parse(readFileSync(OUT, "utf8"));
    const a = { ...prev, generated_at: null };
    const b = { ...payload, generated_at: null };
    if (JSON.stringify(a) === JSON.stringify(b)) {
      payload = { ...payload, generated_at: prev.generated_at };
      console.log("live-wire: no data movement — keeping the previous generated_at (byte-stable file)");
    }
  } catch { /* unparseable predecessor — overwrite honestly */ }
}

writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
const mb = (readFileSync(OUT).length / 1024).toFixed(1);
console.log(`live-wire: wrote ${OUT} (${mb} KB) — ${leaguesOut.length} leagues`);
