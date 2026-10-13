import { useMemo, useState } from "react";
import { footballProvider, getClub, getCompetition, playersByClub, clubIdsByCompetition } from "@/data/footballService";
import { useRouter } from "@/lib/router";
import { byOverall } from "@/domain/attributes";
import { simulateMatch, EVENT_GLYPH, type TeamInput, type SimResult } from "@/domain/matchEngine";
import { matchProbability, type MatchProbability } from "@/domain/matchProbability";
import { rowLine } from "@/domain/rowText";
import { clubInput } from "@/domain/career";
import { Panel, SectionTitle, Crest, EmptyState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleSlider } from "@/components/ui/simple-slider";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface Tactics {
  mentality: number; // -2 park the bus .. +2 all-out attack
  tempo: number; // 0..1
  press: number; // 0..1
  fatigue: number; // 0..1
}

const DEFAULT_TACTICS: Tactics = { mentality: 0, tempo: 0.5, press: 0.5, fatigue: 0 };
// The studio persists a 0..4 mentality index and the dictionary has carried its word since
// M156, so the lab reads the word the studio shows rather than a second English list of its
// own. The helper takes the translator by name because that is how check 16 reads a site.
const mentalityWord = (t: (key: string) => string, i: number) => t(`tac.mentality.${i}`);
const PROB_RUNS = 250;

// M334: this was a fourth hand-written copy of `domain/career.ts`'s `clubInput` — the same
// three line means, the same mentality/press/fatigue adjustments, the same possession bias —
// with its own local `avg` beside the domain's (now exported) `lineMean`. M333 took the copies
// out of the club page and its match preview; this one was in the biggest simulation surface in
// the app, so a correction to the team input landed in the domain and the lab kept simulating on
// the old arithmetic. It calls the domain now, and maps the studio's 0..4 mentality index onto
// the morale the domain expects the same way the career match does.
function baseInput(clubId: string, tac: Tactics): TeamInput {
  return clubInput(clubId, {}, { mentality: tac.mentality, tempo: tac.tempo, press: tac.press }, 0, tac.mentality * 0.2, tac.fatigue);
}

export function SimulationLab() {
  const { query } = useRouter();
  const { t } = useI18n();
  const clubs = useMemo(() => [...footballProvider.clubs()].sort(byOverall), []);
  const [homeId, setHomeId] = useState(clubs.find((c) => c.name.includes("City"))?.id ?? clubs[0].id);
  const [awayId, setAwayId] = useState(clubs.find((c) => c.name.includes("Madrid"))?.id ?? clubs[1].id);
  // Tactical Studio's "Take to Simulation Lab" carries the mentality you set there
  // (stored 0..4 → engine −2..+2) plus the shape label. Read once on mount so the
  // lab genuinely starts from your saved tactics instead of the engine default.
  const carriedMt = query.get("mt");
  const carriedShape = query.get("shape");
  const studioMentality = carriedMt !== null && !Number.isNaN(Number(carriedMt))
    ? Math.max(0, Math.min(4, Number(carriedMt)))
    : null;
  const [homeTac, setHomeTac] = useState<Tactics>(
    studioMentality !== null ? { ...DEFAULT_TACTICS, mentality: studioMentality - 2 } : DEFAULT_TACTICS,
  );
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
          runs: PROB_RUNS,
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
          <div className="flex items-center gap-2"><h1 className="text-xl font-bold">{t("sim.title")}</h1>{<DemoBadge />}</div>
          <p className="text-xs text-muted-foreground">{t("sim.subtitle")}</p>
        </div>
      </div>

      {studioMentality !== null && (
        <Panel className="p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline" className="border-primary/40 text-primary">{t("sim.fromStudio")}</Badge>
            <span>{carriedShape
              ? t("sim.studioCarryShape", { mentality: mentalityWord(t, studioMentality), shape: carriedShape })
              : t("sim.studioCarry", { mentality: mentalityWord(t, studioMentality) })}</span>
            <span className="text-xs text-muted-foreground">{t("sim.engineDefaults")}</span>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <TeamPanel title={t("data.home")} club={home.id} colors={home.colors} short={home.short} value={homeTac} onChange={setHomeTac} clubs={clubs} selected={homeId} onSelect={setHomeId} />
        <TeamPanel title={t("data.away")} club={away.id} colors={away.colors} short={away.short} value={awayTac} onChange={setAwayTac} clubs={clubs} selected={awayId} onSelect={setAwayId} />
      </div>

      <Panel className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={runMatch} disabled={homeId === awayId}>{result ? t("sim.rerun") : t("sim.runMatch")}</Button>
          <Button variant="outline" onClick={reroll} disabled={!result}>{t("sim.newVariation")}</Button>
          <Button variant="secondary" onClick={runProb} disabled={homeId === awayId || probBusy}>{probBusy ? t("sim.runningSims", { n: PROB_RUNS }) : t("sim.runProbability", { n: PROB_RUNS })}</Button>
          <span className="text-xs text-muted-foreground">{t("sim.seed", { home: homeId, away: awayId, nonce })}</span>
          {homeId === awayId && <Badge variant="outline" className="text-warning">{t("sim.pickDifferent")}</Badge>}
        </div>
        {result ? <ResultView result={result} home={home.name} away={away.name} /> : (
          <div className="mt-3"><EmptyState title={t("sim.emptyTitle")} hint={t("sim.emptyHint")} icon="▷" /></div>
        )}
      </Panel>

      {prob && <ProbabilityPanel prob={prob} />}

      <Panel className="p-4">
        <SectionTitle title={t("sim.seasonTitle")} hint={t("sim.seasonHint")} />
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
  const { t } = useI18n();
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
        <SimpleSlider label={t("tac.mentality")} min={-2} max={2} step={1} value={value.mentality} onChange={(v) => onChange({ ...value, mentality: v })} format={(v) => mentalityWord(t, v + 2)} />
        <SimpleSlider label={t("mgr.tempo")} min={0} max={1} step={0.05} value={value.tempo} onChange={(v) => onChange({ ...value, tempo: v })} format={(v) => (v < 0.35 ? t("sim.low") : v < 0.7 ? t("sim.medium") : t("sim.high"))} />
        <SimpleSlider label={t("mgr.press")} min={0} max={1} step={0.05} value={value.press} onChange={(v) => onChange({ ...value, press: v })} format={(v) => (v < 0.35 ? t("sim.pressDeep") : v < 0.7 ? t("sim.medium") : t("sim.highPress"))} />
        <SimpleSlider label={t("mgr.fatigue")} min={0} max={1} step={0.1} value={value.fatigue} onChange={(v) => onChange({ ...value, fatigue: v })} format={(v) => `${Math.round(v * 100)}%`} />
      </div>
    </Panel>
  );
}

function ResultView({ result, home, away }: { result: SimResult; home: string; away: string }) {
  const { t } = useI18n();
  const s = result.stats;
const rows = [
      { name: t("ms.possession"), h: Math.round(s.home.possession), a: Math.round(s.away.possession), unit: "%" },
      { name: t("ms.shots"), h: s.home.shots, a: s.away.shots, unit: "" },
      { name: t("ms.onTarget"), h: s.home.onTarget, a: s.away.onTarget, unit: "" },
      { name: t("common.xg"), h: +s.home.xg.toFixed(2), a: +s.away.xg.toFixed(2), unit: "" },
      { name: t("ms.corners"), h: s.home.corners, a: s.away.corners, unit: "" },
      { name: t("sim.cards"), h: s.home.yellows + s.home.reds * 2, a: s.away.yellows + s.away.reds * 2, unit: "" },
    ];
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-3 items_center">
        <div className="text-center"><div className="truncate text-sm font-medium">{home}</div></div>
        <div className="text-center font-mono text-4xl font-bold">{result.homeGoals}–{result.awayGoals}</div>
        <div className="text-center"><div className="truncate text-sm font-medium">{away}</div></div>
      </div>
      <div className="space-y-2">
        {rows.map((r) => {
          const total = r.h + r.a || 1;
          return (
            <div key={r.name}>
              <div className="flex justify-between text-[11px]"><span className="font-mono">{r.h}{r.unit}</span><span className="text-muted-foreground">{r.name}</span><span className="font-mono">{r.a}{r.unit}</span></div>
              <div className="mt-0.5 flex h-1.5 overflow-hidden rounded bg-muted"><div className="bg-primary" style={{ width: `${(r.h / total) * 100}%` }} /><div className="flex-1 bg-muted-foreground/40" /></div>
            </div>
          );
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><div className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">{t("mgr.keyMoments")}</div><ul className="max-h-40 space-y-1 overflow-y-auto text-xs">{result.timeline.filter((e) => e.type === "GOAL" || e.type === "RED" || e.type === "VAR").slice(0, 10).map((e, i) => <li key={i} className="flex gap-2"><span className="w-8 font-mono text-muted-foreground">{e.minute}'</span><span className="truncate">{EVENT_GLYPH[e.type]} {e.player} <span className="text-muted-foreground">({e.side === "home" ? home : away})</span></span></li>)}</ul></div>
        <div><div className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">{t("sim.matchSummary")}</div><ul className="space-y-1 text-xs text-muted-foreground">{result.summary.map((x, i) => <li key={i}>• {rowLine(x, t)}</li>)}</ul></div>
      </div>
    </div>
  );
}

function ProbabilityPanel({ prob }: { prob: MatchProbability }) {
  const { t } = useI18n();
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const seg = (v: number) => `${v * 100}%`;
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <SectionTitle title={t("sim.outcomeTitle")} hint={t("sim.engineRuns", { n: prob.runs })} />
        <DemoBadge />
      </div>
      <div className="mt-3">
        <div className="flex h-3 w-full overflow-hidden rounded">
          <div className="bg-primary" style={{ width: seg(prob.homeWinPct) }} />
          <div className="bg-muted-foreground/40" style={{ width: seg(prob.drawPct) }} />
          <div className="bg-info" style={{ width: seg(prob.awayWinPct) }} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
          <div><div className="truncate text-xs text-muted-foreground">{t("sim.teamWin", { team: prob.homeName })}</div><div className="font-mono font-semibold text-primary">{pct(prob.homeWinPct)}</div></div>
          <div><div className="text-xs text-muted-foreground">{t("mgr.draw")}</div><div className="font-mono font-semibold">{pct(prob.drawPct)}</div></div>
          <div><div className="truncate text-xs text-muted-foreground">{t("sim.teamWin", { team: prob.awayName })}</div><div className="font-mono font-semibold text-info">{pct(prob.awayWinPct)}</div></div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
        <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">{t("sim.avgGoals")}</div><div className="font-mono text-sm">{prob.avgHomeGoals.toFixed(2)}–{prob.avgAwayGoals.toFixed(2)}</div></div>
        <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">{t("sim.avgXg")}</div><div className="font-mono text-sm">{prob.avgHomeXg.toFixed(2)}–{prob.avgAwayXg.toFixed(2)}</div></div>
        <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">{t("sim.bothScore")}</div><div className="font-mono text-sm">{pct(prob.bttsPct)}</div></div>
        <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">{t("sim.over25")}</div><div className="font-mono text-sm">{pct(prob.over25Pct)}</div></div>
      </div>
      <div className="mt-4">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("sim.mostLikelyScores")}</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {prob.mostLikely.map((s) => (
            <span key={s.score} className="rounded-md border bg-card/40 px-2 py-1 text-sm"><span className="font-mono font-semibold">{s.score}</span> <span className="text-xs text-muted-foreground">{pct(s.pct)}</span></span>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">{t("sim.projectionNote", { n: prob.runs })}</p>
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
  const { t } = useI18n();
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="pb-2 text-left text-xs uppercase tracking-widest text-muted-foreground">{t("sim.tableCaption", { name })}</caption>
        <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-2 py-1">#</th><th className="px-2 py-1">{t("common.club")}</th><th className="px-2 py-1 text-right">{t("data.th.p")}</th><th className="px-2 py-1 text-right">{t("data.th.w")}</th><th className="px-2 py-1 text-right">{t("data.th.d")}</th><th className="px-2 py-1 text-right">{t("data.th.l")}</th><th className="px-2 py-1 text-right">{t("data.th.gd")}</th><th className="px-2 py-1 text-right">{t("data.th.pts")}</th></tr></thead>
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
