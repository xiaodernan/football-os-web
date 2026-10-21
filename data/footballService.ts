import { DEMO_NOW, WORLD } from "./footballSeed";
import { oddsPercents, outcomeOdds, teamMetrics, byKickoff, type TeamMetrics } from "@/domain/analytics";
import type { Club, Competition, Match, NewsArticle, PlayerRef, SearchKind, Standing } from "@/domain/types";
import { DAY_MS, epochMs, indexById, ABSENT } from "@/lib/utils";
import { byOverall, byValueDesc } from "@/domain/attributes";
import type { RowText } from "@/domain/rowText";

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
const clubById = indexById(WORLD.clubs);
const playerById = indexById(WORLD.players);
const compById = indexById(WORLD.competitions);
const matchById = indexById(WORLD.matches);

export const getClub = (id: string) => clubById.get(id);
export const getPlayer = (id: string) => playerById.get(id);
export const getCompetition = (id: string) => compById.get(id);
export const getMatch = (id: string) => matchById.get(id);

export function playersByClub(clubId: string): PlayerRef[] {
  return WORLD.players.filter((p) => p.clubId === clubId).sort(byOverall);
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
    .sort(byKickoff)
    .slice(0, limit);
}

// M289. The demo world has one clock: every fixture and news timestamp derives
// from this anchor. A panel that promises the demo world's "today" must select
// on it — the reader's wall clock drifts away from the anchor (measured
// 2026-10-06: 88 fixtures in the reader's ±2d window against the world's 45)
// and empties the panel forever once it leaves the world's window.
export const DEMO_ANCHOR_MS = epochMs(DEMO_NOW);

export function todayMatches(limit = 5): Match[] {
  return WORLD.matches
    .filter((m) => m.status === "SCHEDULED" && Math.abs(new Date(m.kickoff).getTime() - DEMO_ANCHOR_MS) < 2 * DAY_MS)
    .sort(byKickoff)
    .slice(0, limit);
}

// M290. The same contract at competition scope: the next-fixtures list is every
// match not yet finished, kickoff ascending, so a competition's live matches
// lead its own page instead of appearing nowhere on it.
export function upcomingMatchesForCompetition(compId: string, limit = 8): Match[] {
  return WORLD.matches
    .filter((m) => m.status !== "FINISHED" && m.competitionId === compId)
    .sort(byKickoff)
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
  /** How likely that score is — the share, not the percentage. */
  mostLikelyPct: number;
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
    mostLikelyPct: odds.mostLikelyPct,
    sample: Math.min(h.played, a.played),
  };
}

export function trendingPlayers(n = 6): PlayerRef[] {
  return [...WORLD.players].sort(byValueDesc).slice(0, n);
}

export const newsFeed: NewsArticle[] = WORLD.news;
export const getNews = (id: string) => WORLD.news.find((n) => n.id === id);

// --- Global search (spec §36) ---
// The subtitle is a row, not a string: four of the five producers below used to hand the
// glass a record code or an English word (m.status, p.position, n.kind, "Competition"),
// composed in a module no component-side scan reads. A producer now has to say which half
// is a key — proper nouns ride as plain vars, codes ride as CODE_VARS — and the two
// readers resolve it through rowLine.
// `type` is the same record's other half, and it stayed a hand-typed copy of the union while its
// neighbour became a row: the palette chip printed it, so the field that names which family a
// result belongs to was the one field whose family the glass could not read. It is `SearchKind`
// now, and the chip asks the composer.
export interface SearchResult {
  type: SearchKind;
  id: string;
  // The matched record's own word — the string the scorer matched and the four
  // proper-noun families (club, player, competition, match) show as-is, the same
  // contract the record's name carries everywhere. The news family's title is a
  // composed English SENTENCE, so its glass words ride on `titleRow` (M275) and
  // the string here stays what matching needs: data, never a surface to print.
  title: string;
  // The keyed row for a family whose title is composed prose (news only, M275).
  titleRow?: RowText;
  subtitle: RowText;
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

// M296. The five retrieval scans, uncut. globalSearch ranks across every kind and then
// truncates to the caller's limit, so a broad query fills the limit with high-scored rows
// while whole kinds silently vanish from the survivors — anything derived from the cut
// result describes the cut, not the world.
function searchAll(query: string): (SearchResult & { s: number })[] {
  const q = query.trim();
  if (!q) return [];
  const out: (SearchResult & { s: number })[] = [];
  for (const c of WORLD.clubs) {
    const s = Math.max(score(c.name, q), score(c.short, q));
    if (s > 0) out.push({ type: "club", id: c.id, title: c.name, subtitle: { key: "sr.clubLine", vars: { nation: c.nation, competition: getCompetition(c.competitionId)?.name ?? ABSENT } }, to: `/clubs/${c.id}`, s });
  }
  for (const p of WORLD.players) {
    const s = Math.max(score(p.name, q), score(p.nation, q), score(p.position, q) * 0.6);
    if (s > 0) out.push({ type: "player", id: p.id, title: p.name, subtitle: { key: "sr.playerLine", vars: { group: p.positionGroup, club: getClub(p.clubId)?.name ?? ABSENT, overall: p.overall } }, to: `/players/${p.id}`, s });
  }
  for (const c of WORLD.competitions) {
    const s = score(c.name, q);
    if (s > 0) out.push({ type: "competition", id: c.id, title: c.name, subtitle: { key: "sr.competitionLine", vars: { nation: c.nation } }, to: `/competitions/${c.id}`, s });
  }
  for (const n of WORLD.news) {
    const s = score(n.title, q);
    if (s > 0) out.push({ type: "news", id: n.id, title: n.title, titleRow: { key: n.titleKey, vars: n.titleVars }, subtitle: { key: "sr.newsLine", vars: { source: n.source, kind: n.kind } }, to: `/news/${n.id}`, s });
  }
  for (const m of WORLD.matches) {
    const label = `${getClub(m.homeClubId)?.name} v ${getClub(m.awayClubId)?.name}`;
    const s = score(label, q);
    if (s > 0) out.push({ type: "match", id: m.id, title: label, subtitle: { key: "sr.matchLine", vars: { status: m.status } }, to: `/matches/${m.id}`, s });
  }
  return out;
}

export function globalSearch(query: string, limit = 24): SearchResult[] {
  return searchAll(query)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ s: _s, ...r }) => r);
}

// M296. Per-kind totals over the uncut scan: the search screen's group counters count these,
// not the truncated page's leftovers (measured 2026-10-07: q="a" printed player 48 / club 12
// while the world holds 591 and 55, and 1,464 matching matches rendered nowhere at all).
export function searchTotalsByType(query: string): Record<SearchKind, number> {
  const totals: Record<SearchKind, number> = { club: 0, player: 0, competition: 0, match: 0, news: 0 };
  for (const r of searchAll(query)) totals[r.type]++;
  return totals;
}

export function comparePlayers(aId: string, bId: string) {
  return [getPlayer(aId), getPlayer(bId)].filter(Boolean) as PlayerRef[];
}

// M402: the euro rule used to live here, in a DATA provider, while every other display door
// lived in lib/utils.ts beside the fmt0/fmt1 it is built from — and so a simulation module
// could not read money without pulling this provider in with it. The door moved to
// `fmtMoney` in lib/utils.ts and the ten readers followed it there. This module keeps the
// provider's own exports and nothing else: a display convention has one home, and a second
// name for it would be a second convention.
