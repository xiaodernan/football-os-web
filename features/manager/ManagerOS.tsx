import { useMemo, useState } from "react";
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
  askingFee,
  sellFee,
  clubInput,
  fixtureAt,
  type CareerState,
  type MatchOutcome,
  type Tactics,
} from "@/domain/career";
import { Panel, SectionTitle, Crest, EmptyState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const KEY = "football-os.career.v1";
type Tab = "overview" | "squad" | "transfers" | "tactics" | "table";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "squad", label: "Squad" },
  { id: "transfers", label: "Transfers" },
  { id: "tactics", label: "Tactics" },
  { id: "table", label: "League table" },
];

export function ManagerOS() {
  const [career, setCareer] = useLocalStorage<CareerState | null>(KEY, null);
  const [tab, setTab] = useState<Tab>("overview");
  const [last, setLast] = useState<MatchOutcome | null>(null);

  if (!career) return <ClubPicker onStart={(id) => { setCareer(createCareer(id)); toast("Career started"); }} />;

  const club = getClub(career.clubId);
  if (!club)
    return (
      <div className="space-y-3">
        <EmptyState title="Career club missing" hint="The stored club is not in the current dataset." />
        <div className="flex justify-center"><Button variant="outline" onClick={() => setCareer(null)}>Start a new career</Button></div>
      </div>
    );

  const update = (fn: (s: CareerState) => CareerState) => setCareer((prev) => (prev ? fn(prev) : prev));

  const play = () => {
    const out = playNextFixture(career);
    setCareer(out.state);
    setLast(out);
    if (out.ourGoals > out.oppGoals) toast.success(`Won ${out.ourGoals}–${out.oppGoals} vs ${out.opponentName}`);
    else if (out.ourGoals === out.oppGoals) toast(`Drew ${out.ourGoals}–${out.oppGoals} vs ${out.opponentName}`);
    else toast(`Lost ${out.ourGoals}–${out.oppGoals} vs ${out.opponentName}`);
  };

  return (
    <div className="space-y-5">
      <CareerHeader career={career} onChange={update} onPlay={play} onReset={() => { setCareer(null); setLast(null); }} />
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("rounded-md border px-3 py-1.5 text-sm", tab === t.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{t.label}</button>
        ))}
      </div>

      {tab === "overview" && <Overview career={career} last={last} />}
      {tab === "squad" && <Squad career={career} onSell={(id) => { update((s) => transferOut(s, id)); toast("Player sold"); }} />}
      {tab === "transfers" && <Transfers career={career} onBuy={(id) => { update((s) => transferIn(s, id)); toast("Signing completed"); }} />}
      {tab === "tactics" && <TacticsPanel career={career} onChange={(t) => update((s) => setTactics(s, t))} onRest={() => { update(restSquad); toast("Squad rested") }} />}
      {tab === "table" && <Table career={career} />}
    </div>
  );
}

function CareerHeader({ career, onChange, onPlay, onReset }: { career: CareerState; onChange: (fn: (s: CareerState) => CareerState) => void; onPlay: () => void; onReset: () => void }) {
  const club = getClub(career.clubId)!;
  const comp = getCompetition(career.competitionId);
  const pos = positionOf(career);
  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-center gap-4">
        <Crest colors={club.colors} short={club.short} size={48} />
        <div className="min-w-[10rem] flex-1">
          <div className="flex items-center gap-2"><h1 className="text-lg font-bold">{club.name}</h1><DemoBadge /></div>
          <p className="text-xs text-muted-foreground">{comp?.name} · Manager career · {career.results.length} matches played</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Budget" value={formatValue(career.budget)} />
          <Metric label="League pos" value={pos ? `#${pos}` : "—"} />
          <Metric label="Morale" value={`${Math.round(((career.morale + 1) / 2) * 100)}%`} tone={career.morale >= 0 ? "good" : "bad"} />
          <Metric label="Fatigue" value={`${Math.round(career.fatigue * 100)}%`} tone={career.fatigue > 0.6 ? "bad" : "good"} />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onPlay}>▶ Play next fixture</Button>
          <Button variant="ghost" size="sm" onClick={onReset}>Reset</Button>
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        Next opponent: <span className="text-foreground">{getClub(fixtureAt(career.competitionId, career.clubId, career.results.length).opponent)?.name}</span>
        {" · "}
        <Link to="/tactical-studio" className="text-primary hover:underline">Design shape in Tactical Studio</Link>
      </div>
    </Panel>
  );
}

function Overview({ career, last }: { career: CareerState; last: MatchOutcome | null }) {
  const squad = effectiveSquad(career.clubId, career.moved);
  const inp = clubInput(career.clubId, career.moved, career.tactics, careerForm(career), career.morale, career.fatigue);
  const recent = [...career.results].slice(-5).reverse();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel className="p-4 lg:col-span-2">
        <SectionTitle title="Latest result" hint="Deterministic Match Engine" />
        {last ? (
          <div className="mt-2">
            <div className="flex items-center justify-center gap-6 py-2">
              <div className="text-right text-sm">{getClub(career.clubId)?.name}</div>
              <div className="font-mono text-3xl font-bold">{last.ourGoals}–{last.oppGoals}</div>
              <div className="text-sm">{last.opponentName}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <Fact label="xG (us)" value={last.ourXg.toFixed(2)} />
              <Fact label="xG (them)" value={last.oppXg.toFixed(2)} />
              <Fact label="Prize money" value={formatValue(last.prize)} />
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">Key moments</div>
            <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs">
              {last.sim.timeline.filter((e) => e.type === "GOAL" || e.type === "RED").slice(0, 12).map((e, i) => (
                <li key={i} className="flex gap-2"><span className="w-8 font-mono text-muted-foreground">{e.minute}'</span><span className="truncate">{e.type === "GOAL" ? "⚽" : "🟥"} {e.player}</span></li>
              ))}
              {!last.sim.timeline.some((e) => e.type === "GOAL" || e.type === "RED") && <li className="text-muted-foreground">No goals or sending-offs.</li>}
            </ul>
          </div>
        ) : (
          <div className="mt-3"><EmptyState title="No fixture played yet" hint="Press Play next fixture to run your first match." icon="▷" /></div>
        )}
      </Panel>
      <div className="space-y-4">
        <Panel className="p-4">
          <SectionTitle title="Team profile" />
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <Fact label="Attack" value={Math.round(inp.attack)} />
            <Fact label="Midfield" value={Math.round(inp.midfield)} />
            <Fact label="Defense" value={Math.round(inp.defense)} />
            <Fact label="Form" value={`${careerForm(career).toFixed(2)}`} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Squad of {squad.length} · shaped by your transfers and tactics.</p>
        </Panel>
        <Panel className="p-4">
          <SectionTitle title="Recent results" />
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
          ) : <p className="mt-2 text-xs text-muted-foreground">No matches played yet.</p>}
        </Panel>
      </div>
    </div>
  );
}

function Squad({ career, onSell }: { career: CareerState; onSell: (id: string) => void }) {
  const squad = effectiveSquad(career.clubId, career.moved);
  return (
    <Panel className="p-4">
      <SectionTitle title={`Squad · ${squad.length}`} hint="Selling recovers ~85% of market value" />
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-2 py-1">Pos</th><th className="px-2 py-1">Player</th><th className="px-2 py-1 text-right">Age</th><th className="px-2 py-1 text-right">OVR</th><th className="px-2 py-1 text-right">Value</th><th className="px-2 py-1 text-right">Sell</th></tr></thead>
          <tbody>
            {squad.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">{p.position}</td>
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
  const [pos, setPos] = useState<"ALL" | "GK" | "DEF" | "MID" | "ATT">("ALL");
  const targets = useMemo(() => marketTargets(career, 200), [career]);
  const groupOf = (g: string) => (g === "GK" || g === "CB" || g === "FB" ? "DEF" : g === "CM" || g === "DM" ? "MID" : g === "AM" || g === "W" || g === "ST" ? "ATT" : "DEF");
  const shown = targets.filter((p) => pos === "ALL" || groupOf(p.positionGroup) === pos);
  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle title="Transfer market" hint="Asking fees include a small premium" />
        <div className="text-sm">Budget <span className="font-mono font-semibold text-primary">{formatValue(career.budget)}</span></div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(["ALL", "GK", "DEF", "MID", "ATT"] as const).map((g) => (
          <button key={g} onClick={() => setPos(g)} className={cn("rounded-md border px-2.5 py-1 text-xs", pos === g ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{g}</button>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {shown.slice(0, 40).map((p) => {
          const fee = askingFee(p);
          const afford = career.budget >= fee;
          const from = getClub(p.id in career.moved ? career.moved[p.id] : p.clubId);
          return (
            <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div className="min-w-0"><Link to={`/players/${p.id}`} className="truncate hover:text-primary hover:underline">{p.name}</Link> <span className="text-xs text-muted-foreground">{p.position} · {p.age} · OVR {p.overall} · {from?.name ?? "Free agent"}</span></div>
              <Button size="sm" disabled={!afford} onClick={() => onBuy(p.id)} title={afford ? "Sign" : "Insufficient budget"}>{afford ? `Sign ${formatValue(fee)}` : `Need ${formatValue(fee)}`}</Button>
            </div>
          );
        })}
        {!shown.length && <EmptyState title="No targets" hint="Try a different position filter." />}
      </div>
    </Panel>
  );
}

function TacticsPanel({ career, onChange, onRest }: { career: CareerState; onChange: (t: Tactics) => void; onRest: () => void }) {
  const t = career.tactics;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <SectionTitle title="Team instructions" />
        <div className="mt-3 space-y-4">
          <Slider label="Mentality" min={-2} max={2} step={1} value={t.mentality} onChange={(v) => onChange({ ...t, mentality: v })} format={(v) => ["Park the bus", "Defensive", "Balanced", "Attacking", "All-out"][v + 2]} />
          <Slider label="Tempo" min={0} max={1} step={0.05} value={t.tempo} onChange={(v) => onChange({ ...t, tempo: v })} format={(v) => (v < 0.35 ? "Low" : v < 0.7 ? "Medium" : "High")} />
          <Slider label="Press" min={0} max={1} step={0.05} value={t.press} onChange={(v) => onChange({ ...t, press: v })} format={(v) => (v < 0.35 ? "Deep block" : v < 0.7 ? "Medium" : "High press")} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Instructions feed straight into the Match Engine for your fixtures.</p>
      </Panel>
      <Panel className="p-4">
        <SectionTitle title="Recovery" />
        <div className="mt-2 flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <span className="text-muted-foreground">Current fatigue</span>
          <span className="font-mono">{Math.round(career.fatigue * 100)}%</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">High fatigue suppresses attack, midfield and defense ratings in the next match.</p>
        <Button className="mt-3" variant="outline" onClick={onRest} disabled={career.fatigue <= 0.06}>Rest the squad</Button>
      </Panel>
    </div>
  );
}

function Table({ career }: { career: CareerState }) {
  const rows = liveStandings(career);
  const comp = getCompetition(career.competitionId);
  return (
    <Panel className="p-4">
      <SectionTitle title={`${comp?.name ?? "League"} table`} hint="Real standings updated with your career results" />
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-2 py-1">#</th><th className="px-2 py-1">Club</th><th className="px-2 py-1 text-right">P</th><th className="px-2 py-1 text-right">W</th><th className="px-2 py-1 text-right">D</th><th className="px-2 py-1 text-right">L</th><th className="px-2 py-1 text-right">GD</th><th className="px-2 py-1 text-right">Pts</th></tr></thead>
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

function ClubPicker({ onStart }: { onStart: (clubId: string) => void }) {
  const comps = footballProvider.competitions();
  const [compId, setCompId] = useState(comps[0]?.id ?? "");
  const clubs = useMemo(() => footballProvider.clubs().filter((c) => c.competitionId === compId).sort((a, b) => b.overall - a.overall), [compId]);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">♟</div>
        <div>
          <div className="flex items-center gap-2"><h1 className="text-xl font-bold">Manager OS</h1><DemoBadge /></div>
          <p className="text-xs text-muted-foreground">Take charge of a club: play fixtures, move players and climb the league — all on the deterministic engine.</p>
        </div>
      </div>
      <Panel className="p-4">
        <SectionTitle title="Choose your club" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {comps.map((c) => (
            <button key={c.id} onClick={() => setCompId(c.id)} className={cn("rounded-md border px-2.5 py-1 text-xs", compId === c.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{c.name}</button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((c) => (
            <button key={c.id} onClick={() => onStart(c.id)} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-left hover:border-primary/50 hover:bg-primary/5">
              <Crest colors={c.colors} short={c.short} size={34} />
              <div className="min-w-0"><div className="truncate text-sm font-medium">{c.name}</div><div className="text-xs text-muted-foreground">OVR {c.overall} · {c.nation}</div></div>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
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
