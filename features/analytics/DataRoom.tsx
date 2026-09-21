import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider, getClub, getCompetition } from "@/data/footballService";
import { useOs } from "@/store/useFootballOS";
import { teamMetrics, leaders, expectedGoals, formPoints, type TeamMetrics, type FormLetter } from "@/domain/analytics";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge } from "@/ui/primitives";
import { cn } from "@/lib/utils";

function FormPips({ form }: { form: FormLetter[] }) {
  if (!form.length) return <span className="text-xs text-muted-foreground">–</span>;
  return (
    <span className="flex gap-0.5">
      {form.map((r, i) => (
        <span
          key={i}
          title={r}
          className={cn(
            "grid h-4 w-4 place-items-center rounded-[3px] text-[9px] font-bold text-white",
            r === "W" ? "bg-success" : r === "L" ? "bg-destructive" : "bg-muted-foreground/60",
          )}
        >
          {r}
        </span>
      ))}
    </span>
  );
}

function RatingBar({ label, value, better }: { label: string; value: number; better: "high" | "low" }) {
  const scale = Math.min(2, Math.max(0, value)) / 2; // 0..2 → 0..100%
  const tone = better === "high" ? "bg-info" : "bg-warning";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <span className={cn("absolute inset-y-0 left-0 rounded-full", tone)} style={{ width: `${scale * 100}%` }} />
      </span>
      <span className="w-8 shrink-0 text-right font-mono tabular-nums">{value.toFixed(2)}</span>
    </div>
  );
}

export function DataRoom() {
  const { t } = useI18n();
  const { state } = useOs();
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const matches = useMemo(() => footballProvider.matches(), []);

  const favComp = state.profile?.favoriteClubId ? getClub(state.profile.favoriteClubId)?.competitionId : undefined;
  const [compId, setCompId] = useState<string>(favComp && competitions.some((c) => c.id === favComp) ? favComp : competitions[0]?.id ?? "");
  const [picked, setPicked] = useState<string | null>(null);

  const metrics = useMemo(() => teamMetrics(compId, matches, clubs), [compId, matches, clubs]);
  const lead = useMemo(() => leaders(metrics), [metrics]);
  const comp = getCompetition(compId);
  const pickedTeam = metrics.find((m) => m.clubId === picked) ?? null;
  const clash = metrics.length >= 2 ? { top: metrics[0], second: metrics[1], xg: expectedGoals(metrics[0], metrics[1]) } : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{t("data.title")}</h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("data.subtitle")}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {competitions.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCompId(c.id);
              setPicked(null);
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              compId === c.id ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/30",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("data.bestForm")} value={lead.bestForm ? getClub(lead.bestForm.clubId)?.short ?? "–" : "–"} sub={lead.bestForm ? `${formPoints(lead.bestForm)}/15 pts` : undefined} tone="up" />
        <StatTile label={t("data.topAttack")} value={lead.strongestAttack ? getClub(lead.strongestAttack.clubId)?.short ?? "–" : "–"} sub={lead.strongestAttack ? `${lead.strongestAttack.attack.toFixed(2)}× avg` : undefined} />
        <StatTile label={t("data.topDefence")} value={lead.bestDefence ? getClub(lead.bestDefence.clubId)?.short ?? "–" : "–"} sub={lead.bestDefence ? `${lead.bestDefence.defence.toFixed(2)}× avg` : undefined} />
        <StatTile label={t("data.topScoring")} value={lead.highestScoring ? `${lead.highestScoring.gfAvg.toFixed(2)}` : "–"} sub={lead.highestScoring ? `${getClub(lead.highestScoring.clubId)?.short} goals/game` : undefined} />
      </div>

      {!metrics.length ? (
        <Panel className="p-4"><EmptyState title={t("data.empty")} icon="▤" hint="No finished matches in this competition yet." /></Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Panel className="p-0">
            <div className="flex items-center justify-between px-4 pt-4">
              <SectionTitle title={comp?.name ?? ""} hint={`${metrics.reduce((s, m) => s + m.played, 0) / 2 | 0} matches played`} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2 text-center">#</th>
                    <th className="px-2 py-2">{t("common.club")}</th>
                    <th className="px-2 py-2 text-center">P</th>
                    <th className="px-2 py-2 text-center">W</th>
                    <th className="px-2 py-2 text-center">D</th>
                    <th className="px-2 py-2 text-center">L</th>
                    <th className="px-2 py-2 text-center">GD</th>
                    <th className="px-2 py-2 text-center">PTS</th>
                    <th className="px-2 py-2">{t("data.form")}</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m, i) => {
                    const club = getClub(m.clubId);
                    return (
                      <tr
                        key={m.clubId}
                        onClick={() => setPicked(m.clubId)}
                        className={cn("cursor-pointer border-b last:border-0 hover:bg-secondary/40", picked === m.clubId && "bg-primary/5")}
                      >
                        <td className="px-2 py-2 text-center font-mono text-xs text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-2">
                          <span className="flex items-center gap-2">
                            <Crest colors={club?.colors} short={club?.short} size={22} />
                            <span className="truncate">{club?.name}</span>
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center font-mono text-xs tabular-nums">{m.played}</td>
                        <td className="px-2 py-2 text-center font-mono text-xs tabular-nums">{m.won}</td>
                        <td className="px-2 py-2 text-center font-mono text-xs tabular-nums">{m.drawn}</td>
                        <td className="px-2 py-2 text-center font-mono text-xs tabular-nums">{m.lost}</td>
                        <td className="px-2 py-2 text-center font-mono text-xs tabular-nums">{m.gd > 0 ? `+${m.gd}` : m.gd}</td>
                        <td className="px-2 py-2 text-center font-mono text-xs font-semibold tabular-nums">{m.points}</td>
                        <td className="px-2 py-2"><FormPips form={m.form} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="space-y-4">
            {pickedTeam ? (
              <Panel className="p-4">
                <div className="flex items-center gap-3">
                  <Crest colors={getClub(pickedTeam.clubId)?.colors} short={getClub(pickedTeam.clubId)?.short} size={36} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{getClub(pickedTeam.clubId)?.name}</div>
                    <Link to={`/clubs/${pickedTeam.clubId}`} className="text-xs text-primary hover:underline">Club page →</Link>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <RatingBar label={t("data.attack")} value={pickedTeam.attack} better="high" />
                  <RatingBar label={t("data.defence")} value={pickedTeam.defence} better="low" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <SplitCard title={t("data.home")} s={pickedTeam.home} />
                  <SplitCard title={t("data.away")} s={pickedTeam.away} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Mini label="Goals" value={pickedTeam.gf} />
                  <Mini label="Conceded" value={pickedTeam.ga} />
                  <Mini label="Clean sheets" value={pickedTeam.cleanSheets} />
                </div>
              </Panel>
            ) : (
              <Panel className="p-4">
                <EmptyState title={t("data.selectTeam")} icon="⌖" hint="Pick a club to see attack/defence ratings and home/away splits." />
              </Panel>
            )}

            {clash && (
              <Panel className="p-4">
                <SectionTitle title={t("data.modelClash")} hint="Modelled from attack/defence ratings" />
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2"><Crest colors={getClub(clash.top.clubId)?.colors} short={getClub(clash.top.clubId)?.short} size={24} /><span className="truncate">{getClub(clash.top.clubId)?.short}</span></span>
                  <span className="font-mono text-base font-semibold tabular-nums">{clash.xg.home} – {clash.xg.away}</span>
                  <span className="flex items-center gap-2"><span className="truncate text-right">{getClub(clash.second.clubId)?.short}</span><Crest colors={getClub(clash.second.clubId)?.colors} short={getClub(clash.second.clubId)?.short} size={24} /></span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">{getClub(clash.top.clubId)?.name} (home) vs {getClub(clash.second.clubId)?.name}. Expected-goals estimate, not a result.</p>
              </Panel>
            )}
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">{t("data.disclaimer")}</p>
    </div>
  );
}

function SplitCard({ title, s }: { title: string; s: TeamMetrics["home"] }) {
  return (
    <div className="rounded-lg border bg-card/50 p-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="mt-1 font-mono text-xs tabular-nums">{s.won}-{s.drawn}-{s.lost}</div>
      <div className="text-[11px] text-muted-foreground">{s.gf} scored · {s.ga} conceded · {s.played} played</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card/50 px-2 py-1.5">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
