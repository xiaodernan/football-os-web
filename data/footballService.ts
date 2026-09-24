import { WORLD } from "./footballSeed";
import { oddsPercents, outcomeOdds, teamMetrics, type TeamMetrics } from "@/domain/analytics";
import type { Club, Competition, Match, NewsArticle, PlayerRef, Standing } from "@/domain/types";

// Data Provider Layer (spec §11): the UI never talks to the seed directly, so a
// real provider (football-data.org, commercial) can replace DemoMode without
// touching components. Without an API key the app stays in DEMO MODE.
export interface FootballDataProvider {
  id: string;
  mode: "demo" | "live";
  clubs(): Club[];
  players(): PlayerRef[];
  competitions(): Competition[];
  matches(): Match[];
  standings(compId: string): Standing[];
}

class DemoFootballProvider implements FootballDataProvider {
  id = "demo-seed-v1";
  mode = "demo" as const;
  clubs() {
    return WORLD.clubs;
  }
  players() {
    return WORLD.players;
  }
  competitions() {
    return WORLD.competitions;
  }
  matches() {
    return WORLD.matches;
  }
  standings(compId: string) {
    return WORLD.standings[compId] ?? [];
  }
}

export const footballProvider: FootballDataProvider = new DemoFootballProvider();

export const DEMO_MODE = footballProvider.mode === "demo";

// --- Lookups ---
const clubById = new Map(WORLD.clubs.map((c) => [c.id, c]));
const playerById = new Map(WORLD.players.map((p) => [p.id, p]));
const compById = new Map(WORLD.competitions.map((c) => [c.id, c]));
const matchById = new Map(WORLD.matches.map((m) => [m.id, m]));

export const getClub = (id: string) => clubById.get(id);
export const getPlayer = (id: string) => playerById.get(id);
export const getCompetition = (id: string) => compById.get(id);
export const getMatch = (id: string) => matchById.get(id);

export function playersByClub(clubId: string): PlayerRef[] {
  return WORLD.players.filter((p) => p.clubId === clubId).sort((a, b) => b.overall - a.overall);
}

export function clubIdsByCompetition(compId: string): string[] {
  return compById.get(compId)?.clubIds ?? [];
}

export function recentMatchesForClub(clubId: string, limit = 5): Match[] {
  return WORLD.matches
    .filter((m) => m.status === "FINISHED" && (m.homeClubId === clubId || m.awayClubId === clubId))
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff))
    .slice(0, limit);
}

export function upcomingMatchesForClub(clubId: string, limit = 5): Match[] {
  return WORLD.matches
    .filter((m) => m.status !== "FINISHED" && (m.homeClubId === clubId || m.awayClubId === clubId))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    .slice(0, limit);
}

export function matchesByStatus(status: Match["status"]): Match[] {
  return WORLD.matches.filter((m) => m.status === status);
}

// Per-competition attack/defence ratings are expensive to rebuild per row, and
// the demo dataset is immutable, so index them once per competition.
const metricsIndex = new Map<string, Map<string, TeamMetrics>>();

function metricsFor(compId: string): Map<string, TeamMetrics> {
  let idx = metricsIndex.get(compId);
  if (!idx) {
    idx = new Map(teamMetrics(compId, WORLD.matches, WORLD.clubs).map((m) => [m.clubId, m]));
    metricsIndex.set(compId, idx);
  }
  return idx;
}

export interface FixtureForecast {
  /** Whole percentages that total 100. */
  homePct: number;
  drawPct: number;
  awayPct: number;
  lambdaHome: number;
  lambdaAway: number;
  /** Always lambdaHome + lambdaAway — the two figures a reader sees beside it. */
  expectedTotalGoals: number;
  mostLikelyScore: string;
  sample: number; // matches of form data behind the quieter side
}

/**
 * Modelled pre-match odds for one scheduled fixture, derived from each side's
 * attack/defence ratings over the matches actually played in this dataset.
 * Returns null when there is too little form data to say anything honest — a
 * fixture with no sample is left unforecast rather than guessed at.
 */
export function fixtureForecast(matchId: string): FixtureForecast | null {
  const m = matchById.get(matchId);
  if (!m || m.status === "FINISHED") return null;
  const idx = metricsFor(m.competitionId);
  const h = idx.get(m.homeClubId);
  const a = idx.get(m.awayClubId);
  if (!h || !a || h.played < 2 || a.played < 2) return null;
  const odds = outcomeOdds(h, a);
  const pct = oddsPercents(odds);
  return {
    homePct: pct.home,
    drawPct: pct.draw,
    awayPct: pct.away,
    lambdaHome: odds.lambdaHome,
    lambdaAway: odds.lambdaAway,
    expectedTotalGoals: odds.expectedTotalGoals,
    mostLikelyScore: odds.mostLikelyScore,
    sample: Math.min(h.played, a.played),
  };
}

export function trendingPlayers(n = 6): PlayerRef[] {
  return [...WORLD.players].sort((a, b) => b.value - a.value).slice(0, n);
}

export const newsFeed: NewsArticle[] = WORLD.news;
export const getNews = (id: string) => WORLD.news.find((n) => n.id === id);

// --- Global search (spec §36) ---
export interface SearchResult {
  type: "club" | "player" | "competition" | "match" | "news";
  id: string;
  title: string;
  subtitle: string;
  to: string;
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");}

function score(hay: string, needle: string): number {
  const h = norm(hay);
  const n = norm(needle);
  if (!n) return 0;
  if (h === n) return 100;
  if (h.startsWith(n)) return 80;
  if (h.includes(n)) return 55;
  // simple subsequence fuzzy
  let i = 0;
  for (const ch of h) if (ch === n[i]) i++;
  return i >= n.length ? 30 : 0;
}

export function globalSearch(query: string, limit = 24): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const out: (SearchResult & { s: number })[] = [];
  for (const c of WORLD.clubs) {
    const s = Math.max(score(c.name, q), score(c.short, q));
    if (s > 0) out.push({ type: "club", id: c.id, title: c.name, subtitle: `${c.nation} · ${getCompetition(c.competitionId)?.name ?? ""}`, to: `/clubs/${c.id}`, s });
  }
  for (const p of WORLD.players) {
    const s = Math.max(score(p.name, q), score(p.nation, q), score(p.position, q) * 0.6);
    if (s > 0) out.push({ type: "player", id: p.id, title: p.name, subtitle: `${p.position} · ${getClub(p.clubId)?.name ?? ""} · OVR ${p.overall}`, to: `/players/${p.id}`, s });
  }
  for (const c of WORLD.competitions) {
    const s = score(c.name, q);
    if (s > 0) out.push({ type: "competition", id: c.id, title: c.name, subtitle: `${c.nation} · Competition`, to: `/competitions/${c.id}`, s });
  }
  for (const n of WORLD.news) {
    const s = score(n.title, q);
    if (s > 0) out.push({ type: "news", id: n.id, title: n.title, subtitle: `${n.source} · ${n.kind}`, to: `/news/${n.id}`, s });
  }
  for (const m of WORLD.matches) {
    const label = `${getClub(m.homeClubId)?.name} v ${getClub(m.awayClubId)?.name}`;
    const s = score(label, q);
    if (s > 0) out.push({ type: "match", id: m.id, title: label, subtitle: m.status, to: `/matches/${m.id}`, s });
  }
  return out.sort((a, b) => b.s - a.s).slice(0, limit).map(({ s: _s, ...r }) => r);
}

export function comparePlayers(aId: string, bId: string) {
  return [getPlayer(aId), getPlayer(bId)].filter(Boolean) as PlayerRef[];
}

export function formatValue(v: number): string {
  if (v >= 1_000_000_000) return `€${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v}`;
}
