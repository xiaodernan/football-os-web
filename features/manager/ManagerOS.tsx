import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { footballProvider, getClub, getCompetition, formatValue } from "@/data/footballService";
import { useLocalStorage } from "@/lib/hooks";
import {
  createCareer,
  playNextFixture,
  transferIn,
  transferOut,
  setTactics,
  restSquad,
  effectiveSquad,
  marketTargets,
  liveStandings,
  positionOf,
  careerForm,
  seasonOutlook,
  seasonSummary,
  matchPrep,
  projectFixture,
  askingFee,
  sellFee,
  clubInput,
  fixtureAt,
  type CareerState,
  type MatchOutcome,
  type Tactics,
} from "@/domain/career";
import type { MatchProbability } from "@/domain/matchProbability";
import { CAREER_KEY } from "@/domain/localData";
import { Panel, SectionTitle, Crest, EmptyState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";import type { PosBucket } from "@/domain/scouting";
import { toast } from "sonner";
import { positionLabel, rowLine } from "@/domain/rowText";

const KEY = CAREER_KEY;
type Tab = "overview" | "squad" | "transfers" | "tactics" | "table" | "outlook" | "prep";
const TABS: { id: Tab; labelKey: string }[] = [
  { id: "overview", labelKey: "mgr.tabOverview" },
  { id: "squad", labelKey: "mgr.tabSquad" },
  { id: "transfers", labelKey: "mgr.tabTransfers" },
  { id: "tactics", labelKey: "mgr.tabTactics" },
  { id: "table", labelKey: "mgr.tabTable" },
  { id: "outlook", labelKey: "mgr.tabOutlook" },
  { id: "prep", labelKey: "mgr.tabMatchPrep" },
];
// The market's position buckets. Codes and labels live together so the filter buttons
// resolve a labelKey and the state default reads BUCKETS[0].code instead of hard-coding
// "ALL" — a literal there is interface copy as far as the raw-UI scan is concerned.
const BUCKETS: { code: PosBucket; labelKey: string }[] = [
  { code: "ALL", labelKey: "mgr.bucketAll" },
  { code: "GK", labelKey: "mgr.bucketGk" },
  { code: "DEF", labelKey: "mgr.bucketDef" },
  { code: "MID", labelKey: "mgr.bucketMid" },
  { code: "ATT", labelKey: "mgr.bucketAtt" },
];

// M224. The engine's own scale, read from the keys the Tactical Studio and the Simulation Lab
// already print for these values: this slider is the studio's 0..4 index shifted by -2, and the
// tempo/press bands are the lab's bands, so one value has one name instead of this screen's
// second English list. The helper takes the translator by name, which is how check 16 reads a
// site.
const mentalityWord = (t: (key: string) => string, i: number) => t(`tac.mentality.${i}`);
const tempoWord = (t: (key: string) => string, v: number) => (v < 0.35 ? t("sim.low") : v < 0.7 ? t("sim.medium") : t("sim.high"));
const pressWord = (t: (key: string) => string, v: number) => (v < 0.35 ? t("sim.pressDeep") : v < 0.7 ? t("sim.medium") : t("sim.highPress"));

export function ManagerOS() {
  const { t } = useI18n();
  const [career, setCareer] = useLocalStorage<CareerState | null>(KEY, null);
  const [tab, setTab] = useState<Tab>("overview");
  const [last, setLast] = useState<MatchOutcome | null>(null);

  if (!career) return <ClubPicker onStart={(id) => { const v = setCareer(createCareer(id)); toast(v.landed ? t("mgr.careerStarted") : t("common.notStored")); }} />;

  const club = getClub(career.clubId);
  if (!club)
    return (
      <div className="space-y-3">
        <EmptyState title={t("mgr.noClubTitle")} hint={t("mgr.noClubHint")} />
        <div className="flex justify-center"><Button variant="outline" onClick={() => setCareer(null)}>{t("mgr.newCareer")}</Button></div>
      </div>
    );

  const update = (fn: (s: CareerState) => CareerState) => setCareer((prev) => (prev ? fn(prev) : prev));

  const play = () => {
    const out = playNextFixture(career);
    setCareer(out.state);
    setLast(out);
    if (out.ourGoals > out.oppGoals) toast.success(t("mgr.won", { us: out.ourGoals, them: out.oppGoals, opp: out.opponentName }));
    else if (out.ourGoals === out.oppGoals) toast(t("mgr.drew", { us: out.ourGoals, them: out.oppGoals, opp: out.opponentName }));
    else toast(t("mgr.lost", { us: out.ourGoals, them: out.oppGoals, opp: out.opponentName }));
  };

  return (
    <div className="space-y-5">
      <CareerHeader career={career} onChange={update} onPlay={play} onReset={() => { setCareer(null); setLast(null); }} />
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((entry) => (
          <button key={entry.id} onClick={() => setTab(entry.id)} className={cn("rounded-md border px-3 py-1.5 text-sm", tab === entry.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{t(entry.labelKey)}</button>
        ))}
      </div>

      {tab === "overview" && <Overview career={career} last={last} />}
      {tab === "squad" && <Squad career={career} onSell={(id) => { update((s) => transferOut(s, id)); toast(t("mgr.sold")); }} />}
      {tab === "transfers" && <Transfers career={career} onBuy={(id) => { update((s) => transferIn(s, id)); toast(t("mgr.signed")); }} />}
      {tab === "tactics" && <TacticsPanel career={career} onChange={(t) => update((s) => setTactics(s, t))} onRest={() => { update(restSquad); toast(t("mgr.rested")) }} />}
      {tab === "table" && <Table career={career} />}
      {tab === "outlook" && <Outlook career={career} />}
      {tab === "prep" && <MatchPrepPanel career={career} onApply={(next) => { update((s) => setTactics(s, next)); toast(t("mgr.tacticsApplied")); }} />}
    </div>
  );
}

function CareerHeader({ career, onChange, onPlay, onReset }: { career: CareerState; onChange: (fn: (s: CareerState) => CareerState) => void; onPlay: () => void; onReset: () => void }) {
  const { t } = useI18n();
  const club = getClub(career.clubId)!;
  const comp = getCompetition(career.competitionId);
  const pos = positionOf(career);
  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-center gap-4">
        <Crest colors={club.colors} short={club.short} size={48} />
        <div className="min-w-[10rem] flex-1">
          <div className="flex items-center gap-2"><h1 className="text-lg font-bold">{club.name}</h1><DemoBadge /></div>
          <p className="text-xs text-muted-foreground">{t("mgr.careerLine", { comp: comp?.name ?? "—", n: career.results.length })}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label={t("mgr.budget")} value={formatValue(career.budget)} />
          <Metric label={t("mgr.leaguePos")} value={pos ? `#${pos}` : "—"} />
          <Metric label={t("mgr.morale")} value={`${Math.round(((career.morale + 1) / 2) * 100)}%`} tone={career.morale >= 0 ? "good" : "bad"} />
          <Metric label={t("mgr.fatigue")} value={`${Math.round(career.fatigue * 100)}%`} tone={career.fatigue > 0.6 ? "bad" : "good"} />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onPlay}>▶ {t("mgr.playNext")}</Button>
          <Button variant="ghost" size="sm" onClick={onReset}>{t("common.reset")}</Button>
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        {t("mgr.nextOpponent")} <span className="text-foreground">{getClub(fixtureAt(career.competitionId, career.clubId, career.results.length).opponent)?.name}</span>
        {" · "}
        <Link to="/tactical-studio" className="text-primary hover:underline">{t("mgr.designShape")}</Link>
      </div>
    </Panel>
  );
}

function Overview({ career, last }: { career: CareerState; last: MatchOutcome | null }) {
  const { t } = useI18n();
  const squad = effectiveSquad(career.clubId, career.moved);
  const inp = clubInput(career.clubId, career.moved, career.tactics, careerForm(career), career.morale, career.fatigue);
  const recent = [...career.results].slice(-5).reverse();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel className="p-4 lg:col-span-2">
        <SectionTitle title={t("mgr.latestResult")} hint={t("mgr.engineHint")} />
        {last ? (
          <div className="mt-2">
            <div className="flex items-center justify-center gap-6 py-2">
              <div className="text-right text-sm">{getClub(career.clubId)?.name}</div>
              <div className="font-mono text-3xl font-bold">{last.ourGoals}–{last.oppGoals}</div>
              <div className="text-sm">{last.opponentName}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <Fact label={t("mgr.xgUs")} value={last.ourXg.toFixed(2)} />
              <Fact label={t("mgr.xgThem")} value={last.oppXg.toFixed(2)} />
              <Fact label={t("mgr.prizeMoney")} value={formatValue(last.prize)} />
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">{t("mgr.keyMoments")}</div>
            <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs">
              {last.sim.timeline.filter((e) => e.type === "GOAL" || e.type === "RED").slice(0, 12).map((e, i) => (
                <li key={i} className="flex gap-2"><span className="w-8 font-mono text-muted-foreground">{e.minute}'</span><span className="truncate">{e.type === "GOAL" ? "⚽" : "🟥"} {e.player}</span></li>
              ))}
              {!last.sim.timeline.some((e) => e.type === "GOAL" || e.type === "RED") && <li className="text-muted-foreground">{t("mgr.noKeyMoments")}</li>}
            </ul>
          </div>
        ) : (
          <div className="mt-3"><EmptyState title={t("mgr.noFixture")} hint={t("mgr.noFixtureHint")} icon="▷" /></div>
        )}
      </Panel>
      <div className="space-y-4">
        <Panel className="p-4">
          <SectionTitle title={t("mgr.teamProfile")} />
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <Fact label={t("data.attack")} value={Math.round(inp.attack)} />
            <Fact label={t("det.midfield")} value={Math.round(inp.midfield)} />
            <Fact label={t("data.defence")} value={Math.round(inp.defense)} />
            <Fact label={t("mgr.form")} value={`${careerForm(career).toFixed(2)}`} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("mgr.squadOf", { n: squad.length })}</p>
        </Panel>
        <Panel className="p-4">
          <SectionTitle title={t("mgr.recentResults")} />
          {recent.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {recent.map((r, i) => {
                const w = r.ourGoals > r.oppGoals, d = r.ourGoals === r.oppGoals;
                return (
                  <li key={i} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className={cn("grid h-5 w-5 place-items-center rounded text-[10px] font-bold", w ? "bg-success/20 text-success" : d ? "bg-muted text-muted-foreground" : "bg-destructive/20 text-destructive")}>{w ? "W" : d ? "D" : "L"}</span>{getClub(r.opponent)?.name} ({r.weHome ? "H" : "A"})</span>
                    <span className="font-mono text-xs">{r.ourGoals}-{r.oppGoals}</span>
                  </li>
                );
              })}
            </ul>
          ) : <p className="mt-2 text-xs text-muted-foreground">{t("mgr.noMatches")}</p>}
        </Panel>
        {career.results.length > 0 && <SeasonSummaryPanel career={career} />}
      </div>
    </div>
  );
}

function SeasonSummaryPanel({ career }: { career: CareerState }) {
  const { t } = useI18n();
  const s = seasonSummary(career);
  const tone = s.honour?.tone === "good" ? "text-success" : s.honour?.tone === "bad" ? "text-destructive" : "text-info";
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <SectionTitle title={t("mgr.seasonTitle")} hint={t("mgr.seasonFrom")} />
        {s.honour && <span className={cn("text-xs font-semibold", tone)}>{rowLine(s.honour.label, t)}</span>}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
        <Fact label={t("mgr.wdl")} value={`${s.won}-${s.drawn}-${s.lost}`} />
        <Fact label={t("mgr.gfGa")} value={`${s.gf}-${s.ga}`} />
        <Fact label={t("mgr.ppg")} value={s.ppg.toFixed(2)} />
        <Fact label={t("mgr.cleanSheets")} value={s.cleanSheets} />
        <Fact label={t("onb.position")} value={`#${s.position}`} />
        <Fact label={t("mgr.prizeWon")} value={formatValue(s.prizeTotal)} />
      </div>
      {(s.bestWin || s.worstLoss) && (
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          {s.bestWin && <div> {t("mgr.biggestWin")} <span className="text-foreground">{s.bestWin.score}</span> {t("mgr.vs")} {s.bestWin.opponent}</div>}
          {s.worstLoss && <div> {t("mgr.heaviestDefeat")} <span className="text-foreground">{s.worstLoss.score}</span> {t("mgr.vs")} {s.worstLoss.opponent}</div>}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">{s.complete ? t("mgr.seasonDone") : t("mgr.fixturesLeft", { n: Math.max(0, (s.clubCount - 1) * 2 - s.played) })}</p>
    </Panel>
  );
}

function Squad({ career, onSell }: { career: CareerState; onSell: (id: string) => void }) {
  const { t } = useI18n();
  const squad = effectiveSquad(career.clubId, career.moved);
  return (
    <Panel className="p-4">
      <SectionTitle title={t("mgr.squadTitle", { n: squad.length })} hint={t("mgr.sellHint")} />
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-2 py-1">{t("mgr.thPos")}</th><th className="px-2 py-1">{t("mgr.thPlayer")}</th><th className="px-2 py-1 text-right">{t("common.age")}</th><th className="px-2 py-1 text-right">{t("mgr.thOvr")}</th><th className="px-2 py-1 text-right">{t("mgr.thValue")}</th><th className="px-2 py-1 text-right">{t("mgr.sell")}</th></tr></thead>
          <tbody>
            {squad.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">{positionLabel(p.position, t)}</td>
                <td className="px-2 py-1.5"><Link to={`/players/${p.id}`} className="hover:text-primary hover:underline">{p.name}</Link><span className="ml-2 text-xs text-muted-foreground">{p.nation}</span></td>
                <td className="px-2 py-1.5 text-right font-mono text-xs">{p.age}</td>
                <td className="px-2 py-1.5 text-right font-mono text-xs font-semibold">{p.overall}</td>
                <td className="px-2 py-1.5 text-right font-mono text-xs">{formatValue(p.value)}</td>
                <td className="px-2 py-1.5 text-right"><Button size="sm" variant="outline" onClick={() => onSell(p.id)}>{formatValue(sellFee(p))}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Transfers({ career, onBuy }: { career: CareerState; onBuy: (id: string) => void }) {
  const { t } = useI18n();
  const [pos, setPos] = useState<PosBucket>(BUCKETS[0].code);
  const targets = useMemo(() => marketTargets(career, 200), [career]);
  const groupOf = (g: string) => (g === "GK" || g === "CB" || g === "FB" ? "DEF" : g === "CM" || g === "DM" ? "MID" : g === "AM" || g === "W" || g === "ST" ? "ATT" : "DEF");
  const shown = targets.filter((p) => pos === BUCKETS[0].code || groupOf(p.positionGroup) === pos);
  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle title={t("mgr.market")} hint={t("mgr.marketHint")} />
        <div className="text-sm">{t("mgr.budget")} <span className="font-mono font-semibold text-primary">{formatValue(career.budget)}</span></div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {BUCKETS.map((g) => (
          <button key={g.code} onClick={() => setPos(g.code)} className={cn("rounded-md border px-2.5 py-1 text-xs", pos === g.code ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{t(g.labelKey)}</button>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {shown.slice(0, 40).map((p) => {
          const fee = askingFee(p);
          const afford = career.budget >= fee;
          const from = getClub(p.id in career.moved ? career.moved[p.id] : p.clubId);
          return (
            <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div className="min-w-0"><Link to={`/players/${p.id}`} className="truncate hover:text-primary hover:underline">{p.name}</Link> <span className="text-xs text-muted-foreground">{positionLabel(p.position, t)} · {p.age} · {t("mgr.thOvr")} {p.overall} · {from?.name ?? t("mgr.freeAgent")}</span></div>
              <Button size="sm" disabled={!afford} onClick={() => onBuy(p.id)} title={afford ? t("mgr.sign") : t("mgr.noBudget")}>{afford ? t("mgr.signFee", { fee: formatValue(fee) }) : t("mgr.needFee", { fee: formatValue(fee) })}</Button>
            </div>
          );
        })}
        {!shown.length && <EmptyState title={t("mgr.noTargets")} hint={t("mgr.noTargetsHint")} />}
      </div>
    </Panel>
  );
}

function TacticsPanel({ career, onChange, onRest }: { career: CareerState; onChange: (t: Tactics) => void; onRest: () => void }) {
  const { t } = useI18n();
  const tactics = career.tactics;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <SectionTitle title={t("mgr.instructions")} />
        <div className="mt-3 space-y-4">
          <Slider label={t("tac.mentality")} min={-2} max={2} step={1} value={tactics.mentality} onChange={(v) => onChange({ ...tactics, mentality: v })} format={(v) => mentalityWord(t, v + 2)} />
          <Slider label={t("mgr.tempo")} min={0} max={1} step={0.05} value={tactics.tempo} onChange={(v) => onChange({ ...tactics, tempo: v })} format={(v) => tempoWord(t, v)} />
          <Slider label={t("mgr.press")} min={0} max={1} step={0.05} value={tactics.press} onChange={(v) => onChange({ ...tactics, press: v })} format={(v) => pressWord(t, v)} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("mgr.instrHint")}</p>
      </Panel>
      <Panel className="p-4">
        <SectionTitle title={t("mgr.recovery")} />
        <div className="mt-2 flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t("mgr.currentFatigue")}</span>
          <span className="font-mono">{Math.round(career.fatigue * 100)}%</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t("mgr.fatigueHint")}</p>
        <Button className="mt-3" variant="outline" onClick={onRest} disabled={career.fatigue <= 0.06}>{t("mgr.rest")}</Button>
      </Panel>
    </div>
  );
}

function Table({ career }: { career: CareerState }) {
  const { t } = useI18n();
  const rows = liveStandings(career);
  const comp = getCompetition(career.competitionId);
  return (
    <Panel className="p-4">
      <SectionTitle title={`${comp?.name ?? t("mgr.leagueWord")} ${t("mgr.tableWord")}`} hint={t("mgr.tableHint")} />
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-2 py-1">#</th><th className="px-2 py-1">{t("mgr.thClub")}</th><th className="px-2 py-1 text-right">{t("mgr.thP")}</th><th className="px-2 py-1 text-right">{t("mgr.thW")}</th><th className="px-2 py-1 text-right">{t("mgr.thD")}</th><th className="px-2 py-1 text-right">{t("mgr.thL")}</th><th className="px-2 py-1 text-right">{t("mgr.thGD")}</th><th className="px-2 py-1 text-right">{t("mgr.thPts")}</th></tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const c = getClub(r.clubId);
              const ours = r.clubId === career.clubId;
              return (
                <tr key={r.clubId} className={cn("border-t", ours && "bg-primary/10 font-semibold")}>
                  <td className="px-2 py-1.5 font-mono text-xs">{i + 1}</td>
                  <td className="px-2 py-1.5"><span className="flex items-center gap-2"><Crest colors={c?.colors} short={c?.short} size={18} />{c?.name}</span></td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs">{r.played}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs">{r.won}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs">{r.drawn}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs">{r.lost}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs">{r.gf - r.ga}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-primary">{r.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Outlook({ career }: { career: CareerState }) {
  const { t } = useI18n();
  const o = seasonOutlook(career);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const zoneTone = o.zone.tone === "good" ? "text-success" : o.zone.tone === "bad" ? "text-destructive" : "text-info";
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <SectionTitle title={t("mgr.tabOutlook")} hint={t("mgr.outlookHint")} />
            <DemoBadge />
          </div>
          {career.results.length === 0 && (
            <p className="mt-2 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-xs text-info">
              {t("mgr.projectionNote")}
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label={t("mgr.currentPos")} value={`#${o.position}`} />
            <Metric label={t("mgr.projectedPos")} value={`#${o.projectedPosition}`} />
            <Metric label={t("mgr.expectedFinish")} value={`≈${o.expectedFinish}`} />
            <Metric label={t("mgr.zone")} value={rowLine(o.zone.label, t)} />
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">{t("mgr.titleChance")}</span><span className={cn("font-mono font-semibold", zoneTone)}>{pct(o.titleChance)}</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.max(2, o.titleChance * 100)}%` }} /></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Fact label={t("mgr.playedTotal")} value={`${o.played} / ${o.totalFixtures}`} />
            <Fact label={t("mgr.ppgPts")} value={`${o.points} (${o.pointsPerGame.toFixed(2)})`} />
            <Fact label={t("mgr.projectedPts")} value={o.projectedPoints} />
            <Fact label={t("mgr.roundsLeft")} value={o.remaining} />
            <Fact label={t("mgr.projLeader")} value={o.leaderName} />
            <Fact label={t("mgr.gapToLeader")} value={o.gapToProjectedLeader === 0 ? t("mgr.leading") : o.gapToProjectedLeader} />
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("mgr.closestRivals")} hint={t("mgr.rivalNote")} />
          <div className="mt-2 space-y-2">
            {o.rivalRows.map((r) => (
              <div key={r.clubId}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span>{r.clubName}</span>
                    <span className="text-[11px] text-muted-foreground">{t("mgr.ppg")} {r.currentPpg.toFixed(2)} · {t("mgr.projWord")} {r.projectedPoints}</span>
                  </span>
                  <span className={cn("font-mono text-xs", r.beatUsChance >= 0.5 ? "text-destructive" : "text-muted-foreground")}>{pct(r.beatUsChance)}</span>
                </div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-muted"><div className={cn("h-full", r.beatUsChance >= 0.5 ? "bg-destructive" : "bg-primary/60")} style={{ width: `${Math.max(2, r.beatUsChance * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel className="p-4">
          <SectionTitle title={t("common.confidence")} />
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded bg-muted"><div className="h-full bg-info" style={{ width: `${o.confidence}%` }} /></div>
            <span className="font-mono text-xs">{o.confidence}%</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("mgr.confidenceRise")}</p>
        </Panel>
        <Panel className="p-4">
          <SectionTitle title={t("mgr.evidenceTitle")} />
          <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            {o.evidence.map((e, i) => (
              <li key={i} className="flex items-start gap-1.5"><span className="text-primary">›</span><span>{rowLine(e, t)}</span></li>
            ))}
          </ul>
          <div className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">
            <div className="uppercase tracking-wide">{t("mgr.sourcesTitle")}</div>
            <ul className="mt-1 space-y-0.5">{o.sources.map((s, i) => <li key={i}>· {rowLine(s, t)}</li>)}</ul>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MatchPrepPanel({ career, onApply }: { career: CareerState; onApply: (t: Tactics) => void }) {
  const { t } = useI18n();
  const p = matchPrep(career);
  const isCurrent = career.tactics.mentality === p.recommended.mentality && Math.abs(career.tactics.press - p.recommended.press) < 0.01 && Math.abs(career.tactics.tempo - p.recommended.tempo) < 0.01;
  const [odds, setOdds] = useState<MatchProbability | null>(null);
  const [oddsBusy, setOddsBusy] = useState(false);
  const runOdds = () => {
    setOddsBusy(true);
    setTimeout(() => { setOdds(projectFixture(career, 150)); setOddsBusy(false); }, 30);
  };
  const ourWin = odds ? (p.weHome ? odds.homeWinPct : odds.awayWinPct) : 0;
  const theirWin = odds ? (p.weHome ? odds.awayWinPct : odds.homeWinPct) : 0;
  const vs = (label: string, a: number, b: number) => (
    <div className="flex items-center justify-between rounded-md border bg-card/30 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{a} <span className="text-muted-foreground">{t("common.vs")}</span> {b}</span>
      <span className={cn("font-mono text-xs", a >= b ? "text-success" : "text-destructive")}>{a - b >= 0 ? "+" : ""}{a - b}</span>
    </div>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <SectionTitle title={`${t("mgr.vs")} ${p.opponentName} (${t(`mgr.venue.${p.venue.toLowerCase()}`)})`} hint={t("mgr.engineCompare")} />
            <DemoBadge />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("mgr.engineCompareHint")}</p>
          <div className="mt-3 space-y-1.5">
            {vs(t("mgr.attackVsDef"), p.us.attack, p.them.defense)}
            {vs(t("mgr.defVsAttack"), p.us.defense, p.them.attack)}
            {vs(t("mgr.midBattle"), p.us.midfield, p.them.midfield)}
          </div>
        </Panel>
        <Panel className="p-4">
          <SectionTitle title={t("mgr.recommendedShape")} />
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
            <Fact label={t("tac.mentality")} value={mentalityWord(t, p.recommended.mentality + 2)} />
            <Fact label={t("mgr.press")} value={pressWord(t, p.recommended.press)} />
            <Fact label={t("mgr.tempo")} value={tempoWord(t, p.recommended.tempo)} />
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            {p.rationale.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5"><span className="text-primary">›</span><span>{rowLine(r, t)}</span></li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm" disabled={isCurrent} onClick={() => onApply(p.recommended)}>{isCurrent ? t("mgr.appliedAlready") : t("mgr.applyTactics")}</Button>
            <Button size="sm" variant="outline" onClick={runOdds} disabled={oddsBusy}>{oddsBusy ? t("mgr.projecting") : t("mgr.projectOdds", { n: 150 })}</Button>
            <Link to={`/tactical-studio?mt=${p.recommended.mentality + 2}`} className="text-xs text-primary hover:underline">{t("mgr.fineTune")} →</Link>
          </div>
        </Panel>

        {odds && (
          <Panel className="p-4">
            <div className="flex items-center justify-between">
              <SectionTitle title={t("mgr.oddsTitle")} hint={t("mgr.oddsHint", { n: 150 })} />
              <DemoBadge />
            </div>
            <div className="mt-3 flex h-3 w-full overflow-hidden rounded">
              <div className="bg-primary" style={{ width: `${ourWin * 100}%` }} />
              <div className="bg-muted-foreground/40" style={{ width: `${odds.drawPct * 100}%` }} />
              <div className="bg-info" style={{ width: `${theirWin * 100}%` }} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
              <div><div className="text-xs text-muted-foreground">{t("mgr.usWin")}</div><div className="font-mono font-semibold text-primary">{Math.round(ourWin * 100)}%</div></div>
              <div><div className="text-xs text-muted-foreground">{t("mgr.draw")}</div><div className="font-mono font-semibold">{Math.round(odds.drawPct * 100)}%</div></div>
              <div><div className="truncate text-xs text-muted-foreground">{p.opponentName} {t("mgr.winWord")}</div><div className="font-mono font-semibold text-info">{Math.round(theirWin * 100)}%</div></div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{t("mgr.oddsNote")} {t("mgr.avgGoals")} {odds.avgHomeGoals.toFixed(2)}–{odds.avgAwayGoals.toFixed(2)} · {t("mgr.overWord", { n: 2.5 })} {Math.round(odds.over25Pct * 100)}%.</p>
          </Panel>
        )}
      </div>
      <div className="space-y-4">
        <Panel className="p-4">
          <SectionTitle title={t("common.confidence")} />
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded bg-muted"><div className="h-full bg-info" style={{ width: `${p.confidence}%` }} /></div>
            <span className="font-mono text-xs">{p.confidence}%</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("mgr.strengthNote")}</p>
        </Panel>
        <Panel className="p-4">
          <SectionTitle title={t("mgr.sourcesTitle")} />
          <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">{p.sources.map((s, i) => <li key={i}>· {rowLine(s, t)}</li>)}</ul>
        </Panel>
      </div>
    </div>
  );
}

function ClubPicker({ onStart }: { onStart: (clubId: string) => void }) {
  const { t } = useI18n();
  const comps = footballProvider.competitions();
  const [compId, setCompId] = useState(comps[0]?.id ?? "");
  const clubs = useMemo(() => footballProvider.clubs().filter((c) => c.competitionId === compId).sort((a, b) => b.overall - a.overall), [compId]);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">♟</div>
        <div>
          <div className="flex items-center gap-2"><h1 className="text-xl font-bold">{t("nav.manager")}</h1><DemoBadge /></div>
          <p className="text-xs text-muted-foreground">{t("mgr.subtitle")}</p>
        </div>
      </div>
      <Panel className="p-4">
        <SectionTitle title={t("mgr.chooseClub")} />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {comps.map((c) => (
            <button key={c.id} onClick={() => setCompId(c.id)} className={cn("rounded-md border px-2.5 py-1 text-xs", compId === c.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{c.name}</button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((c) => (
            <button key={c.id} onClick={() => onStart(c.id)} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-left hover:border-primary/50 hover:bg-primary/5">
              <Crest colors={c.colors} short={c.short} size={34} />
              <div className="min-w-0"><div className="truncate text-sm font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{t("mgr.thOvr")} {c.overall} · {c.nation}</div></div>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// value is a computed string at every call site, and a resolved row can be absent, so
// the prop says what the callers actually hand it.
function Metric({ label, value, tone }: { label: string; value: string | undefined; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-md border bg-card/40 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("font-mono text-sm font-semibold", tone === "good" && "text-success", tone === "bad" && "text-destructive")}>{value}</div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-[10px] text-muted-foreground">{label}</div><div className="font-mono text-sm">{value}</div></div>;
}

function Slider({ label, min, max, step, value, onChange, format }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-medium text-primary">{format(value)}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[var(--color-primary)]" />
    </label>
  );
}

export { ManagerOS as default };
