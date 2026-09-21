import { useMemo, useState } from "react";
import { footballProvider, getClub, getCompetition, playersByClub, clubIdsByCompetition } from "@/data/footballService";
import { simulateMatch, type TeamInput, type SimResult } from "@/domain/matchEngine";
import { matchProbability, type MatchProbability } from "@/domain/matchProbability";
import { Panel, SectionTitle, Crest, EmptyState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Tactics {
  mentality: number; // -2 park the bus .. +2 all-out attack
  tempo: number; // 0..1
  press: number; // 0..1
  fatigue: number; // 0..1
}

const DEFAULT_TACTICS: Tactics = { mentality: 0, tempo: 0.5, press: 0.5, fatigue: 0 };

function baseInput(clubId: string, tac: Tactics): TeamInput {
  const c = getClub(clubId)!;
  const squad = playersByClub(clubId);
  const avg = (groups: string[]) => {
    const g = squad.filter((p) => groups.includes(p.positionGroup));
    return g.length ? g.reduce((s, p) => s + p.overall, 0) / g.length : c.overall;
  };
  const attack = avg(["ST", "W", "AM"]);
  const midfield = avg(["CM", "DM"]);
  const defense = avg(["CB", "FB", "GK"]);
  // Mentality shifts the balance of attack vs defensive contribution and shape.
  const m = tac.mentality;
  return {
    name: c.name,
    overall: c.overall,
    attack: attack + m * 3 - tac.fatigue * 4,
    midfield: midfield + m * 0.5 - tac.fatigue * 3,
    defense: defense - m * 2.5 + (tac.press * 3 - 1.5) - tac.fatigue * 3,
    possessionBias: 0.5 + midfield / 400,
    press: tac.press,
    tempo: tac.tempo,
    fatigue: tac.fatigue,
    morale: m * 0.2,
    form: 0,
  };
}

export function SimulationLab() {
  const clubs = useMemo(() => [...footballProvider.clubs()].sort((a, b) => b.overall - a.overall), []);
  const [homeId, setHomeId] = useState(clubs.find((c) => c.name.includes("City"))?.id ?? clubs[0].id);
  const [awayId, setAwayId] = useState(clubs.find((c) => c.name.includes("Madrid"))?.id ?? clubs[1].id);
  const [homeTac, setHomeTac] = useState<Tactics>(DEFAULT_TACTICS);
  const [awayTac, setAwayTac] = useState<Tactics>({ ...DEFAULT_TACTICS, mentality: 1 });
  const [nonce, setNonce] = useState(1);
  const [result, setResult] = useState<SimResult | null>(null);
  const [prob, setProb] = useState<MatchProbability | null>(null);
  const [probBusy, setProbBusy] = useState(false);
  const [season, setSeason] = useState<{ compId: string; table: SeasonRow[] } | null>(null);

  const home = getClub(homeId)!;
  const away = getClub(awayId)!;

  const runMatch = () => {
    if (homeId === awayId) return;
    setResult(simulateMatch({ seed: `${homeId}|${awayId}|v${nonce}`, home: baseInput(homeId, homeTac), away: baseInput(awayId, awayTac) }));
  };
  const reroll = () => { setNonce((n) => n + 1); };

  const runProb = () => {
    if (homeId === awayId) return;
    setProbBusy(true);
    // Yield one frame so the busy state paints before the synchronous model run.
    setTimeout(() => {
      setProb(
        matchProbability({
          seedBase: `prob:${homeId}|${awayId}|${homeTac.mentality},${homeTac.tempo},${homeTac.press},${homeTac.fatigue}|${awayTac.mentality},${awayTac.tempo},${awayTac.press},${awayTac.fatigue}`,
          home: baseInput(homeId, homeTac),
          away: baseInput(awayId, awayTac),
          runs: 250,
        }),
      );
      setProbBusy(false);
    }, 30);
  };

  const runSeason = (compId: string) => setSeason({ compId, table: simulateSeason(compId, nonce) });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">▷</div>
        <div>
          <div className="flex items-center gap-2"><h1 className="text-xl font-bold">Simulation Lab</h1>{<DemoBadge />}</div>
          <p className="text-xs text-muted-foreground">Tune tactics and run the deterministic Match Engine — the same model behind live projections.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TeamPanel title="Home" club={home.id} colors={home.colors} short={home.short} value={homeTac} onChange={setHomeTac} clubs={clubs} selected={homeId} onSelect={setHomeId} />
        <TeamPanel title="Away" club={away.id} colors={away.colors} short={away.short} value={awayTac} onChange={setAwayTac} clubs={clubs} selected={awayId} onSelect={setAwayId} />
      </div>

      <Panel className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={runMatch} disabled={homeId === awayId}>{result ? "Re-run fixture" : "▶ Run match"}</Button>
          <Button variant="outline" onClick={reroll} disabled={!result}>New variation (same tactics)</Button>
          <Button variant="secondary" onClick={runProb} disabled={homeId === awayId || probBusy}>{probBusy ? "Running 250 sims…" : "Run probability model (250)"}</Button>
          <span className="text-xs text-muted-foreground">Seed {homeId}·{awayId}·v{nonce}</span>
          {homeId === awayId && <Badge variant="outline" className="text-warning">Pick two different clubs</Badge>}
        </div>
        {result ? <ResultView result={result} home={home.name} away={away.name} /> : (
          <div className="mt-3"><EmptyState title="No simulation yet" hint="Set the tactics and run a fixture." icon="▷" /></div>
        )}
      </Panel>

      {prob && <ProbabilityPanel prob={prob} />}

      <Panel className="p-4">
        <SectionTitle title="Season simulation" hint="Full round-robin through the engine" />
        <div className="mt-2 flex flex-wrap gap-2">
          {footballProvider.competitions().slice(0, 8).map((c) => (
            <Button key={c.id} size="sm" variant={season?.compId === c.id ? "default" : "outline"} onClick={() => runSeason(c.id)}>{c.name}</Button>
          ))}
        </div>
        {season && <SeasonTable rows={season.table} name={getCompetition(season.compId)?.name ?? ""} />}
      </Panel>
    </div>
  );
}

function TeamPanel({ title, club, colors, short, value, onChange, clubs, selected, onSelect }: {
  title: string; club: string; colors: [string, string]; short: string; value: Tactics; onChange: (t: Tactics) => void;
  clubs: ReturnType<typeof footballProvider.clubs>; selected: string; onSelect: (id: string) => void;
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-center gap-3">
        <Crest colors={colors} short={short} size={40} />
        <select value={selected} onChange={(e) => onSelect(e.target.value)} className="flex-1 rounded-md border bg-card px-2 py-1.5 text-sm">
          {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Badge variant="outline" className="font-mono">{title}</Badge>
      </div>
      <div className="mt-3 space-y-3">
        <Slider label="Mentality" min={-2} max={2} step={1} value={value.mentality} onChange={(v) => onChange({ ...value, mentality: v })} format={(v) => ["Park the bus", "Defensive", "Balanced", "Attacking", "All-out attack"][v + 2]} />
        <Slider label="Tempo" min={0} max={1} step={0.05} value={value.tempo} onChange={(v) => onChange({ ...value, tempo: v })} format={(v) => (v < 0.35 ? "Low" : v < 0.7 ? "Medium" : "High")} />
        <Slider label="Press" min={0} max={1} step={0.05} value={value.press} onChange={(v) => onChange({ ...value, press: v })} format={(v) => (v < 0.35 ? "Deep" : v < 0.7 ? "Medium" : "High press")} />
        <Slider label="Fatigue" min={0} max={1} step={0.1} value={value.fatigue} onChange={(v) => onChange({ ...value, fatigue: v })} format={(v) => `${Math.round(v * 100)}%`} />
      </div>
    </Panel>
  );
}

function Slider({ label, min, max, step, value, onChange, format }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-medium text-primary">{format(value)}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[var(--color-primary)]" />
    </label>
  );
}

function ResultView({ result, home, away }: { result: SimResult; home: string; away: string }) {
  const s = result.stats;
  const rows = [
    { label: "Possession", h: Math.round(s.home.possession), a: Math.round(s.away.possession), unit: "%" },
    { label: "Shots", h: s.home.shots, a: s.away.shots, unit: "" },
    { label: "On target", h: s.home.onTarget, a: s.away.onTarget, unit: "" },
    { label: "xG", h: +s.home.xg.toFixed(2), a: +s.away.xg.toFixed(2), unit: "" },
    { label: "Corners", h: s.home.corners, a: s.away.corners, unit: "" },
    { label: "Cards", h: s.home.yellows + s.home.reds * 2, a: s.away.yellows + s.away.reds * 2, unit: "" },
  ];
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-3 items-center">
        <div className="text-center"><div className="truncate text-sm font-medium">{home}</div></div>
        <div className="text-center font-mono text-4xl font-bold">{result.homeGoals}–{result.awayGoals}</div>
        <div className="text-center"><div className="truncate text-sm font-medium">{away}</div></div>
      </div>
      <div className="space-y-2">
        {rows.map((r) => {
          const total = r.h + r.a || 1;
          return (
            <div key={r.label}>
              <div className="flex justify-between text-[11px]"><span className="font-mono">{r.h}{r.unit}</span><span className="text-muted-foreground">{r.label}</span><span className="font-mono">{r.a}{r.unit}</span></div>
              <div className="mt-0.5 flex h-1.5 overflow-hidden rounded bg-muted"><div className="bg-primary" style={{ width: `${(r.h / total) * 100}%` }} /><div className="flex-1 bg-muted-foreground/40" /></div>
            </div>
          );
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><div className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">Key moments</div><ul className="max-h-40 space-y-1 overflow-y-auto text-xs">{result.timeline.filter((e) => e.type === "GOAL" || e.type === "RED" || e.type === "VAR").slice(0, 10).map((e, i) => <li key={i} className="flex gap-2"><span className="w-8 font-mono text-muted-foreground">{e.minute}'</span><span className="truncate">{e.type === "GOAL" ? "⚽" : e.type === "RED" ? "🟥" : "📺"} {e.player} <span className="text-muted-foreground">({e.side === "home" ? home : away})</span></span></li>)}</ul></div>
        <div><div className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">Match summary</div><ul className="space-y-1 text-xs text-muted-foreground">{result.summary.map((x, i) => <li key={i}>• {x}</li>)}</ul></div>
      </div>
    </div>
  );
}

function ProbabilityPanel({ prob }: { prob: MatchProbability }) {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const seg = (v: number) => `${v * 100}%`;
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <SectionTitle title="Outcome probability" hint={`${prob.runs} deterministic engine runs`} />
        <DemoBadge />
      </div>
      <div className="mt-3">
        <div className="flex h-3 w-full overflow-hidden rounded">
          <div className="bg-primary" style={{ width: seg(prob.homeWinPct) }} />
          <div className="bg-muted-foreground/40" style={{ width: seg(prob.drawPct) }} />
          <div className="bg-info" style={{ width: seg(prob.awayWinPct) }} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
          <div><div className="truncate text-xs text-muted-foreground">{prob.homeName} win</div><div className="font-mono font-semibold text-primary">{pct(prob.homeWinPct)}</div></div>
          <div><div className="text-xs text-muted-foreground">Draw</div><div className="font-mono font-semibold">{pct(prob.drawPct)}</div></div>
          <div><div className="truncate text-xs text-muted-foreground">{prob.awayName} win</div><div className="font-mono font-semibold text-info">{pct(prob.awayWinPct)}</div></div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
        <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">Avg goals</div><div className="font-mono text-sm">{prob.avgHomeGoals.toFixed(2)}–{prob.avgAwayGoals.toFixed(2)}</div></div>
        <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">Avg xG</div><div className="font-mono text-sm">{prob.avgHomeXg.toFixed(2)}–{prob.avgAwayXg.toFixed(2)}</div></div>
        <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">Both score</div><div className="font-mono text-sm">{pct(prob.bttsPct)}</div></div>
        <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">Over 2.5</div><div className="font-mono text-sm">{pct(prob.over25Pct)}</div></div>
      </div>
      <div className="mt-4">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Most likely scorelines</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {prob.mostLikely.map((s) => (
            <span key={s.score} className="rounded-md border bg-card/40 px-2 py-1 text-sm"><span className="font-mono font-semibold">{s.score}</span> <span className="text-xs text-muted-foreground">{pct(s.pct)}</span></span>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Modelled from the Match Engine over {prob.runs} seeded runs — a projection, not a played result. Fully reproducible for this setup.</p>
    </Panel>
  );
}

interface SeasonRow { clubId: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number }

function simulateSeason(compId: string, nonce: number): SeasonRow[] {
  const ids = clubIdsByCompetition(compId);
  const table = new Map<string, SeasonRow>();
  for (const id of ids) table.set(id, { clubId: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 });
  const apply = (a: SeasonRow, hg: number, ag: number, win: boolean, home: boolean) => {
    a.played++; a.gf += hg; a.ga += ag;
    if (win) { a.won++; a.points += 3; } else if (hg === ag) { a.drawn++; a.points += 1; } else a.lost++;
    void home;
  };
  for (let i = 0; i < ids.length; i++) {
    for (let j = 0; j < ids.length; j++) {
      if (i === j) continue;
      const home = ids[i], away = ids[j];
      const res = simulateMatch({ seed: `season:${compId}:${home}:${away}:${nonce}`, home: baseInput(home, DEFAULT_TACTICS), away: baseInput(away, { ...DEFAULT_TACTICS, mentality: -1 }) });
      const hr = table.get(home)!, ar = table.get(away)!;
      const homeWin = res.homeGoals > res.awayGoals, awayWin = res.awayGoals > res.homeGoals;
      apply(hr, res.homeGoals, res.awayGoals, homeWin, true);
      apply(ar, res.awayGoals, res.homeGoals, awayWin, false);
    }
  }
  return [...table.values()].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}

function SeasonTable({ rows, name }: { rows: SeasonRow[]; name: string }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="pb-2 text-left text-xs uppercase tracking-widest text-muted-foreground">{name} · simulated</caption>
        <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-2 py-1">#</th><th className="px-2 py-1">Club</th><th className="px-2 py-1 text-right">P</th><th className="px-2 py-1 text-right">W</th><th className="px-2 py-1 text-right">D</th><th className="px-2 py-1 text-right">L</th><th className="px-2 py-1 text-right">GD</th><th className="px-2 py-1 text-right">Pts</th></tr></thead>
        <tbody>
          {rows.map((r, i) => { const c = getClub(r.clubId); return (
            <tr key={r.clubId} className={cn("border-t", i === 0 && "bg-primary/10")}>
              <td className="px-2 py-1.5 font-mono text-xs">{i + 1}</td>
              <td className="px-2 py-1.5"><span className="flex items-center gap-2"><Crest colors={c?.colors} short={c?.short} size={20} />{c?.name}</span></td>
              <td className="px-2 py-1.5 text-right font-mono text-xs">{r.played}</td>
              <td className="px-2 py-1.5 text-right font-mono text-xs">{r.won}</td>
              <td className="px-2 py-1.5 text-right font-mono text-xs">{r.drawn}</td>
              <td className="px-2 py-1.5 text-right font-mono text-xs">{r.lost}</td>
              <td className="px-2 py-1.5 text-right font-mono text-xs">{r.gf - r.ga}</td>
              <td className="px-2 py-1.5 text-right font-mono font-semibold text-primary">{r.points}</td>
            </tr>
          ); })}
        </tbody>
      </table>
    </div>
  );
}
