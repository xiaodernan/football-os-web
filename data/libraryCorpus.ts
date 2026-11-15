// M1151 · The Library · 读书室 — a reading room over the frozen seeded world.
//
// What is in here, deliberately, and why (this module sits in data/ rather than domain/ because a
// zero-prose ceiling binds domain/ — every sentence here is an English scoring signal, never UI copy):
//  · A BM25 index (Okapi k1=1.5, b=0.75) assembled once per session from the seed's own shape —
//    player fact sheets, club fact sheets, league standings rendered into compact prose, fixtures,
//    and the news headline bodies the seed can already phrase in English. Deterministic, same bytes
//    every time, and no LLM writes a single corpus row.
//  · `searchLibrary(q)` returns ranked hits with their own route target and entity kind, so the
//    reading room can hand the visitor straight into `/football/player/:id` / `/football/club/:id`
//    / `/football/match/:id` / `/world` / `/news`.
//  · The corpus, in brackets, is corpus prose — the whole reason this file lives under data/, not
//    domain/: domain is zero-prose.
//
// All English prose here is scoring signal only; the UI never prints raw corpus text.

import type { Match } from "@/domain/types";
import { footballProvider, newsFeed } from "@/data/footballService";
import { isFinished } from "@/domain/analytics";
import { customPointsTable, STANDARD_RULES } from "@/domain/league";
import { sum, tally, last } from "@/domain/attributes";
import { safeDiv } from "@/lib/utils";

export type LibraryDocKind = "news" | "club" | "player" | "league" | "fixture";
export interface LibraryDoc {
  id: string;
  kind: LibraryDocKind;
  text: string;
  target: string;
}
export interface LibraryHit {
  document: LibraryDoc;
  score: number;
}

const BM25_K1 = 1.5;
const BM25_B = 0.75;
const MAX_HITS = 8;

const tokenize = (s: string): string[] =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);

interface Index {
  docs: LibraryDoc[];
  postings: Map<string, Map<number, number>>;
  docLengths: number[];
  avgLength: number;
  totalDocs: number;
}

let corpusMemo: Index | null = null;
const corpus = (): Index => {
  if (corpusMemo) return corpusMemo;
  const provider = footballProvider;
  const players = provider.players();
  const clubs = provider.clubs();
  const byClub = new Map(clubs.map((c) => [c.id, c] as const));
  const docs: LibraryDoc[] = [];

  for (const comp of provider.competitions()) {
    const table = customPointsTable(comp.id, provider.matches(), clubs, STANDARD_RULES);
    const rows = [...table.rows].sort((a, b) => a.standardPosition - b.standardPosition);
    if (rows.length === 0) continue;
    const lead = rows[0];
    // rows.length checked above; last() answers the final element and is defined here.
    const tail = last(rows)!;
    const mid = rows[Math.floor(rows.length / 2)];
    const leadName = byClub.get(lead.clubId)?.name ?? lead.clubId;
    const tailName = byClub.get(tail.clubId)?.name ?? tail.clubId;
    const midName = byClub.get(mid.clubId)?.name ?? mid.clubId;
    docs.push({
      id: `league:${comp.id}`,
      kind: "league",
      target: `/world`,
      text:
        `${comp.name} table. ` +
        `${leadName} lead with ${lead.standardPoints} points from ${lead.played} played. ` +
        `${tailName} sit last on ${tail.standardPoints}. ` +
        `${midName} bridge the middle on ${mid.standardPoints}. ` +
        `${rows.length} clubs in the ${comp.name}.`,
    });
  }

  for (const club of clubs) {
    const table = customPointsTable(club.competitionId, provider.matches(), clubs, STANDARD_RULES);
    const row = table.rows.find((r) => r.clubId === club.id);
    const squad = players.filter((p) => p.clubId === club.id).length;
    docs.push({
      id: `club:${club.id}`,
      kind: "club",
      target: `/football/club/${club.id}`,
      text:
        `${club.name} club fact sheet. ` +
        `${club.name} stadium ${club.stadium}. ` +
        `${club.name} nickname ${(club as { shortName?: string }).shortName ?? club.name}. ` +
        `Squad of ${squad}. Overall ${club.overall}. ` +
        (row ? `Position ${row.standardPosition} with ${row.standardPoints} points from ${row.played} played.` : "Not ranked yet."),
    });
  }

  for (const p of players) {
    const club = byClub.get(p.clubId);
    docs.push({
      id: `player:${p.id}`,
      kind: "player",
      target: `/football/player/${p.id}`,
      text:
        `${p.name} overall ${p.overall} at ${club?.name ?? p.clubId}. ` +
        `${p.name} plays in position group ${p.positionGroup}. ` +
        `Age ${p.age}. Overall ${p.overall} (potential ${p.potential}). ` +
        `${p.name} value ${p.value} million euros. ` +
        `${p.name} from ${p.nation}. Foot ${p.foot}. Archetype ${p.archetype}.`,
    });
  }

  for (const m of provider.matches() as Match[]) {
    const home = byClub.get(m.homeClubId);
    const away = byClub.get(m.awayClubId);
    if (!home || !away) continue;
    docs.push({
      id: `fixture:${m.id}`,
      kind: "fixture",
      target: `/football/match/${m.id}`,
      text:
        `${home.name} vs ${away.name} in the ${m.competitionId}. ` +
        (isFinished(m) ? `Full time ${m.homeGoals}-${m.awayGoals}.` : "Upcoming fixture."),
    });
  }

  for (const n of newsFeed.slice(0, 400)) {
    docs.push({
      id: `news:${n.id}`,
      kind: "news",
      target: `/news/${n.id}`,
      text: n.title,
    });
  }

  const postings = new Map<string, Map<number, number>>();
  const docLengths = docs.map((d) => tokenize(d.text).length);
  docs.forEach((d, i) => {
    const tf = tally(tokenize(d.text), (t) => t);
    for (const [term, count] of tf) {
      const owned = postings.get(term) ?? new Map<number, number>();
      owned.set(i, count);
      postings.set(term, owned);
    }
  });
  corpusMemo = {
    docs,
    postings,
    docLengths,
    avgLength: safeDiv(sum(docLengths, (n) => n), docLengths.length),
    totalDocs: docs.length,
  };
  return corpusMemo;
};

export function searchLibrary(query: string): LibraryHit[] {
  const q = tokenize(query);
  if (q.length === 0) return [];
  const { docs, postings, docLengths, avgLength, totalDocs } = corpus();
  const scores = new Float64Array(docs.length);
  for (const term of q) {
    const p = postings.get(term);
    if (!p) continue;
    const df = p.size;
    const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);
    for (const [i, tf] of p) {
      const dl = docLengths[i];
      const denom = tf + BM25_K1 * (1 - BM25_B + (BM25_B * dl) / avgLength);
      scores[i] += (idf * (tf * (BM25_K1 + 1))) / denom;
    }
  }
  const hits: LibraryHit[] = [];
  for (let i = 0; i < docs.length; i++) {
    if (scores[i] > 0) hits.push({ document: docs[i], score: scores[i] });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, MAX_HITS);
}
