import { useMemo, useState, type ReactNode } from "react";
import { Link, matchRoute, useRouter } from "@/lib/router";
import {
  footballProvider,
  getClub,
  getPlayer,
  getCompetition,
  getNews,
  clubIdsByCompetition,
  matchesByStatus,
  fixtureForecast,
  trendingPlayers,
  newsFeed,
  globalSearch,
  formatValue,
  DEMO_MODE,
} from "@/data/footballService";
import type { Club, Match, PlayerRef, Standing } from "@/domain/types";
import { Panel, SectionTitle, StatTile, Crest, PositionTag, EmptyState, DemoBadge } from "@/ui/primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PlayerDetail, ClubDetail, MatchDetail, FavoriteButton } from "@/features/football/Details";
import { buildImpact, CERTAINTY_TONE, type ImpactEntity, type ClubStandingFact } from "@/domain/newsImpact";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** Route dispatcher for the read-only Football World (spec §12–§13, §28). */
export function FootballWorld() {
  const { path } = useRouter();

  let m: Record<string, string> | null;
  if ((m = matchRoute("/players/:id", path))) return <PlayerDetail id={m.id} />;
  if (matchRoute("/players", path)) return <PlayersList />;
  if ((m = matchRoute("/clubs/:id", path))) return <ClubDetail id={m.id} />;
  if (matchRoute("/clubs", path)) return <ClubsList />;
  if ((m = matchRoute("/competitions/:id", path))) return <CompetitionDetail id={m.id} />;
  if (matchRoute("/competitions", path)) return <CompetitionsList />;
  if ((m = matchRoute("/matches/:id", path))) return <MatchDetail id={m.id} />;
  if (matchRoute("/matches", path)) return <MatchesList />;
  if ((m = matchRoute("/news/:id", path))) return <NewsDetail id={m.id} />;
  if (matchRoute("/news", path)) return <NewsList />;
  if (matchRoute("/search", path)) return <SearchPage />;
  return <FootballHub />;
}

function PageHeader({ title, hint, back }: { title: string; hint?: string; back?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {back && (
          <Link to={back} className="text-xs text-muted-foreground hover:text-foreground">← {t2.back}</Link>
        )}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {DEMO_MODE && <DemoBadge />}
        </div>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
// local key for back label (avoids needing t in header)
const t2 = { back: "Back" };

function EntityLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={cn("block rounded-lg border bg-card/30 p-3 transition hover:border-primary/50 hover:bg-card/60", className)}>
      {children}
    </Link>
  );
}

function PlayerRow({ p }: { p: PlayerRef }) {
  const club = getClub(p.clubId);
  return (
    <EntityLink to={`/players/${p.id}`} className="flex items-center gap-3 py-2">
      <Crest colors={club?.colors} short={club?.short} size={30} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{p.name}</div>
        <div className="truncate text-xs text-muted-foreground">{club?.name} · {p.nation} · {p.age}y</div>
      </div>
      <PositionTag position={p.position} />
      <span className="w-9 text-right font-mono text-sm text-primary">{p.overall}</span>
    </EntityLink>
  );
}

function ClubRow({ c }: { c: Club }) {
  return (
    <EntityLink to={`/clubs/${c.id}`} className="flex items-center gap-3">
      <Crest colors={c.colors} short={c.short} size={38} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{c.name}</div>
        <div className="truncate text-xs text-muted-foreground">{c.nation} · {c.stadium}</div>
      </div>
      <span className="font-mono text-sm text-primary">{c.overall}</span>
    </EntityLink>
  );
}

function MatchRow({ m }: { m: Match }) {
  const home = getClub(m.homeClubId);
  const away = getClub(m.awayClubId);
  const comp = getCompetition(m.competitionId);
  const score = m.status === "SCHEDULED" ? fmtDateTime(m.kickoff) : `${m.homeGoals} – ${m.awayGoals}`;
  const fc = m.status === "SCHEDULED" ? fixtureForecast(m.id) : null;
  return (
    <EntityLink to={`/matches/${m.id}`}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{comp?.name}</span>
        <span className={cn(m.status === "LIVE" && "text-destructive")}>{m.status}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="flex-1 truncate text-right text-sm">{home?.name}</span>
        <Crest colors={home?.colors} short={home?.short} size={24} />
        <span className="w-16 text-center font-mono text-sm font-semibold">{score}</span>
        <Crest colors={away?.colors} short={away?.short} size={24} />
        <span className="flex-1 truncate text-sm">{away?.name}</span>
      </div>
      {fc && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
          <span className="rounded border px-1 py-px uppercase tracking-wide">model</span>
          <span className="font-mono tabular-nums">
            {fc.homePct} · {fc.drawPct} · {fc.awayPct}%
          </span>
          <span>xG {fc.lambdaHome.toFixed(2)}–{fc.lambdaAway.toFixed(2)}</span>
          <span>likely {fc.mostLikelyScore}</span>
          <span>{fc.sample} match{fc.sample === 1 ? "" : "es"} of form</span>
        </div>
      )}
    </EntityLink>
  );
}

function NewsRow({ id, compact }: { id: string; compact?: boolean }) {
  const n = getNews(id);
  if (!n) return null;
  return (
    <EntityLink to={`/news/${n.id}`}>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="outline" className={cn("border-none px-1.5 py-0 text-[10px]", kindTone(n.kind))}>{n.kind}</Badge>
        <span>{n.source}</span>
        <span>·</span>
        <span>{fmtDate(n.publishedAt)}</span>
        <span className="ml-auto font-mono">{Math.round(n.credibility * 100)}%</span>
      </div>
      <div className="mt-1 text-sm font-medium leading-snug">{n.title}</div>
      {!compact && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.summary}</div>}
    </EntityLink>
  );
}

function kindTone(kind: string): string {
  switch (kind) {
    case "Confirmed": return "text-success";
    case "Reported": return "text-info";
    case "Rumor": return "text-warning";
    default: return "text-muted-foreground";
  }
}

// ---------- Hub ----------
function FootballHub() {
  const comps = footballProvider.competitions();
  const live = matchesByStatus("LIVE").slice(0, 6);
  const upcoming = matchesByStatus("SCHEDULED").slice(0, 6);
  const trending = trendingPlayers(8);
  const news = newsFeed.slice(0, 6);
  return (
    <div className="space-y-6">
      <PageHeader title="Football World" hint="Clubs, players, competitions, matches and news from the seeded world dataset." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link to="/competitions"><StatTile label="Competitions" value={comps.length} /></Link>
        <Link to="/clubs"><StatTile label="Clubs" value={footballProvider.clubs().length} /></Link>
        <Link to="/players"><StatTile label="Players" value={footballProvider.players().length} /></Link>
        <Link to="/matches"><StatTile label="Matches" value={footballProvider.matches().length} /></Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <SectionTitle title="Live now" hint={`${live.length || 0} in play`} />
          {live.length ? live.map((m) => <MatchRow key={m.id} m={m} />) : (
            <Panel className="p-4"><EmptyState title="No live matches right now" hint="Explore scheduled fixtures below." /></Panel>
          )}
          <SectionTitle title="Upcoming fixtures" action={<Link to="/matches" className="text-xs text-primary">All matches →</Link>} />
          <div className="grid gap-2 sm:grid-cols-2">{upcoming.map((m) => <MatchRow key={m.id} m={m} />)}</div>
        </div>
        <div className="space-y-4">
          <Panel className="p-4">
            <SectionTitle title="Trending players" action={<Link to="/players" className="text-xs text-primary">All →</Link>} />
            <div className="mt-1 divide-y">{trending.map((p) => <PlayerRowCompact key={p.id} p={p} />)}</div>
          </Panel>
          <Panel className="p-4">
            <SectionTitle title="Latest news" action={<Link to="/news" className="text-xs text-primary">All →</Link>} />
            <div className="mt-2 space-y-2">{news.map((n) => <NewsRow key={n.id} id={n.id} compact />)}</div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PlayerRowCompact({ p }: { p: PlayerRef }) {
  return (
    <Link to={`/players/${p.id}`} className="flex items-center gap-2 py-1.5 text-sm hover:text-primary">
      <span className="flex-1 truncate">{p.name}</span>
      <PositionTag position={p.position} />
      <span className="font-mono text-xs text-primary">{p.overall}</span>
    </Link>
  );
}

// ---------- Lists ----------
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="max-w-sm" />;
}

function PlayersList() {
  const { query } = useRouter();
  const clubFilter = query.get("club") ?? "";
  const [term, setTerm] = useState(clubFilter ? "" : (query.get("q") ?? ""));
  const q = term.toLowerCase();
  const all = footballProvider.players();
  const rows = useMemo(() => {
    return all
      .filter((p) => (!clubFilter || p.clubId === clubFilter))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.nation.toLowerCase().includes(q) || p.position.toLowerCase().includes(q))
      .sort((a, b) => b.overall - a.overall);
  }, [all, q, clubFilter]);
  return (
    <div className="space-y-5">
      <PageHeader title="Players" hint={`${rows.length} of ${all.length}`} back="/football" />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={term} onChange={setTerm} placeholder="Filter by name, nation, position…" />
        {clubFilter && <Badge variant="outline" className="text-primary">Club: {getClub(clubFilter)?.name} <Link to="/players" className="ml-1 text-muted-foreground">✕</Link></Badge>}
      </div>
      <Panel className="divide-y p-1">
        {rows.length ? rows.map((p) => <PlayerRow key={p.id} p={p} />) : <div className="p-4"><EmptyState title="No players match" /></div>}
      </Panel>
    </div>
  );
}

function ClubsList() {
  const all = footballProvider.clubs();
  const comps = footballProvider.competitions();
  return (
    <div className="space-y-5">
      <PageHeader title="Clubs" hint={`${all.length} clubs across ${comps.length} competitions`} back="/football" />
      {comps.map((comp) => {
        const clubs = all.filter((c) => c.competitionId === comp.id).sort((a, b) => b.overall - a.overall);
        if (!clubs.length) return null;
        return (
          <div key={comp.id} className="space-y-2">
            <SectionTitle title={comp.name} hint={comp.nation} action={<Link to={`/competitions/${comp.id}`} className="text-xs text-primary">Standings →</Link>} />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{clubs.map((c) => <ClubRow key={c.id} c={c} />)}</div>
          </div>
        );
      })}
    </div>
  );
}

function CompetitionsList() {
  const comps = [...footballProvider.competitions()].sort((a, b) => a.tier - b.tier);
  return (
    <div className="space-y-5">
      <PageHeader title="Competitions" hint={`${comps.length} tournaments`} back="/football" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {comps.map((c) => (
          <EntityLink key={c.id} to={`/competitions/${c.id}`} className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">🏆</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{c.name}</div>
              <div className="truncate text-xs text-muted-foreground">{c.nation} · {c.clubIds.length} teams · Tier {c.tier}</div>
            </div>
          </EntityLink>
        ))}
      </div>
    </div>
  );
}

function MatchesList() {
  const { query } = useRouter();
  const [tab, setTab] = useState<"LIVE" | "SCHEDULED" | "FINISHED">(
    (query.get("status") as "LIVE") || "SCHEDULED",
  );
  const rows = matchesByStatus(tab).slice(0, 60);
  return (
    <div className="space-y-5">
      <PageHeader title="Matches" hint={`${rows.length} ${tab.toLowerCase()}`} back="/football" />
      <div className="flex gap-1.5">
        {(["LIVE", "SCHEDULED", "FINISHED"] as const).map((s) => (
          <button key={s} onClick={() => setTab(s)} className={cn("rounded-md border px-3 py-1.5 text-xs", tab === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{s}</button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.length ? rows.map((m) => <MatchRow key={m.id} m={m} />) : <div className="sm:col-span-2"><EmptyState title={`No ${tab.toLowerCase()} matches`} /></div>}
      </div>
    </div>
  );
}

function NewsList() {
  return (
    <div className="space-y-5">
      <PageHeader title="News Intelligence" hint={`${newsFeed.length} articles · each carries a source and credibility score`} back="/football" />
      <Panel className="divide-y p-1">{newsFeed.map((n) => <NewsRow key={n.id} id={n.id} />)}</Panel>
    </div>
  );
}

function NewsDetail({ id }: { id: string }) {
  const n = getNews(id);
  const impact = useMemo(() => {
    if (!n) return null;
    const entities: ImpactEntity[] = [];
    const clubIds = new Set<string>();
    for (const e of n.entityIds) {
      const p = getPlayer(e);
      if (p) {
        const club = getClub(p.clubId);
        const comp = club ? getCompetition(club.competitionId) : undefined;
        entities.push({ id: p.id, label: p.name, role: "player", to: `/players/${p.id}`, clubName: club?.name, competitionName: comp?.name });
        if (club) clubIds.add(club.id);
        continue;
      }
      const c = getClub(e);
      if (c) {
        const comp = getCompetition(c.competitionId);
        entities.push({ id: c.id, label: c.name, role: "club", to: `/clubs/${c.id}`, clubName: c.name, competitionName: comp?.name });
        clubIds.add(c.id);
      }
    }
    const standings: ClubStandingFact[] = [];
    for (const cid of clubIds) {
      const club = getClub(cid);
      if (!club) continue;
      const table = footballProvider.standings(club.competitionId);
      const pos = table.findIndex((s) => s.clubId === cid);
      if (pos >= 0) {
        const comp = getCompetition(club.competitionId);
        standings.push({ clubLabel: club.name, competitionName: comp?.name ?? "the league", position: pos + 1, total: table.length, points: table[pos].points });
      }
    }
    return buildImpact({ article: n, entities, standings });
  }, [n]);
  if (!n) return <EmptyState title="Article not found" />;
  const entities = n.entityIds.map((e) => getPlayer(e) ? { label: getPlayer(e)!.name, to: `/players/${e}` } : getClub(e) ? { label: getClub(e)!.name, to: `/clubs/${e}` } : null).filter(Boolean) as { label: string; to: string }[];
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={n.title} back="/news" />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className={kindTone(n.kind)}>{n.kind}</Badge>
        <span>{n.source}</span><span>·</span><span>{fmtDateTime(n.publishedAt)}</span>
        <span className="ml-auto">Credibility <span className="font-mono text-primary">{Math.round(n.credibility * 100)}%</span></span>
      </div>
      <Panel className="space-y-3 p-5 text-sm leading-relaxed">
        <p className="text-base">{n.summary}</p>
        <p className="text-muted-foreground">This is synthetic demo content for the Football OS world dataset. The original reporting lives at the source link below — no third-party copy is stored locally.</p>
        <div className="flex flex-wrap gap-1.5 pt-1">{n.topics.map((tp) => <Badge key={tp} variant="secondary" className="text-xs">#{tp}</Badge>)}</div>
      </Panel>

      {impact && (
        <Panel className="p-4">
          <div className="flex items-center justify-between gap-2">
            <SectionTitle title="Impact read" hint="Grounded in the world dataset — no new facts invented" />
            <span className={cn("shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-widest", CERTAINTY_TONE[impact.certainty])}>
              {impact.certainty} · {impact.confidence}%
            </span>
          </div>
          {impact.context.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {impact.context.map((c, i) => <li key={i} className="flex gap-1.5"><span className="text-primary">›</span><span>{c}</span></li>)}
            </ul>
          )}
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {impact.watch.map((w, i) => <li key={i} className="flex gap-1.5"><span>•</span><span>{w}</span></li>)}
          </ul>
          <details className="mt-2 rounded-md border bg-card/30 p-2 text-xs">
            <summary className="cursor-pointer uppercase tracking-widest text-muted-foreground">Evidence &amp; sources</summary>
            <ul className="mt-1.5 list-disc pl-5 text-muted-foreground">
              {impact.evidence.map((ev, i) => <li key={i}>{ev}</li>)}
            </ul>
            <p className="mt-1.5">Source link below reflects the original reporting; standings positions come from the live world dataset.</p>
          </details>
        </Panel>
      )}

      {entities.length > 0 && (
        <Panel className="p-4">
          <SectionTitle title="Related entities" />
          <div className="mt-2 flex flex-wrap gap-2">{entities.map((e) => <Link key={e.to} to={e.to} className="rounded-md border px-2.5 py-1 text-sm hover:border-primary/50">{e.label}</Link>)}</div>
        </Panel>
      )}
      <a href={n.url} target="_blank" rel="noopener noreferrer"><Button variant="outline" className="w-full">Read at source ↗</Button></a>
    </div>
  );
}

// ---------- Competition detail (standings) ----------
function CompetitionDetail({ id }: { id: string }) {
  const comp = getCompetition(id);
  if (!comp) return <EmptyState title="Competition not found" />;
  const table = footballProvider.standings(id);
  const clubs = clubIdsByCompetition(id).map((cid) => getClub(cid)).filter(Boolean) as Club[];
  const recent = matchesByStatus("FINISHED").filter((m) => m.competitionId === id).slice(0, 8);
  const upcoming = matchesByStatus("SCHEDULED").filter((m) => m.competitionId === id).slice(0, 8);
  return (
    <div className="space-y-6">
      <PageHeader title={comp.name} hint={`${comp.nation} · Tier ${comp.tier} · ${clubs.length} teams`} back="/competitions" />
      <div className="flex justify-end">
        <FavoriteButton kind="competition" id={id} activeText="My league" idleText="Set as my league" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel className="p-1">
            <SectionTitle title="Standings" />
            <StandingsTable table={table} />
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel className="p-4">
            <SectionTitle title="Clubs" />
            <div className="mt-1 divide-y">{clubs.slice(0, 12).map((c) => <ClubRow key={c.id} c={c} />)}</div>
          </Panel>
        </div>
      </div>
      {upcoming.length > 0 && <><SectionTitle title="Next fixtures" /><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map((m) => <MatchRow key={m.id} m={m} />)}</div></>}
      {recent.length > 0 && <><SectionTitle title="Recent results" /><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{recent.map((m) => <MatchRow key={m.id} m={m} />)}</div></>}
    </div>
  );
}

function StandingsTable({ table }: { table: Standing[] }) {
  if (!table.length) return <div className="p-4"><EmptyState title="No standings yet" /></div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-2 py-2">#</th><th className="px-2 py-2">Club</th>
            <th className="px-2 py-2 text-right">P</th><th className="px-2 py-2 text-right">W</th>
            <th className="px-2 py-2 text-right">D</th><th className="px-2 py-2 text-right">L</th>
            <th className="hidden px-2 py-2 text-right sm:table-cell">GF</th>
            <th className="hidden px-2 py-2 text-right sm:table-cell">GA</th>
            <th className="px-2 py-2 text-right">GD</th>
            <th className="px-2 py-2 text-right font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {table.map((s, i) => {
            const c = getClub(s.clubId);
            return (
              <tr key={s.clubId} className="border-t hover:bg-card/40">
                <td className={cn("px-2 py-2 font-mono text-xs", i < 4 && "text-primary")}>{i + 1}</td>
                <td className="px-2 py-2"><Link to={`/clubs/${s.clubId}`} className="flex items-center gap-2 hover:text-primary"><Crest colors={c?.colors} short={c?.short} size={22} /><span className="truncate">{c?.name}</span></Link></td>
                <td className="px-2 py-2 text-right font-mono text-xs">{s.played}</td>
                <td className="px-2 py-2 text-right font-mono text-xs">{s.won}</td>
                <td className="px-2 py-2 text-right font-mono text-xs">{s.drawn}</td>
                <td className="px-2 py-2 text-right font-mono text-xs">{s.lost}</td>
                <td className="hidden px-2 py-2 text-right font-mono text-xs sm:table-cell">{s.gf}</td>
                <td className="hidden px-2 py-2 text-right font-mono text-xs sm:table-cell">{s.ga}</td>
                <td className="px-2 py-2 text-right font-mono text-xs">{s.gf - s.ga}</td>
                <td className="px-2 py-2 text-right font-mono font-semibold text-primary">{s.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Search ----------
function SearchPage() {
  const { query, navigate, path } = useRouter();
  const [term, setTerm] = useState(query.get("q") ?? "");
  const results = useMemo(() => globalSearch(term, 60), [term]);
  const grouped = useMemo(() => {
    const g: Record<string, typeof results> = {};
    for (const r of results) (g[r.type] ??= []).push(r);
    return g;
  }, [results]);
  return (
    <div className="space-y-5">
      <PageHeader title="Search the football world" hint="Clubs, players, competitions, matches and news." back="/football" />
      <Input
        autoFocus
        value={term}
        onChange={(e) => { setTerm(e.target.value); navigate(`${path}?q=${encodeURIComponent(e.target.value)}`, { replace: true }); }}
        placeholder="Try 'Mbappé', 'Premier', 'Arsenal', 'transfer'…"
        className="text-base"
      />
      {!term.trim() && <EmptyState title="Type to search" hint="Results are grouped by entity type." />}
      {term.trim() && results.length === 0 && <EmptyState title={`No matches for "${term}"`} />}
      {(["player", "club", "competition", "match", "news"] as const).map((type) => {
        const items = grouped[type];
        if (!items?.length) return null;
        return (
          <div key={type} className="space-y-2">
            <SectionTitle title={type[0].toUpperCase() + type.slice(1) + "s"} hint={`${items.length}`} />
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((r) => (
                <EntityLink key={r.type + r.id} to={r.to}>
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{r.subtitle}</div>
                </EntityLink>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { fmtDate, fmtDateTime, formatValue, PageHeader, EntityLink, PlayerRow, ClubRow, MatchRow };
