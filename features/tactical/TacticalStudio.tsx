import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link, useRouter } from "@/lib/router";
import { useLocalStorage } from "@/lib/hooks";
import { useI18n } from "@/i18n";
import { useOs } from "@/store/useFootballOS";
import { getClub, playersByClub } from "@/data/footballService";
import { TACTICS_KEY } from "@/domain/localData";
import { Panel, SectionTitle, Crest, EmptyState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn, clamp, pct, safeDiv } from "@/lib/utils";
import { capRound, sum } from "@/domain/attributes";
import { toast } from "sonner";

interface Token { id: string; label: string; x: number; y: number; role: "GK" | "DEF" | "MID" | "ATT" }
interface Saved { name: string; mentality: number; tokens: Token[] }

const FORMATIONS: Record<string, Array<[number, number, Token["role"], string]>> = {
  "4-3-3": [[.5, .93, "GK", "1"], [.18, .74, "DEF", "2"], [.38, .78, "DEF", "5"], [.62, .78, "DEF", "4"], [.82, .74, "DEF", "3"], [.32, .52, "MID", "8"], [.5, .56, "MID", "6"], [.68, .52, "MID", "10"], [.2, .24, "ATT", "11"], [.5, .16, "ATT", "9"], [.8, .24, "ATT", "7"]],
  "4-4-2": [[.5, .93, "GK", "1"], [.16, .72, "DEF", "2"], [.38, .76, "DEF", "5"], [.62, .76, "DEF", "4"], [.84, .72, "DEF", "3"], [.14, .48, "MID", "7"], [.38, .5, "MID", "6"], [.62, .5, "MID", "8"], [.86, .48, "MID", "11"], [.4, .2, "ATT", "9"], [.6, .2, "ATT", "10"]],
  "3-5-2": [[.5, .93, "GK", "1"], [.3, .76, "DEF", "4"], [.5, .79, "DEF", "5"], [.7, .76, "DEF", "6"], [.12, .52, "MID", "3"], [.34, .5, "MID", "7"], [.5, .58, "MID", "8"], [.66, .5, "MID", "10"], [.88, .52, "MID", "2"], [.4, .2, "ATT", "9"], [.6, .2, "ATT", "11"]],
  "4-2-3-1": [[.5, .93, "GK", "1"], [.18, .74, "DEF", "2"], [.38, .78, "DEF", "5"], [.62, .78, "DEF", "4"], [.82, .74, "DEF", "3"], [.4, .6, "MID", "6"], [.6, .6, "MID", "8"], [.22, .38, "MID", "11"], [.5, .4, "MID", "10"], [.78, .38, "MID", "7"], [.5, .16, "ATT", "9"]],
};

const ROLE_COLOR: Record<Token["role"], string> = { GK: "var(--color-chart-4)", DEF: "var(--color-info)", MID: "var(--color-primary)", ATT: "var(--color-destructive)" };
// Mentality is persisted as an index 0..4, so its label is resolved through the
// dictionary rather than by array position — a saved shape reads back in the
// language it is viewed in.
const mentalityLabel = (t: (k: string) => string, i: number) => t(`tac.mentality.${i}`);

function build(formation: string): Token[] {
  return FORMATIONS[formation].map(([x, y, role, label], i) => ({ id: `t${i}`, label, x, y, role }));
}

export function TacticalStudio() {
  const { t } = useI18n();
  const { query } = useRouter();
  const { state } = useOs();
  const clubId = state.profile?.favoriteClubId ?? playersByClub("ars")[0]?.clubId ?? "ars";
  const club = getClub(clubId) ?? getClub("ars")!;
  // A Manager OS tactic recommendation carries its mentality index (0..4) here so
  // "Fine-tune in Tactical Studio" opens on that shape instead of a blank board.
  const carriedMt = query.get("mt");
  const carriedMentality =
    carriedMt !== null && Number.isFinite(Number(carriedMt))
      ? capRound(Number(carriedMt), 0, 4)
      : null;
  const [formation, setFormation] = useState("4-3-3");
  const [mentality, setMentality] = useState(carriedMentality ?? 2);
  const [tokens, setTokens] = useState<Token[]>(() => build("4-3-3"));
  const [saved, setSaved] = useLocalStorage<Saved[]>(TACTICS_KEY, []);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string } | null>(null);

  const applyFormation = (f: string) => { setFormation(f); setTokens(build(f)); };
  const compact = (dir: -1 | 1) => setTokens((ts) => ts.map((t) => t.role === "GK" ? t : { ...t, x: 0.5 + (t.x - 0.5) * dirWidth(dir), y: 0.5 + (t.y - 0.5) * (dir === 1 ? 0.9 : 1.1) }));

  const onMove = (e: ReactPointerEvent) => {
    if (!drag.current || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - r.left) / r.width, 0.03, 0.97);
    const y = clamp((e.clientY - r.top) / r.height, 0.03, 0.97);
    setTokens((ts) => ts.map((t) => t.id === drag.current!.id ? { ...t, x, y } : t));
  };

  const balance = useMemo(() => {
    const backs = tokens.filter((t) => t.role === "DEF").length;
    const mids = tokens.filter((t) => t.role === "MID").length;
    const atts = tokens.filter((t) => t.role === "ATT").length;
    const avgY = safeDiv(sum(tokens.filter((t) => t.role !== "GK"), (t) => t.y), tokens.length - 1);
    const spread = safeDiv(sum(tokens.filter((t) => t.role !== "GK"), (t) => Math.abs(t.x - 0.5)), tokens.length - 1);
    return { backs, mids, atts, line: avgY, spread };
  }, [tokens]);

  const shapeLabel = `${balance.backs}-${balance.mids}-${balance.atts}`;

  const save = () => {
    const entry: Saved = { name: `${formation} · ${mentalityLabel(t, mentality)}`, mentality, tokens };
    const verdict = setSaved((s) => [entry, ...s].slice(0, 12));
    if (verdict.landed) toast.success(t("tac.toastSaved"));
    else toast.warning(t("common.notStored"));
  };
  const load = (s: Saved) => { setTokens(s.tokens); setMentality(s.mentality); toast(t("tac.toastLoaded")); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">⛶</div>
        <div>
          <div className="flex items-center gap-2"><h1 className="text-xl font-bold">{t("tac.title")}</h1>{<DemoBadge />}</div>
          <p className="text-xs text-muted-foreground">{t("tac.subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-3 lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {Object.keys(FORMATIONS).map((f) => (
              <button key={f} onClick={() => applyFormation(f)} className={cn("rounded-md border px-2.5 py-1 text-xs", formation === f ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{f}</button>
            ))}
            <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground"><Crest colors={club.colors} short={club.short} size={22} />{club.name}</span>
          </div>
          <svg ref={svgRef} viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full touch-none rounded-lg" style={{ aspectRatio: "100/70", background: "linear-gradient(180deg,#0c3a1f,#0a2e18)" }} onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}>
            <PitchLines />
            {tokens.map((t) => (
              <g key={t.id} transform={`translate(${t.x * 100} ${t.y * 100})`} className="cursor-grab" onPointerDown={() => (drag.current = { id: t.id })}>
                <circle r={3.2} fill={ROLE_COLOR[t.role]} stroke="#00000055" strokeWidth={0.3} />
                <text textAnchor="middle" dy={1.2} fontSize={3} fontWeight={700} fill="#04140a">{t.label}</text>
              </g>
            ))}
          </svg>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => compact(-1)}>{t("tac.narrow")}</Button>
            <Button size="sm" variant="outline" onClick={() => compact(1)}>{t("tac.wide")}</Button>
            <Button size="sm" variant="outline" onClick={() => applyFormation(formation)}>{t("tac.reset")}</Button>
            <Button size="sm" onClick={save}>{t("tac.save")}</Button>
            <Link to={`/simulation?mt=${mentality}&shape=${encodeURIComponent(formation)}`}><Button size="sm" variant="ghost">{t("tac.toSim")}</Button></Link>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel className="p-4">
            <SectionTitle title={t("tac.mentality")} />
            <input type="range" min={0} max={4} step={1} value={mentality} onChange={(e) => setMentality(Number(e.target.value))} className="mt-2 w-full accent-[var(--color-primary)]" />
            <div className="mt-1 text-sm text-primary">{mentalityLabel(t, mentality)}</div>
            {carriedMentality !== null && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t("tac.carriedNote", { m: mentalityLabel(t, carriedMentality) })}
              </p>
            )}
          </Panel>
          <Panel className="p-4">
            <SectionTitle title={t("tac.shape")} />
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <Stat label={t("tac.detected")} value={shapeLabel} />
              <Stat label={t("tac.line")} value={t("tac.lineValue", { n: pct(1 - balance.line) })} />
              <Stat label={t("tac.width")} value={`${Math.round(balance.spread * 200)}%`} />
              <Stat label={t("tac.players")} value={tokens.length} />
            </div>
          </Panel>
          <Panel className="p-4">
            <SectionTitle title={t("tac.saved")} />
            {saved.length ? (
              <div className="mt-2 space-y-1.5">{saved.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm">
                  <span className="truncate">{s.name}</span>
                  <button onClick={() => load(s)} className="text-xs text-primary hover:underline">{t("tac.load")}</button>
                </div>
              ))}</div>
            ) : <EmptyState title={t("tac.savedEmpty")} hint={t("tac.savedEmptyHint")} />}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function dirWidth(dir: -1 | 1) { return dir === -1 ? 0.8 : 1.15; }

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md border bg-card/30 px-2.5 py-2"><div className="text-[11px] text-muted-foreground">{label}</div><div className="font-mono text-primary">{value}</div></div>;
}

function PitchLines() {
  return (
    <g stroke="#ffffff" strokeOpacity={0.28} strokeWidth={0.35} fill="none">
      <rect x={2} y={2} width={96} height={96} />
      <line x1={2} y1={50} x2={98} y2={50} />
      <circle cx={50} cy={50} r={11} />
      <rect x={28} y={82} width={44} height={16} />
      <rect x={39} y={91} width={22} height={7} />
      <rect x={28} y={2} width={44} height={16} />
      <rect x={39} y={2} width={22} height={7} />
    </g>
  );
}

