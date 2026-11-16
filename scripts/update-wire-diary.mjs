// M1175 · The Wire Diary — generate one honest article per league from the committed fold.
// The LLM is imprisoned to the fold: it is handed the full table (won/drawn/lost/gf/ga/gd/pts),
// the loudest committed result, and nothing else. No news wire, no rumour, no projection.
// Every checkable claim the model writes is re-verified by scripts/lib/wire-diary-claims.mjs
// before anything is written to public/wire-diary.json — drift and the file is replaced by a
// deterministic fold diary (by:"fold", honestly labelled) and this script exits 1.
// Never edit public/wire-diary.json by hand; regenerate with the Clash Verge proxy armed.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { verifyDiaryAgainstFold } from "./lib/wire-diary-claims.mjs";

const ARTICLES = [
  { id: "de.1" }, { id: "en.1" }, { id: "es.1" }, { id: "fr.1" }, { id: "it.1" }, { id: "nl.1" }, { id: "pt.1" },
];

const root = process.cwd();
const artifact = JSON.parse(readFileSync(resolve(root, "public/live-wire.json"), "utf8"));
const outFile = resolve(root, "public/wire-diary.json");
mkdirSync(dirname(outFile), { recursive: true });

const md = (round) => Number(/(\d+)\s*$/.exec(String(round))?.[1] ?? 0);
const iso = (d) => String(d).slice(0, 10);

const foldFindings = [];
const pickLoudest = (l) => {
  const played = (l.seasonFixtures ?? []).filter((f) => Array.isArray(f.ft));
  if (!played.length) return null;
  const best = [...played]
    .map((f) => ({ f, margin: Math.abs(f.ft[0] - f.ft[1]), goals: f.ft[0] + f.ft[1] }))
    .sort((a, b) => b.margin - a.margin || b.goals - a.goals || iso(b.f.date).localeCompare(iso(a.f.date)))[0];
  const pos = new Map(l.table.map((r) => [r.team, r.pos]));
  const homePos = pos.get(best.f.home) ?? null;
  const awayPos = pos.get(best.f.away) ?? null;
  const winner = best.f.ft[0] > best.f.ft[1] ? best.f.home : best.f.away;
  const loser = winner === best.f.home ? best.f.away : best.f.home;
  const winnerPos = winner === best.f.home ? homePos : awayPos;
  const loserPos = winner === best.f.home ? awayPos : homePos;
  return {
    date: iso(best.f.date), round: best.f.round, matchday: md(best.f.round),
    home: best.f.home, away: best.f.away, ftHome: best.f.ft[0], ftAway: best.f.ft[1],
    winner, loser, winnerPos, loserPos,
    shock: winnerPos != null && loserPos != null ? Math.abs(winnerPos - loserPos) : 0,
    underdogWon: winnerPos != null && loserPos != null && winnerPos > loserPos,
  };
};

const lane = (l) => ({
  league: l.league,
  season: l.season,
  played: l.playedFixtures,
  total: l.totalFixtures,
  table: l.table.slice(0, 6).map((r) => ({ pos: r.pos, team: r.team, won: r.won, drawn: r.drawn, lost: r.lost, gf: r.gf, ga: r.ga, gd: r.gd, pts: r.pts, form: (r.form ?? []).join("") })),
  loudest: pickLoudest(l),
});

function buildFoldDiary() {
  // Deterministic fallback, honestly labelled by:"fold". Every clause copied from the artifact — nothing invented.
  return ARTICLES.map(({ id }) => {
    const l = artifact.leagues.find((x) => x.id === id);
    const lead = l.table[0];
    const loudest = pickLoudest(l);
    const paragraphs = [
      `${l.league} has folded ${l.playedFixtures} of ${l.totalFixtures} fixtures on the committed file. ${lead?.team ?? "The leader"} sits first on ${lead?.pts ?? 0} points (${lead?.won ?? 0} wins).`,
      loudest
        ? `The loudest committed result is ${loudest.home} ${loudest.ftHome}-${loudest.ftAway} ${loudest.away} on ${loudest.round}. The fold carries it; nothing is estimated.`
        : `This file carries no completed fixture for ${l.league} yet; the diary waits for the next fold.`,
      `${l.table.length} clubs are on the wire. The table is the whole story the file can prove; nobody has been preferred, nobody has been projected.`,
      `When the next fixtures land on the wire the diary is folded again from the same artifact. Until then — the file is the news.`,
    ];
    return { leagueId: l.id, league: l.league, season: l.season, verdict: "fold", paragraphs };
  });
}

function readEnvKey() {
  if (process.env.LLM_API_KEY) return process.env.LLM_API_KEY;
  const path = resolve(root, ".env");
  if (!existsSync(path)) return "";
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^LLM_API_KEY=(.*)$/);
    if (m) return m[1].trim();
  }
  return "";
}

const ENV_PROXY = process.env.LLM_UPSTREAM_PROXY?.trim();
const proxy = ENV_PROXY ? new ProxyAgent(ENV_PROXY) : undefined;
const wireFetch = proxy ? (url, init) => undiciFetch(url, { ...init, dispatcher: proxy }) : fetch;

async function askOne(key, id, facts) {
  const system = [
    `You are the editor of a district football newspaper writing ONE short dispatch about this league, folded from the committed OpenFootball CC0 file you are shown as JSON.`,
    "ABSOLUTE RULE: use ONLY numbers that appear in the JSON. Never compute, never estimate, never guess — if a figure you want does not appear, do not state it.",
    "Win counts and point counts are DIFFERENT figures. Copy the won and pts fields exactly; never transpose them.",
    "Never invent a club, fixture, manager or score that is not in the FOLD. If a sentence cannot be proved from the FOLD, delete the sentence.",
    "Exactly four paragraphs, plain prose, no headings, under 70 words each.",
    "P1: where the league stands — name the top clubs in table order with their exact won-and-pts figures.",
    "P2: the loudest committed result — its exact date, round, score, and both clubs' table positions.",
    "P3: one honest question this file cannot answer.",
    "P4: hand the season back to the reader.",
    `Output ONLY a JSON object, no prose around it: {"leagueId":"${id}","league":"${facts.league}","season":"${facts.season}","verdict":"model","paragraphs":["...","...","...","..."]}`,
  ].join("\n");
  const body = {
    model: "gpt-6.1-terra",
    messages: [
      { role: "system", content: system },
      { role: "user", content: `FOLD:\n${JSON.stringify(facts)}` },
    ],
    stream: false,
    temperature: 0.15,
    max_tokens: 1200,
    prompt_cache_key: "football-os-diary",
  };
  const res = await wireFetch("https://api.aizzz.xyz/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${bodyText.slice(0, 120)}`);
  }
  const j = await res.json();
  const content = j?.choices?.[0]?.message?.content ?? "";
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("model output carried no JSON object");
  return JSON.parse(content.slice(start, end + 1));
}

async function askOneWithRetry(key, id, facts) {
  try {
    return await askOne(key, id, facts);
  } catch (err) {
    console.warn(`retry ${id} after: ${String(err).slice(0, 100)}`);
    return await askOne(key, id, facts);
  }
}

const key = readEnvKey();
let by = "fold";
let diary;
let verdict = "fold";
if (!key) {
  diary = buildFoldDiary();
  console.log("LLM: no key — the fold diary is emitted (by:fold)");
} else {
  try {
    const lanes = Object.fromEntries(ARTICLES.map(({ id }) => [id, lane(artifact.leagues.find((l) => l.id === id))]));
    const articles = [];
    for (const { id } of ARTICLES) {
      process.stdout.write(`diary ${id} … `);
      const article = await askOneWithRetry(key, id, lanes[id]);
      article.leagueId = id;
      articles.push(article);
      console.log("ok");
    }
    diary = articles;
    const problems = verifyDiaryAgainstFold({ diary }, artifact);
    if (problems.length) {
      foldFindings.push(...problems);
      const dumpPath = resolve(process.env.TEMP ?? root, "wire-diary-refused.json");
      try { writeFileSync(dumpPath, JSON.stringify({ generatedAt: new Date().toISOString(), diary, problems }, null, 2), "utf8"); } catch { /* dump is best effort */ }
      console.error(`model diary refused — claim drift against the fold (${problems.length}); dumped to ${dumpPath}:\n  ` + problems.join("\n  "));
      diary = buildFoldDiary();
      by = "fold"; verdict = "refused";
      process.exitCode = 1;
    } else {
      by = "model"; verdict = "model";
      console.log("LLM: used — every checkable claim verified against the fold");
    }
  } catch (err) {
    console.error("model diary refused — call failed:", String(err).slice(0, 160));
    diary = buildFoldDiary();
    by = "fold"; verdict = "refused";
    process.exitCode = 1;
  }
}
// A fold diary must satisfy the same verifier before it is allowed to exist.
const foldProblems = verifyDiaryAgainstFold({ diary }, artifact);
if (foldProblems.length) {
  console.error("even the fold diary failed verification — refusing to write:\n  " + foldProblems.join("\n  "));
  process.exit(1);
}
writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), by, diary }, null, 0), "utf8");
console.log(`public/wire-diary.json written (by:${by}, verdict:${verdict}${foldFindings.length ? `, ${foldFindings.length} drift(s) refused` : ""})`);
