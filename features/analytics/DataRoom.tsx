import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n, formatDate } from "@/i18n";
import { footballProvider, getClub, getCompetition } from "@/data/footballService";
import { useOs } from "@/store/useFootballOS";
import { teamMetrics, leaders, expectedGoals, oddsPercents, outcomeOdds, formPoints, finishedCount, type TeamMetrics, type FormLetter } from "@/domain/analytics";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge } from "@/ui/primitives";
import { cn } from "@/lib/utils";

// A date-format option bag is not interface copy, but written inside a render hole the
// raw-UI scan reads every string literal there as a child text node — four hits on the
// fixture line. Hoisting it is the remedy the profile screen used at M170 and the Landing
// page at M164: a format specifier is not a word a visitor reads. It is handed to the
// date door rather than to `toLocaleString`, so the fixture time is written the way the
// reader's own language writes it instead of the browser's.
const KICKOFF_TIME: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

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
  const { t, locale } = useI18n();
  const { state } = useOs();
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const matches = useMemo(() => footballProvider.matches(), []);

  const favComp = state.profile?.favoriteCompetitionId
    ?? (state.profile?.favoriteClubId ? getClub(state.profile.favoriteClubId)?.competitionId : undefined);
  const [compId, setCompId] = useState<string>(favComp && competitions.some((c) => c.id === favComp) ? favComp : competitions[0]?.id ?? "");
  const [picked, setPicked] = useState<string | null>(null);

  const metrics = useMemo(() => teamMetrics(compId, matches, clubs), [compId, matches, clubs]);
  // M336: the competition's finished-match count comes from the domain, which already counts
  // the list its own figures are measured over. This used to be
  // `metrics.reduce((s, m) => s + m.played, 0) / 2 | 0` — a sum the page had to halve, which is
  // only right while the sum is even, and floors to one short of the truth for a competition
  // sitting mid-round.
  const playedCount = useMemo(() => finishedCount(compId, matches), [compId, matches]);
  const lead = useMemo(() => leaders(metrics), [metrics]);
  const comp = getCompetition(compId);
  const pickedTeam = metrics.find((m) => m.clubId === picked) ?? null;
  const clash = metrics.length >= 2 ? { top: metrics[0], second: metrics[1], xg: expectedGoals(metrics[0], metrics[1]) } : null;

  // Closed-form Poisson forecast over the competition's own scheduled fixtures,
  // using attack/defence ratings computed from the matches actually played.
  const forecast = useMemo(() => {
    const byId = new Map(metrics.map((m) => [m.clubId, m]));
    return matches
      .filter((m) => m.competitionId === compId && m.status === "SCHEDULED")
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
      .map((m) => {
        const h = byId.get(m.homeClubId);
        const a = byId.get(m.awayClubId);
        if (!h || !a || h.played < 2 || a.played < 2) return null;
        const odds = outcomeOdds(h, a);
        return { match: m, odds, pct: oddsPercents(odds), sample: Math.min(h.played, a.played) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .slice(0, 4);
  }, [matches, metrics, compId]);

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
        <StatTile label={t("data.bestForm")} value={lead.bestForm ? getClub(lead.bestForm.clubId)?.short ?? "–" : "–"} sub={lead.bestForm ? t("data.sub.formPts", { n: formPoints(lead.bestForm) }) : undefined} tone="up" />
        <StatTile label={t("data.topAttack")} value={lead.strongestAttack ? getClub(lead.strongestAttack.clubId)?.short ?? "–" : "–"} sub={lead.strongestAttack ? t("data.sub.ratingAvg", { n: lead.strongestAttack.attack.toFixed(2) }) : undefined} />
        <StatTile label={t("data.topDefence")} value={lead.bestDefence ? getClub(lead.bestDefence.clubId)?.short ?? "–" : "–"} sub={lead.bestDefence ? t("data.sub.ratingAvg", { n: lead.bestDefence.defence.toFixed(2) }) : undefined} />
        <StatTile label={t("data.topScoring")} value={lead.highestScoring ? `${lead.highestScoring.gfAvg.toFixed(2)}` : "–"} sub={lead.highestScoring ? t("data.sub.goalsPerGame", { club: getClub(lead.highestScoring.clubId)?.short ?? "" }) : undefined} />
      </div>

      {!metrics.length ? (
        <Panel className="p-4"><EmptyState title={t("data.empty")} icon="▤" hint={t("data.emptyHint")} /></Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Panel className="p-0">
            <div className="flex items-center justify-between px-4 pt-4">
              <SectionTitle title={comp?.name ?? ""} hint={t("data.matchesPlayed", { n: playedCount })} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2 text-center">#</th>
                    <th className="px-2 py-2">{t("common.club")}</th>
                    <th className="px-2 py-2 text-center">{t("data.th.p")}</th>
                    <th className="px-2 py-2 text-center">{t("data.th.w")}</th>
                    <th className="px-2 py-2 text-center">{t("data.th.d")}</th>
                    <th className="px-2 py-2 text-center">{t("data.th.l")}</th>
                    <th className="px-2 py-2 text-center">{t("data.th.gd")}</th>
                    <th className="px-2 py-2 text-center">{t("data.th.pts")}</th>
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
                    <Link to={`/clubs/${pickedTeam.clubId}`} className="text-xs text-primary hover:underline">{t("data.clubPage")}</Link>
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
                  <Mini label={t("data.goals")} value={pickedTeam.gf} />
                  <Mini label={t("data.conceded")} value={pickedTeam.ga} />
                  <Mini label={t("data.cleanSheets")} value={pickedTeam.cleanSheets} />
                </div>
              </Panel>
            ) : (
              <Panel className="p-4">
                <EmptyState title={t("data.selectTeam")} icon="⌖" hint={t("data.pickHint")} />
              </Panel>
            )}

            {clash && (
              <Panel className="p-4">
                <SectionTitle title={t("data.modelClash")} hint={t("data.modelClashHint")} />
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2"><Crest colors={getClub(clash.top.clubId)?.colors} short={getClub(clash.top.clubId)?.short} size={24} /><span className="truncate">{getClub(clash.top.clubId)?.short}</span></span>
                  <span className="font-mono text-base font-semibold tabular-nums">{clash.xg.home} – {clash.xg.away}</span>
                  <span className="flex items-center gap-2"><span className="truncate text-right">{getClub(clash.second.clubId)?.short}</span><Crest colors={getClub(clash.second.clubId)?.colors} short={getClub(clash.second.clubId)?.short} size={24} /></span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">{t("data.clashLine", { home: getClub(clash.top.clubId)?.name ?? "", away: getClub(clash.second.clubId)?.name ?? "" })}</p>
              </Panel>
            )}
          </div>
        </div>
      )}

      {forecast.length > 0 && (
        <Panel className="p-4">
          <SectionTitle
            title={t("data.forecastTitle")}
            hint={t("data.forecastHint", {
              n: forecast.length,
              avg: metrics[0]?.leagueAvg.toFixed(2) ?? "–",
            })}
          />
          <div className="mt-3 space-y-3">
            {forecast.map(({ match, odds, pct, sample }) => {
              const h = getClub(match.homeClubId);
              const a = getClub(match.awayClubId);
              return (
                <div key={match.id} className="rounded-lg border bg-card/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <Link to={`/matches/${match.id}`} className="flex items-center gap-2 hover:text-primary">
                      <Crest colors={h?.colors} short={h?.short} size={20} />
                      <span className="truncate font-medium">{h?.name}</span>
                      <span className="text-xs text-muted-foreground">{t("common.vs")}</span>
                      <span className="truncate font-medium">{a?.name}</span>
                      <Crest colors={a?.colors} short={a?.short} size={20} />
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatDate(locale, match.kickoff, KICKOFF_TIME)}
                    </span>
                  </div>
                  <div className="mt-2 flex h-2 w-full overflow-hidden rounded">
                    <div className="bg-primary" style={{ width: `${pct.home}%` }} />
                    <div className="bg-muted-foreground/40" style={{ width: `${pct.draw}%` }} />
                    <div className="bg-info" style={{ width: `${pct.away}%` }} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span><span className="font-mono text-foreground">{pct.home}%</span> {h?.short}</span>
                    <span><span className="font-mono text-foreground">{pct.draw}%</span> {t("data.draw")}</span>
                    <span><span className="font-mono text-foreground">{pct.away}%</span> {a?.short}</span>
                    <span>{t("common.xg")} {odds.lambdaHome.toFixed(2)}–{odds.lambdaAway.toFixed(2)}</span>
                    <span>{t("data.totalGoals", { n: odds.expectedTotalGoals.toFixed(2) })}</span>
                    <span>{t("data.mostLikely", { score: odds.mostLikelyScore, pct: Math.round(odds.mostLikelyPct * 100) })}</span>
                    <span>{t(sample === 1 ? "data.sampleOne" : "data.sampleMany", { n: sample })}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">{t("data.forecastNote")}</p>
        </Panel>
      )}

      <p className="text-[11px] text-muted-foreground">{t("data.disclaimer")}</p>
    </div>
  );
}

function SplitCard({ title, s }: { title: string; s: TeamMetrics["home"] }) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border bg-card/50 p-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="mt-1 font-mono text-xs tabular-nums">{s.won}-{s.drawn}-{s.lost}</div>
      <div className="text-[11px] text-muted-foreground">{t("data.splitLine", { gf: s.gf, ga: s.ga, p: s.played })}</div>
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
