import { useMemo, useState } from "react";
import { getClub, getPlayer, comparePlayers, formatValue } from "@/data/footballService";
import { useOs } from "@/store/useFootballOS";
import {
  scoutCandidates,
  bestValueAt,
  squadProfile,
  headroom,
  valueIndex,
  primeYears,
  bucketOf,
  type PosBucket,
  type ScoutSort,
} from "@/domain/scouting";
import type { PlayerRef } from "@/domain/types";
import { Panel, SectionTitle, Crest, EmptyState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";

const BUCKETS: PosBucket[] = ["ALL", "GK", "DEF", "MID", "ATT"];
const SORTS: { id: ScoutSort; label: string }[] = [
  { id: "value", label: "Best value" },
  { id: "potential", label: "Highest potential" },
  { id: "overall", label: "Best player" },
  { id: "age", label: "Youngest" },
];
const NO_CAP = Number.MAX_SAFE_INTEGER;

export function ScoutingPanel() {
  const { state, toggleWatch } = useOs();
  const clubId = state.profile?.favoriteClubId ?? "ars";
  const [bucket, setBucket] = useState<PosBucket>("ALL");
  const [minOverall, setMinOverall] = useState(75);
  const [maxAge, setMaxAge] = useState(30);
  const [capped, setCapped] = useState(false);
  const [maxValue, setMaxValue] = useState(60); // €M when capped
  const [sort, setSort] = useState<ScoutSort>("value");
  const [compare, setCompare] = useState<string[]>([]);

  const results = useMemo(
    () => scoutCandidates({ bucket, minOverall, maxAge, maxValue: capped ? maxValue * 1_000_000 : NO_CAP, clubId }, sort, 48),
    [bucket, minOverall, maxAge, capped, maxValue, sort, clubId],
  );
  const profile = useMemo(() => squadProfile(clubId), [clubId]);
  const picks = useMemo(() => {
    const out: { b: Exclude<PosBucket, "ALL">; player: PlayerRef; clubName: string }[] = [];
    for (const b of ["GK", "DEF", "MID", "ATT"] as const) {
      const best = bestValueAt(b, 68);
      if (best) out.push({ b, player: best.player, clubName: best.clubName });
    }
    return out;
  }, []);
  const watch = (state.watchlist ?? []).map(getPlayer).filter(Boolean) as PlayerRef[];

  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 2 ? [c[1], id] : [...c, id]));

  const cmp = compare.length === 2 ? comparePlayers(compare[0], compare[1]) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">◎</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h1 className="text-xl font-bold">Scouting</h1><DemoBadge /></div>
          <p className="text-xs text-muted-foreground">Explainable shortlists from the world dataset — value, potential and age only, never invented attributes.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-4">
          <SectionTitle title="Your club needs" />
          <p className="text-xs text-muted-foreground">Squad profile of {getClub(clubId)?.name}, by position group.</p>
          <div className="mt-3 space-y-2">
            {profile.map((r) => (
              <div key={r.bucket}>
                <div className="flex justify-between text-xs"><span className="font-medium">{r.bucket}</span><span className="text-muted-foreground">{r.count} players · avg {r.avg || "—"}</span></div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-muted"><div className={cn("h-full rounded", r.count < 4 || r.avg < 74 ? "bg-warning" : "bg-success")} style={{ width: `${Math.min(100, (r.avg / 90) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Amber = thin or below-average group — a scouting priority.</p>
        </Panel>

        <Panel className="p-4 lg:col-span-2">
          <SectionTitle title="Best value by position" hint="Highest overall per €1M among eligible players" />
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {picks.map((p) => (
              <div key={p.b} className="flex items-center gap-3 rounded-md border bg-card/40 px-3 py-2">
                <Badge variant="outline" className="text-[10px]">{p.b}</Badge>
                <div className="min-w-0 flex-1"><Link to={`/players/${p.player.id}`} className="truncate text-sm hover:text-primary hover:underline">{p.player.name}</Link><div className="text-[11px] text-muted-foreground">{p.clubName} · OVR {p.player.overall} · {formatValue(p.player.value)}</div></div>
                <Button size="sm" variant={state.watchlist.includes(p.player.id) ? "secondary" : "outline"} onClick={() => toggleWatch(p.player.id)}>{state.watchlist.includes(p.player.id) ? "★" : "☆"}</Button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="p-4">
        <SectionTitle title="Discover targets" />
        <div className="flex flex-wrap items-center gap-2">
          {BUCKETS.map((b) => (
            <button key={b} onClick={() => setBucket(b)} className={cn("rounded-md border px-2.5 py-1 text-xs", bucket === b ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{b}</button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          {SORTS.map((s) => (
            <button key={s.id} onClick={() => setSort(s.id)} className={cn("rounded-md border px-2.5 py-1 text-xs", sort === s.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{s.label}</button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted-foreground">Min overall <span className="float-right font-mono text-primary">{minOverall}</span>
            <input type="range" min={60} max={92} value={minOverall} onChange={(e) => setMinOverall(Number(e.target.value))} className="mt-1 w-full accent-[var(--color-primary)]" />
          </label>
          <label className="text-xs text-muted-foreground">Max age <span className="float-right font-mono text-primary">{maxAge}</span>
            <input type="range" min={16} max={36} value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} className="mt-1 w-full accent-[var(--color-primary)]" />
          </label>
          <label className="text-xs text-muted-foreground">
            <span className="flex items-center justify-between">Max value <input type="checkbox" checked={capped} onChange={(e) => setCapped(e.target.checked)} className="accent-[var(--color-primary)]" /></span>
            {capped ? <><span className="float-right font-mono text-primary">€{maxValue}M</span><input type="range" min={5} max={200} value={maxValue} onChange={(e) => setMaxValue(Number(e.target.value))} className="mt-1 w-full accent-[var(--color-primary)]" /></> : <input type="range" min={5} max={200} value={200} disabled className="mt-1 w-full opacity-40" />}
          </label>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-2 py-1">Pos</th><th className="px-2 py-1">Player</th><th className="px-2 py-1 text-right">Age</th><th className="px-2 py-1 text-right">OVR</th><th className="px-2 py-1 text-right">POT</th><th className="px-2 py-1 text-right">Value</th><th className="px-2 py-1 text-right">OVR/€M</th><th className="px-2 py-1 text-center">Watch</th><th className="px-2 py-1 text-center">Cmp</th></tr></thead>
            <tbody>
              {results.map((p) => (
                <tr key={p.id} className={cn("border-t", compare.includes(p.id) && "bg-primary/5")}>
                  <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">{p.position}</td>
                  <td className="px-2 py-1.5"><Link to={`/players/${p.id}`} className="hover:text-primary hover:underline">{p.name}</Link><span className="ml-2 text-xs text-muted-foreground">{getClub(p.clubId)?.short} · {p.archetype}</span></td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs">{p.age}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs font-semibold">{p.overall}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs">{p.potential}<span className="text-success"> +{headroom(p)}</span></td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs">{formatValue(p.value)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs">{valueIndex(p).toFixed(1)}</td>
                  <td className="px-2 py-1.5 text-center"><button onClick={() => toggleWatch(p.id)} className={state.watchlist.includes(p.id) ? "text-primary" : "text-muted-foreground hover:text-primary"}>{state.watchlist.includes(p.id) ? "★" : "☆"}</button></td>
                  <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={compare.includes(p.id)} onChange={() => toggleCompare(p.id)} className="accent-[var(--color-primary)]" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!results.length && <EmptyState title="No players match" hint="Loosen the overall, age or value filters." />}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Watchlist watch={watch} onRemove={toggleWatch} onCompare={toggleCompare} comparing={compare} />
        <Panel className="p-4">
          <SectionTitle title="Compare" hint="Pick two players from the table or shortlist" />
          {cmp.length === 2 ? <CompareView a={cmp[0]} b={cmp[1]} /> : <div className="pt-2"><EmptyState title="Select two players" hint={compare.length === 1 ? "Pick one more to compare." : "Use the Cmp checkboxes."} icon="⇄" /></div>}
        </Panel>
      </div>
    </div>
  );
}

function Watchlist({ watch, onRemove, onCompare, comparing }: { watch: PlayerRef[]; onRemove: (id: string) => void; onCompare: (id: string) => void; comparing: string[] }) {
  return (
    <Panel className="p-4">
      <SectionTitle title={`Shortlist · ${watch.length}`} hint="Saved on this device" />
      {watch.length ? (
        <div className="space-y-1.5">
          {watch.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
              <div className="min-w-0"><Link to={`/players/${p.id}`} className="hover:text-primary hover:underline">{p.name}</Link> <span className="text-xs text-muted-foreground">{p.position} · OVR {p.overall} · prime ~{primeYears(p)}y</span></div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant={comparing.includes(p.id) ? "secondary" : "ghost"} onClick={() => onCompare(p.id)}>⇄</Button>
                <Button size="sm" variant="ghost" onClick={() => onRemove(p.id)}>✕</Button>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="mt-2 text-sm text-muted-foreground">Star a player to build a shortlist.</p>}
    </Panel>
  );
}

function CompareView({ a, b }: { a: PlayerRef; b: PlayerRef }) {
  const rows: { label: string; av: number; bv: number; better: "hi" | "lo" }[] = [
    { label: "Overall", av: a.overall, bv: b.overall, better: "hi" },
    { label: "Potential", av: a.potential, bv: b.potential, better: "hi" },
    { label: "Growth headroom", av: headroom(a), bv: headroom(b), better: "hi" },
    { label: "Age", av: a.age, bv: b.age, better: "lo" },
    { label: "Value (€M)", av: +(a.value / 1e6).toFixed(1), bv: +(b.value / 1e6).toFixed(1), better: "lo" },
    { label: "OVR per €M", av: +valueIndex(a).toFixed(1), bv: +valueIndex(b).toFixed(1), better: "hi" },
  ];
  return (
    <div className="mt-2">
      <div className="grid grid-cols-3 items-center gap-2 text-center text-xs">
        <Side p={a} /><div className="text-muted-foreground">vs</div><Side p={b} />
      </div>
      <div className="mt-3 space-y-2">
        {rows.map((r) => {
          const aWins = r.better === "hi" ? r.av > r.bv : r.av < r.bv;
          const bWins = r.better === "hi" ? r.bv > r.av : r.bv < r.av;
          return (
            <div key={r.label} className="flex items-center justify-between text-sm">
              <span className={cn("w-16 text-right font-mono", aWins && "text-primary font-semibold")}>{r.av}</span>
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <span className={cn("w-16 font-mono", bWins && "text-primary font-semibold")}>{r.bv}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Same position group: {bucketOf(a.positionGroup) === bucketOf(b.positionGroup) ? "yes" : "no"} · Feet: {a.foot} / {b.foot}</p>
    </div>
  );
}

function Side({ p }: { p: PlayerRef }) {
  const c = getClub(p.clubId);
  return (
    <div className="flex flex-col items-center gap-1">
      <Crest colors={c?.colors} short={c?.short} size={30} />
      <Link to={`/players/${p.id}`} className="line-clamp-1 hover:text-primary hover:underline">{p.name}</Link>
      <span className="text-[10px] text-muted-foreground">{p.position}</span>
    </div>
  );
}

export { ScoutingPanel as default };
