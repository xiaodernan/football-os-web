import { useMemo, useState, type ReactNode } from "react";
import { Link, useRouter } from "@/lib/router";
import { useOs } from "@/store/useFootballOS";
import {
  footballProvider,
  getClub,
  getPlayer,
  getCompetition,
  getMatch,
  playersByClub,
  recentMatchesForClub,
  upcomingMatchesForClub,
  trendingPlayers,
  comparePlayers,
  formatValue,
  DEMO_MODE,
} from "@/data/footballService";
import { simulateMatch, type SimResult, type TeamInput } from "@/domain/matchEngine";
import { modelPlayerProfile } from "@/domain/scouting";
import { careerArc } from "@/domain/careerArc";
import { archetypeLabel } from "@/domain/playerDna";
import { teamMetrics, expectedGoals } from "@/domain/analytics";
import { askFootballAI, type AiAnswer } from "@/data/ai";
import type { MatchEvent, PlayerRef } from "@/domain/types";
import { Panel, SectionTitle, StatTile, Crest, PositionTag, EmptyState, DemoBadge, AttributeBar } from "@/ui/primitives";
import { AttributeRadar } from "@/ui/charts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function EntityHeader({ title, subtitle, back, crest }: { title: string; subtitle?: ReactNode; back?: string; crest?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {crest}
      <div className="min-w-0 flex-1">
        {back && <Link to={back} className="text-xs text-muted-foreground hover:text-foreground">← Back</Link>}
        <div className="flex items-center gap-2">
          <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
          {DEMO_MODE && <DemoBadge />}
        </div>
        {subtitle && <div className="mt-0.5 text-sm text-muted-foreground">{subtitle}</div>}
      </div>
    </div>
  );
}

function WatchButton({ playerId }: { playerId: string }) {
  const { state, toggleWatch } = useOs();
  const watching = state.watchlist.includes(playerId);
  return (
    <Button size="sm" variant={watching ? "default" : "outline"} onClick={() => toggleWatch(playerId)}>
      {watching ? "★ Watching" : "☆ Watch"}
    </Button>
  );
}

// ---------------- Player detail ----------------
export function PlayerDetail({ id }: { id: string }) {
  const p = getPlayer(id);
  const { navigate } = useRouter();
  const top = useMemo(() => trendingPlayers(20), []);
  const [againstId, setAgainstId] = useState(top.find((x) => x.id !== id)?.id ?? "");
  if (!p) return <EmptyState title="Player not found" hint="This athlete is not in the world dataset." />;
  const club = getClub(p.clubId);
  const comp = getClub(p.clubId) ? getCompetition(club!.competitionId) : undefined;
  const [a, b] = comparePlayers(p.id, againstId);
  const profile = modelPlayerProfile(p);
  const arc = careerArc(p);

  return (
    <div className="space-y-6">
      <EntityHeader
        title={p.name}
        back="/players"
        crest={<div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-2xl" style={{ boxShadow: `inset 0 0 0 2px ${club?.colors[0] ?? "#333"}` }}>{p.name[0]}</div>}
        subtitle={<span>{p.position} · <Link to={`/clubs/${club?.id}`} className="hover:text-primary">{club?.name}</Link> · {p.nation} · {p.age}y · {p.foot}F</span>}
      />

      <div className="flex gap-2">
        <WatchButton playerId={p.id} />
        <Button size="sm" variant="outline" onClick={() => navigate(`/search?q=${encodeURIComponent(p.name)}`)}>Related coverage</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Overall" value={p.overall} tone="up" />
        <StatTile label="Potential" value={p.potential} sub={p.potential > p.overall ? `+${p.potential - p.overall}` : "peak"} />
        <StatTile label="Market value" value={formatValue(p.value)} />
        <StatTile label="Archetype" value={<span className="text-base">{archetypeLabel(p.archetype)}</span>} sub={comp?.name} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <SectionTitle title="Scouting profile" hint="Fields come straight from the world dataset" />
          <dl className="mt-2 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Position group</dt><dd className="text-right font-mono">{p.positionGroup}</dd>
            <dt className="text-muted-foreground">Age</dt><dd className="text-right font-mono">{p.age}</dd>
            <dt className="text-muted-foreground">Nation</dt><dd className="text-right">{p.nation}</dd>
            <dt className="text-muted-foreground">Preferred foot</dt><dd className="text-right font-mono">{p.foot}</dd>
            <dt className="text-muted-foreground">Club</dt><dd className="text-right"><Link to={`/clubs/${club?.id}`} className="hover:text-primary">{club?.name}</Link></dd>
            <dt className="text-muted-foreground">Overall / Potential</dt><dd className="text-right font-mono">{p.overall} / {p.potential}</dd>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            {profile.measured
              ? "The radar and the values below are the per-player attribute vector this dataset actually stores — the same numbers his overall rating is computed from."
              : "Detailed attribute vectors are not provided for this player, so the values below are a labelled model estimate from his overall and position — no numbers are invented beyond that model."}
          </p>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title="Head-to-head comparison" />
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>vs</span>
            <select value={againstId} onChange={(e) => setAgainstId(e.target.value)} className="flex-1 rounded-md border bg-card px-2 py-1.5 text-sm text-foreground">
              {top.filter((x) => x.id !== p.id).map((x) => <option key={x.id} value={x.id}>{x.name} ({x.overall})</option>)}
            </select>
          </div>
          {a && b && <CompareBars a={a} b={b} />}
        </Panel>
      </div>

      <Panel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle title={profile.measured ? "Attribute profile" : "Modelled attribute profile"} hint={profile.measured ? "Dataset values" : "Estimate · not measured data"} />
          <Badge variant="outline" className={profile.measured ? "border-success/40 text-success" : "border-warning/40 text-warning"}>
            {profile.measured ? "dataset" : "model"} · {profile.confidence}%
          </Badge>
        </div>
        {p.attributes && (
          <div className="mt-2 grid gap-4 lg:grid-cols-[280px_1fr]">
            <AttributeRadar attrs={p.attributes} height={230} />
            <div className="grid gap-x-6 gap-y-2 self-center sm:grid-cols-2">
              {profile.attributes.map((at) => (
                <AttributeBar key={at.key} label={at.label} value={at.value} max={99} />
              ))}
            </div>
          </div>
        )}
        {!p.attributes && (
          <div className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {profile.attributes.map((at) => (
              <AttributeBar key={at.key} label={at.label} value={at.value} max={99} />
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">{profile.note} Sources: {profile.sources.join(" · ")}</p>
      </Panel>

      <Panel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle title="Career arc" hint="Modelled from age, potential and position" />
          <Badge variant="outline" className={cn(arc.trajectory === "rising" ? "border-success/40 text-success" : arc.trajectory === "declining" ? "border-warning/40 text-warning" : "text-muted-foreground")}>
            {arc.trajectory}
          </Badge>
        </div>

        <div className="mt-3 flex items-end gap-[3px]" title="Modelled overall by age">
          {arc.points.map((pt) => (
            <div key={pt.age} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn("w-full rounded-t", pt.phase === "decline" ? "bg-warning/60" : pt.overall > arc.current ? "bg-success/70" : "bg-primary/70")}
                style={{ height: `${Math.max(4, ((pt.overall - 35) / 64) * 90)}px` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{arc.age}</span>
          <span>peak {arc.projectedPeak} at {arc.points.reduce((b, p) => (p.overall > b.overall ? p : b), arc.points[0]).age}</span>
          <span>{arc.points[arc.points.length - 1].age}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
          <Fact label="Position peak" value={arc.peakAge} />
          <Fact label="Years to peak" value={arc.yearsToPeak} />
          <Fact label="Decline from" value={arc.declineFromAge} />
          <Fact label="Prime years left" value={arc.remainingPrimeYears} />
        </div>

        <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
          {arc.evidence.map((e, i) => <li key={i}>› {e}</li>)}
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Confidence {arc.confidence}% · a demo model over dataset fields, not a forecast about a real person · Sources: {arc.sources.join(" · ")}
        </p>
      </Panel>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-card/30 px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

function CompareBars({ a, b }: { a: PlayerRef; b: PlayerRef }) {  const rows: { label: string; av: number; bv: number; max: number }[] = [
    { label: "Overall", av: a.overall, bv: b.overall, max: 99 },
    { label: "Potential", av: a.potential, bv: b.potential, max: 99 },
    { label: "Age", av: a.age, bv: b.age, max: 40 },
    { label: "Value (M€)", av: Math.round(a.value / 1e6), bv: Math.round(b.value / 1e6), max: Math.max(Math.round(a.value / 1e6), Math.round(b.value / 1e6), 1) },
  ];
  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="truncate">{a.name}</span><span className="truncate text-right">{b.name}</span>
      </div>
      {rows.map((r) => {
        const aWin = r.av >= r.bv;
        const bWin = r.bv >= r.av;
        return (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
              <span className="font-mono">{r.av}</span><span>{r.label}</span><span className="font-mono">{r.bv}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex flex-1 justify-end"><div className={cn("h-2 rounded-l", aWin ? "bg-primary" : "bg-muted")} style={{ width: `${(r.av / r.max) * 100}%` }} /></div>
              <div className="flex flex-1"><div className={cn("h-2 rounded-r", bWin ? "bg-primary" : "bg-muted")} style={{ width: `${(r.bv / r.max) * 100}%` }} /></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Club detail ----------------
export function ClubDetail({ id }: { id: string }) {
  const c = getClub(id);
  if (!c) return <EmptyState title="Club not found" />;
  const comp = getCompetition(c.competitionId);
  const squad = playersByClub(id).sort((a, b) => b.overall - a.overall);
  const recent = recentMatchesForClub(id, 5);
  const upcoming = upcomingMatchesForClub(id, 5);
  const attack = avgBy(squad, ["ST", "W", "AM"]);
  const midfield = avgBy(squad, ["CM", "DM"]);
  const defense = avgBy(squad, ["CB", "FB", "GK"]);
  const metrics = useMemo(() => teamMetrics(c.competitionId, footballProvider.matches(), footballProvider.clubs()), [c.competitionId]);
  const mine = metrics.find((m) => m.clubId === id) ?? null;
  const next = upcoming[0];
  const preview = useMemo(() => {
    if (!mine || !next || next.status !== "SCHEDULED") return null;
    const oppId = next.homeClubId === id ? next.awayClubId : next.homeClubId;
    const opp = metrics.find((m) => m.clubId === oppId);
    if (!opp) return null;
    const homeIsUs = next.homeClubId === id;
    const xg = expectedGoals(homeIsUs ? mine : opp, homeIsUs ? opp : mine);
    return { oppName: getClub(oppId)?.name ?? oppId, us: homeIsUs ? xg.home : xg.away, them: homeIsUs ? xg.away : xg.home };
  }, [mine, next, metrics, id]);
  return (
    <div className="space-y-6">
      <EntityHeader
        title={c.name}
        back="/clubs"
        crest={<Crest colors={c.colors} short={c.short} size={64} />}
        subtitle={<span>{c.nation} · <Link to={`/competitions/${c.competitionId}`} className="hover:text-primary">{comp?.name}</Link> · {c.stadium}</span>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="Overall" value={c.overall} />
        <StatTile label="Attack" value={attack || "—"} />
        <StatTile label="Midfield" value={midfield || "—"} />
        <StatTile label="Defense" value={defense || "—"} />
        <StatTile label="Squad size" value={squad.length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-1 lg:col-span-2">
          <SectionTitle title="Squad" action={<Link to={`/players?club=${c.id}`} className="text-xs text-primary">Browse all →</Link>} />
          <div className="divide-y">
            {squad.map((p) => (
              <Link key={p.id} to={`/players/${p.id}`} className="flex items-center gap-3 px-2 py-1.5 hover:bg-card/50">
                <span className="w-6 text-right font-mono text-xs text-muted-foreground">{p.age}</span>
                <span className="flex-1 truncate text-sm">{p.name}</span>
                <PositionTag position={p.position} />
                <span className="font-mono text-xs text-muted-foreground">{formatValue(p.value)}</span>
                <span className="w-8 text-right font-mono text-sm text-primary">{p.overall}</span>
              </Link>
            ))}
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel className="p-4">
            <SectionTitle title="Season analytics" hint={mine ? `${mine.played} finished matches · modelled vs league average` : "No finished matches in window"} />
            {mine ? (
              <div className="mt-2 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Form (last 5)</span>
                  <span className="flex gap-1">
                    {mine.form.map((f, i) => (
                      <span key={i} className={cn("grid h-5 w-5 place-items-center rounded text-[10px] font-bold", f === "W" ? "bg-success/20 text-success" : f === "D" ? "bg-muted text-muted-foreground" : "bg-destructive/20 text-destructive")}>{f}</span>
                    ))}
                    {!mine.form.length && <span className="text-xs text-muted-foreground">—</span>}
                  </span>
                </div>
                <Ratio label="Attack" value={mine.attack} goodHigh />
                <Ratio label="Defence (lower concedes)" value={mine.defence} />
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">Pts / game</div><div className="font-mono text-sm">{mine.ppg.toFixed(2)}</div></div>
                  <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">Clean sheets</div><div className="font-mono text-sm">{mine.cleanSheets}</div></div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Split label="Home" s={mine.home} />
                  <Split label="Away" s={mine.away} />
                </div>
                {preview && (
                  <div className="rounded-md border bg-card/40 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Next up vs {preview.oppName} · modelled xG </span>
                    <span className="font-mono">{preview.us.toFixed(2)}–{preview.them.toFixed(2)}</span>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">Ratings are relative to league average (1.00): attack above 1 scores more, defence below 1 concedes less. Computed from the dataset's finished matches; the next-fixture xG is a model, not a prediction of real events.</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No finished matches for this club in the current dataset window — nothing to compute yet.</p>
            )}
          </Panel>
          <MiniMatches title="Last results" matches={recent} />
          <MiniMatches title="Next up" matches={upcoming} />
        </div>
      </div>
    </div>
  );
}

function avgBy(squad: PlayerRef[], groups: string[]): number {
  const pick = squad.filter((p) => groups.includes(p.positionGroup));
  if (!pick.length) return 0;
  return Math.round(pick.reduce((s, p) => s + p.overall, 0) / pick.length);
}

function Ratio({ label, value, goodHigh = false }: { label: string; value: number; goodHigh?: boolean }) {
  const good = goodHigh ? value >= 1 : value <= 1;
  const pct = Math.max(4, Math.min(100, (value / 2) * 100));
  return (
    <div>
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-mono", good ? "text-success" : "text-destructive")}>{value.toFixed(2)}</span>
      </div>
      <div className="relative mt-0.5 h-1.5 overflow-hidden rounded bg-muted">
        <div className={cn("h-full", good ? "bg-success" : "bg-destructive")} style={{ width: `${pct}%` }} />
        <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
      </div>
    </div>
  );
}

function Split({ label, s }: { label: string; s: { played: number; won: number; drawn: number; lost: number; gf: number; ga: number } }) {
  return (
    <div className="rounded-md border bg-card/30 px-2 py-1.5">
      <div className="text-muted-foreground">{label} · {s.played} played</div>
      <div className="font-mono text-sm">{s.won}-{s.drawn}-{s.lost} <span className="text-muted-foreground">({s.gf}:{s.ga})</span></div>
    </div>
  );
}

function MiniMatches({ title, matches }: { title: string; matches: ReturnType<typeof getMatch>[] }) {
  const list = matches.filter(Boolean);
  return (
    <Panel className="p-4">
      <SectionTitle title={title} />
      {list.length ? (
        <div className="mt-2 space-y-1.5">
          {list.map((m) => {
            const mm = m!;
            const h = getClub(mm.homeClubId);
            const a = getClub(mm.awayClubId);
            return (
              <Link key={mm.id} to={`/matches/${mm.id}`} className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm hover:border-primary/40">
                <span className="truncate">{h?.short} v {a?.short}</span>
                <span className={cn("font-mono text-xs", mm.status === "LIVE" ? "text-destructive" : "text-muted-foreground")}>
                  {mm.status === "SCHEDULED" ? fmtDateTime(mm.kickoff).replace(",", "") : `${mm.homeGoals}–${mm.awayGoals}`}
                </span>
              </Link>
            );
          })}
        </div>
      ) : <p className="mt-2 text-xs text-muted-foreground">None in the current window.</p>}
    </Panel>
  );
}

// ---------------- Match detail + engine ----------------
function clubTeamInput(clubId: string): TeamInput {
  const club = getClub(clubId)!;
  const squad = playersByClub(clubId);
  return {
    name: club.name,
    overall: club.overall,
    attack: avgBy(squad, ["ST", "W", "AM"]) || club.overall,
    midfield: avgBy(squad, ["CM", "DM"]) || club.overall,
    defense: avgBy(squad, ["CB", "FB", "GK"]) || club.overall,
    possessionBias: 0.5,
    press: 0.5,
    tempo: 0.5,
    fatigue: 0,
    morale: 0,
    form: 0,
  };
}

export function MatchDetail({ id }: { id: string }) {
  const m = getMatch(id);
  const [sim, setSim] = useState<SimResult | null>(null);
  const [ai, setAi] = useState<AiAnswer | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  if (!m) return <EmptyState title="Match not found" />;
  const home = getClub(m.homeClubId)!;
  const away = getClub(m.awayClubId)!;
  const comp = getCompetition(m.competitionId);
  const events: MatchEvent[] = (m.status === "FINISHED" && m.events?.length) ? m.events : sim?.timeline ?? [];

  const runSim = () => {
    const r = simulateMatch({ seed: `${m.id}:${m.round}`, home: clubTeamInput(home.id), away: clubTeamInput(away.id) });
    setSim(r);
  };
  const ask = async () => {
    if (!q.trim()) return;
    setBusy(true);
    try {
      const facts = [
        `${home.name} vs ${away.name} (${comp?.name})`,
        sim ? `Model projection: ${sim.homeGoals}–${sim.awayGoals}, xG ${sim.stats.home.xg.toFixed(2)}–${sim.stats.away.xg.toFixed(2)}` : "No simulation run yet",
        `${m.status === "SCHEDULED" ? "Kickoff " + fmtDateTime(m.kickoff) : `Scoreline ${m.homeGoals}–${m.awayGoals}`}`,
        `Possession bias home ${Math.round((sim?.stats.home.possession ?? 50))}%`,
      ];
      const ans = await askFootballAI(q, { label: `${home.short} v ${away.short}`, facts });
      setAi(ans);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <EntityHeader title={`${home.name} v ${away.name}`} back="/matches" subtitle={<span>{comp?.name} · Round {m.round} · {m.status === "SCHEDULED" ? fmtDateTime(m.kickoff) : m.status}</span>} />

      <Panel className="p-5">
        <div className="grid grid-cols-3 items-center gap-2">
          <Link to={`/clubs/${home.id}`} className="flex flex-col items-center gap-2 hover:text-primary"><Crest colors={home.colors} short={home.short} size={56} /><span className="text-center text-sm font-medium">{home.name}</span></Link>
          <div className="text-center">
            <div className="font-mono text-4xl font-bold">
              {m.status === "SCHEDULED" ? (sim ? `${sim.homeGoals}–${sim.awayGoals}` : "– : –") : `${m.homeGoals}–${m.awayGoals}`}
            </div>
            {m.status === "SCHEDULED" && <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">{sim ? "Engine projection" : "Not played"}</div>}
          </div>
          <Link to={`/clubs/${away.id}`} className="flex flex-col items-center gap-2 hover:text-primary"><Crest colors={away.colors} short={away.short} size={56} /><span className="text-center text-sm font-medium">{away.name}</span></Link>
        </div>
        {m.status !== "FINISHED" && (
          <div className="mt-4 flex justify-center">
            <Button onClick={runSim} variant={sim ? "outline" : "default"}>{sim ? "Re-run Match Engine" : "▶ Simulate with Match Engine"}</Button>
          </div>
        )}
        {sim && <div className="mt-2 text-center text-[11px] text-muted-foreground">Deterministic simulation from squad strength · seed {sim.seed.slice(0, 8)} · demo engine</div>}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <SectionTitle title={sim ? "Projected stats" : "Match engine output"} />
          {sim ? <StatCompare sim={sim} home={home.name} away={away.name} /> : (
            <EmptyState title="No simulation yet" hint="Run the match engine to see possession, shots, xG and ratings." icon="▶" />
          )}
        </Panel>
        <Panel className="p-4">
          <SectionTitle title={m.status === "FINISHED" ? "Timeline" : sim ? "Projected timeline" : "Events"} />
          {events.length ? (
            <ul className="mt-1 space-y-1.5">
              {events.map((e, i) => <EventRow key={i} e={e} home={home.name} away={away.name} />)}
            </ul>
          ) : <EmptyState title="No events recorded" />}
        </Panel>
      </div>

      <Panel className="p-4">
        <SectionTitle title="Ask Football AI" hint="Answers cite evidence + confidence — Demo provider, no API key" />
        <div className="mt-2 flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Who was decisive? Why did the mid场 battle matter?" className="flex-1" />
          <Button onClick={ask} disabled={busy}>{busy ? "Thinking…" : "Ask"}</Button>
        </div>
        {ai && (
          <div className="mt-3 space-y-2 rounded-lg border bg-card/40 p-3 text-sm">
            <p>{ai.text}</p>
            <div><div className="text-[11px] uppercase tracking-widest text-muted-foreground">Evidence</div><ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{ai.evidence.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            <div className="flex items-center gap-3 text-xs">
              <span>Confidence <span className="font-mono text-primary">{ai.confidence}%</span></span>
              <span className="text-muted-foreground">Sources: {ai.sources.join(" · ")}</span>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

function EventRow({ e, home, away }: { e: MatchEvent; home: string; away: string }) {
  const glyph: Record<string, string> = { GOAL: "⚽", YELLOW: "🟨", RED: "🟥", SUB: "🔁", SHOT: "🎯", SAVE: "🧤", VAR: "📺" };
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="w-9 text-right font-mono text-xs text-muted-foreground">{e.minute}'</span>
      <span>{glyph[e.type] ?? "•"}</span>
      <span className="flex-1 truncate">{e.player}{e.detail ? <span className="text-muted-foreground"> — {e.detail}</span> : null}</span>
      <span className="text-[11px] text-muted-foreground">{e.side === "home" ? home : away}</span>
    </li>
  );
}

function StatCompare({ sim, home, away }: { sim: SimResult; home: string; away: string }) {
  const rows: { label: string; h: number; a: number; fmt?: (n: number) => string }[] = [
    { label: "Possession", h: sim.stats.home.possession, a: sim.stats.away.possession, fmt: (n) => `${Math.round(n)}%` },
    { label: "Shots", h: sim.stats.home.shots, a: sim.stats.away.shots },
    { label: "On target", h: sim.stats.home.onTarget, a: sim.stats.away.onTarget },
    { label: "Expected goals", h: sim.stats.home.xg, a: sim.stats.away.xg, fmt: (n) => n.toFixed(2) },
    { label: "Passes", h: sim.stats.home.passes, a: sim.stats.away.passes },
    { label: "Corners", h: sim.stats.home.corners, a: sim.stats.away.corners },
    { label: "Tackles", h: sim.stats.home.tackles, a: sim.stats.away.tackles },
    { label: "Fouls", h: sim.stats.home.fouls, a: sim.stats.away.fouls },
  ];
  return (
    <div className="mt-2 space-y-2.5">
      <div className="flex justify-between text-xs font-medium"><span className="truncate">{home}</span><span className="truncate text-right">{away}</span></div>
      {rows.map((r) => {
        const total = r.h + r.a || 1;
        const fmt = r.fmt ?? ((n: number) => String(n));
        return (
          <div key={r.label}>
            <div className="flex justify-between text-[11px]"><span className="font-mono">{fmt(r.h)}</span><span className="text-muted-foreground">{r.label}</span><span className="font-mono">{fmt(r.a)}</span></div>
            <div className="mt-0.5 flex h-1.5 overflow-hidden rounded bg-muted">
              <div className="bg-primary" style={{ width: `${(r.h / total) * 100}%` }} />
              <div className="flex-1 bg-muted-foreground/40" />
            </div>
          </div>
        );
      })}
      <details className="mt-1 rounded-md border bg-card/30 p-2 text-xs">
        <summary className="cursor-pointer uppercase tracking-widest text-muted-foreground">Key player ratings</summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <RatingsCol title={home} ratings={sim.stats.home.ratings} />
          <RatingsCol title={away} ratings={sim.stats.away.ratings} />
        </div>
      </details>
    </div>
  );
}

function RatingsCol({ title, ratings }: { title: string; ratings: { player: string; rating: number }[] }) {
  return (
    <div>
      <div className="truncate text-[11px] text-muted-foreground">{title}</div>
      {ratings.slice(0, 5).map((r, i) => (
        <div key={i} className="mt-1 flex items-center gap-2">
          <span className="w-16 truncate">{r.player}</span>
          <div className="flex-1"><AttributeBar label="" value={r.rating} max={10} /></div>
          <span className="w-7 text-right font-mono">{r.rating.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}
