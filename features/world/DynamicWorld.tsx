import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { positionLabel } from "@/domain/rowText";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider, getClub, getCompetition } from "@/data/footballService";
import { fmtMoney, pctLabel, signed, ABSENT, fmt2, pctOf, cn, SEPARATOR } from "@/lib/utils";
import { runWorld, seasonLabel, buildSeasonReport, seasonReportPayload, type WorldInput, type SeasonStep } from "@/domain/worldEngine";
import { sum, last } from "@/domain/attributes";
import { leagueOpenness, worldUpsets, worldLeaders, worldRescues } from "@/domain/analytics";
import { dynastyTable } from "@/domain/dynasty";
import { devCouncil } from "@/domain/devCouncil";
import { rowLine } from "@/domain/rowText";
import { WORLD_KEY, browserStore, readJson, writeJson } from "@/domain/localData";
import { round1 } from "@/domain/scouting";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, LoadingBlock, ErrorState, DemoBadge, CHIP_CLASS, BAR_FILL } from "@/ui/primitives";
import { ProgressLine } from "@/ui/charts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STORE_KEY = WORLD_KEY;

function loadElapsed(): number {
  // M331: through the door. `browserStore()` answers null for a document that is not allowed
  // one — reading the `localStorage` accessor itself throws `SecurityError` there — and
  // `readJson` keeps a corrupt row from being read as a number of seasons.
  const { value, present } = readJson<{ seasonsElapsed?: unknown } | null>(browserStore(), STORE_KEY, null);
  if (!present || !value) return 0;
  const n = Number(value.seasonsElapsed);
  return Number.isFinite(n) && n >= 0 && n < 60 ? Math.floor(n) : 0;
}

export function DynamicWorld() {
  const { t } = useI18n();
  const [elapsed, setElapsed] = useState<number>(() => loadElapsed());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    // M331: through the door, so a refused write is answered rather than swallowed.
    writeJson(browserStore(), STORE_KEY, { seasonsElapsed: elapsed });
  }, [elapsed]);

  const base = useMemo<WorldInput>(
    () => ({
      players: footballProvider.players(),
      clubs: footballProvider.clubs(),
      competitions: footballProvider.competitions(),
    }),
    [],
  );

  const worldMatches = useMemo(() => footballProvider.matches(), []);
  // M990: the world's most open leagues, ranked over every fixture the seed carries.
  const openness = useMemo(() => leagueOpenness(worldMatches), [worldMatches]);
  const opennessPeak = openness.rows.length ? Math.max(...openness.rows.map((r) => r.perMatch)) : 1;
  // M991: the widest away win of the world, read off the same finished matches.
  const upsets = useMemo(() => worldUpsets(worldMatches, footballProvider.clubs()), [worldMatches]);
  // M994: the world's league leaders — every competition has a table; name who stands first.
  const leaders = useMemo(() => worldLeaders(worldMatches, footballProvider.clubs()), [worldMatches]);
  // M1041: the rescued results — the fixtures a side took from behind on the recorded goal clock.
  const rescues = useMemo(() => worldRescues(worldMatches), [worldMatches]);

  const snapshot = useMemo(() => {
    try {
      setError(null);
      return runWorld(base, elapsed);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Simulation failed"));
      return null;
    }
  }, [base, elapsed, nonce]);

  const advance = useCallback(() => {
    setBusy(true);
    // Brief async beat so the simulate action shows a real loading state.
    window.setTimeout(() => {
      setElapsed((n) => n + 1);
      setBusy(false);
    }, 450);
  }, []);

  const latest: SeasonStep | undefined = snapshot ? last(snapshot.history) : undefined;
  const history: SeasonStep[] = snapshot?.history ?? [];
  // M525: the whole-run report, read from the same snapshot the panels above render —
  // one simulation, one set of numbers.
  const report = useMemo(
    () => (snapshot && snapshot.history.length ? buildSeasonReport(base, snapshot) : null),
    [base, snapshot],
  );
  // M1031: the counting houses — every champion crown counted per (club, competition) pair.
  const dynasties = useMemo(() => dynastyTable(history), [history]);
  // M1033: the coaching council — which clubs' squads actually grew across the simulated run.
  const council = useMemo(() => devCouncil(history), [history]);
  const councilPeak = council.rows.length ? council.rows[0].upDelta : 1;

  const exportReport = useCallback(() => {
    if (!snapshot) return;
    const payload = seasonReportPayload(base, snapshot);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `season-report-${elapsed}s.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(t("world.report.exported", { seasons: elapsed }));
  }, [snapshot, base, elapsed, t]);

  const avgNow = latest?.avgOverall ?? round1(sum(base.players, (p) => p.overall) / base.players.length);
  const marketNow = latest?.marketTotal ?? sum(base.players, (p) => p.value);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{t("world.title")}</h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("world.subtitle")} · {seasonLabel(elapsed)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setElapsed(0)} disabled={elapsed === 0}>
            {t("common.reset")}
          </Button>
          <Button size="sm" onClick={advance} disabled={busy || elapsed >= 60}>
            {busy ? t("world.simulating") : t("world.advance")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("world.seasons")} value={elapsed} sub={seasonLabel(elapsed)} />
        <StatTile label={t("world.squad")} value={snapshot ? snapshot.players.length : base.players.length} sub={t("world.sub.tracked")} />
        <StatTile label={t("world.avgOvr")} value={avgNow} tone={latest && latest.developments.length ? "up" : "neutral"} />
        <StatTile label={t("world.market")} value={fmtMoney(marketNow)} sub={t("world.sub.market")} />
      </div>

      {!snapshot ? (
        <ErrorState error={error} retry={() => setNonce((n) => n + 1)} />
      ) : busy ? (
        <Panel className="p-4"><LoadingBlock rows={4} /></Panel>
      ) : elapsed === 0 ? (
        <Panel className="p-4">
          <EmptyState title={t("world.emptyTitle")} icon="⏱" hint={t("world.emptyHint")} />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel className="p-4">
            <SectionTitle title={t("world.champions")} hint={latest?.label} />
            <div className="divide-y">
              {latest?.champions.map((c) => (
                <div key={c.compId} className="flex items-center gap-3 py-2.5">
                  <Crest colors={getClub(c.clubId)?.colors} short={getClub(c.clubId)?.short} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.clubName}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.compName}</div>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{t("world.pts", { points: c.points })}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <SectionTitle title={t("world.developments")} hint={t("world.dev.hint")} />
            {latest && latest.developments.length ? (
              <div className="space-y-1.5">
                {latest.developments.map((d) => (
                  <PlayerDelta key={d.id} name={d.name} clubId={d.clubId} from={d.from} to={d.to} delta={d.delta} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("world.dev.empty")}</p>
            )}
            {latest && latest.declines.length > 0 && (
              <>
                <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">{t("world.declines")}</div>
                <div className="mt-1.5 space-y-1.5">
                  {latest.declines.map((d) => <PlayerDelta key={d.id} name={d.name} clubId={d.clubId} from={d.from} to={d.to} delta={d.delta} />)}
                </div>
              </>
            )}
          </Panel>

          <Panel className="p-4">
            <SectionTitle title={t("world.prospects")} hint={t("world.prospects.hint")} />
            {latest && latest.prospects.length ? (
              <div className="space-y-1.5">
                {latest.prospects.slice(0, 10).map((p) => (
                  <Link key={p.id} to={`/clubs/${p.clubId}`} className="flex items-center justify-between rounded-lg px-1 py-1.5 text-sm hover:bg-secondary/40">
                    <span className="truncate">{p.name} <span className="text-xs text-muted-foreground">· {positionLabel(p.position, t)} · {p.age}</span></span>
                    <span className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-muted-foreground">{p.overall}</span>
                      <Badge variant="outline" className={CHIP_CLASS.badgeSuccess}>→ {p.potential}</Badge>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("world.prospects.empty")}</p>
            )}
          </Panel>

          <Panel className="p-4">
            <SectionTitle title={t("world.retired")} hint={t("world.retired.hint")} />
            {latest && latest.retired.length ? (
              <div className="space-y-1.5">
                {latest.retired.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg px-1 py-1.5 text-sm">
                    <span className="truncate">{r.name} <span className="text-xs text-muted-foreground">· {getClub(r.clubId)?.name ?? r.clubId}</span></span>
                    <span className="font-mono text-xs text-muted-foreground">{t("world.ageOvr", { age: r.age, ovr: r.to })}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("world.retired.empty")}</p>
            )}
          </Panel>

          <Panel className="p-4">
            <SectionTitle title={t("world.history.title")} hint={t("world.history.hint")} />
            {history.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-48">
                    <ProgressLine points={history.map((s) => ({ label: s.label, value: s.avgOverall }))} />
                  </div>
                  <div className="h-48">
                    <ProgressLine points={history.map((s) => ({ label: s.label, value: s.marketTotal }))} />
                  </div>
                </div>
                <div className="mt-4 space-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">{t("world.history.champions")}</span>
                  </div>
                  {history.slice().reverse().map((s) => (
                    <div key={s.index} className="flex items-center justify-between text-sm border-b border-b-border/50 pb-1 last:border-0">
                      <span className="font-mono text-muted-foreground">{s.label}</span>
                      <div className="flex items-center gap-2">
                        {s.champions.map((c) => (
                          <span key={c.compId} className="truncate min-w-0">
                            {c.clubName} · {c.compName} <span className="text-muted-foreground">{t("world.pts", { points: c.points })}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("world.history.empty")}</p>
            )}
          </Panel>

          {/* M1031: the counting houses — every champion crown counted per (club, competition) pair. */}
          <Panel className="p-4 lg:col-span-2">
            <SectionTitle title={t("world.dynastyTitle")} hint={t("world.dynastyHint")} />
            {dynasties.seasons === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("world.dynastyNone")}</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("world.dynastyWorld", { seasons: dynasties.seasons, n: dynasties.titles, clubs: dynasties.rows.length })}
                </p>
                <ul className="mt-2 space-y-1">
                  {dynasties.rows.map((r) => {
                    const club = getClub(r.clubId);
                    return (
                      <li
                        key={`${r.clubId}|${r.compId}`}
                        className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[2rem_1fr_auto]"
                      >
                        <Link to={`/clubs/${r.clubId}`} className="flex min-w-0 items-center gap-2 hover:underline">
                          <Crest colors={club?.colors} short={club?.short} size={22} />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{club?.name ?? r.clubName}</div>
                            <div className="text-xs text-muted-foreground">{getCompetition(r.compId)?.name ?? r.compName}</div>
                          </div>
                        </Link>
                        <div className="text-right font-mono text-lg font-bold tabular-nums">{r.titles}</div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{t("world.dynastyMethod")}</p>
              </>
            )}
          </Panel>

          {/* M1033: the coaching council — which clubs' squads actually grew across the simulated run. */}
          <Panel className="p-4 lg:col-span-2">
            <SectionTitle title={t("world.coachCouncilTitle")} hint={t("world.coachCouncilHint")} />
            {council.seasons === 0 || council.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("world.coachCouncilNone")}</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("world.coachCouncilWorld", { seasons: council.seasons, n: council.totalUp, clubs: council.rows.length })}
                </p>
                <ul className="mt-2 space-y-1">
                  {council.rows.map((r, i) => {
                    const club = getClub(r.clubId);
                    return (
                      <li
                        key={r.clubId}
                        className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto_minmax(110px,200px)]"
                      >
                        <span className="text-muted-foreground">{i + 1}</span>
                        <Link to={`/clubs/${r.clubId}`} className="flex min-w-0 items-center gap-2 hover:underline">
                          <Crest colors={club?.colors} short={club?.short} size={22} />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                            <div className="text-xs text-muted-foreground">
                              {t("world.coachLine", { p: r.developed, a: r.avgDelta, g: r.bestName, d: r.bestDelta })}
                            </div>
                          </div>
                        </Link>
                        <div className="text-right tabular-nums">
                          <div className="font-semibold">+{r.upDelta}</div>
                          <div className="text-xs text-muted-foreground">{t("world.coachUp")}</div>
                        </div>
                        <div className="hidden sm:block">
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className={cn("h-2 rounded-full", BAR_FILL.good)} style={{ width: pctOf(r.upDelta, councilPeak) }} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{t("world.coachCouncilMethod")}</p>
              </>
            )}
          </Panel>

          {/* M990: which leagues are decided in the open — goals per finished fixture, every
              competition ranked against every other, with the world's own rate printed first. */}
          <Panel className="p-4 lg:col-span-2">
            <SectionTitle title={t("world.opennessTitle")} hint={t("world.opennessHint")} />
            <p className="mt-2 text-xs text-muted-foreground">
              {t("world.opennessWorld", { g: openness.goals, n: openness.matches, p: fmt2(openness.global) })}
            </p>
            <ul className="mt-2 grid gap-2">
              {openness.rows.map((r, i) => (
                <li
                  key={r.competitionId}
                  className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[2rem_1fr_auto_auto] sm:grid-cols-[2rem_1fr_auto_auto_minmax(90px,180px)]"
                >
                  <span className="text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{getCompetition(r.competitionId)?.name ?? r.competitionId}</div>
                    <div className="text-xs text-muted-foreground">{t("world.opennessLine", { n: r.matches, g: r.goals })}</div>
                  </div>
                  <div className="text-right tabular-nums">
                    {fmt2(r.perMatch)}
                    <div className="text-xs text-muted-foreground">{t("world.opennessPerMatch")}</div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className={cn("h-2 rounded-full", BAR_FILL.info)} style={{ width: pctOf(r.perMatch, opennessPeak) }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          {/* M991: the widest away win of the world, and the strength-order break — the
              away end's two wildest escapes, drawn from the same finished fixtures. */}
          <Panel className="p-4 lg:col-span-2">
            <SectionTitle title={t("world.upsTitle")} hint={t("world.upsHint")} />
            {!upsets.biggestUpset && <p className="mt-3 text-sm text-muted-foreground">{t("world.upsNone")}</p>}
            {upsets.biggestUpset && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { label: t("world.upsUpset"), row: upsets.biggestUpset, caption: t("world.upsUpsetSub", { n: Math.max(0, upsets.biggestUpset.deficit) }) },
                  { label: t("world.upsAway"), row: upsets.biggestAwayWin!, caption: t("world.upsAwaySub", { n: upsets.biggestAwayWin!.margin }) },
                ].map((tile, tileIndex) => {
                  const home = getClub(tile.row.homeClubId);
                  const away = getClub(tile.row.awayClubId);
                  return (
                    <div key={tileIndex} className="rounded-lg border p-3">
                      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{tile.label}</div>
                      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Crest colors={home?.colors} short={home?.short} size={24} />
                          <span className="min-w-0 truncate text-sm font-medium">{home?.name ?? tile.row.homeClubId}</span>
                        </div>
                        <div className="font-mono text-2xl font-bold tabular-nums">
                          {tile.row.homeGoals}{SEPARATOR}{tile.row.awayGoals}
                        </div>
                        <div className="flex min-w-0 items-center justify-end gap-2">
                          <span className="min-w-0 truncate text-sm font-medium">{away?.name ?? tile.row.awayClubId}</span>
                          <Crest colors={away?.colors} short={away?.short} size={24} />
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-primary">{tile.caption}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {upsets.biggestUpset && <p className="mt-3 text-xs text-muted-foreground">{t("world.upsMethod")}</p>}
          </Panel>

          {/* M994: the world's league leaders — every competition has a table; name who stands first. */}
          <Panel className="p-4 lg:col-span-2">
            <SectionTitle title={t("world.leadersTitle")} hint={t("world.leadersHint")} />
            {leaders.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("world.leadersNone")}</p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {leaders.rows.map((r) => {
                  const comp = getCompetition(r.competitionId);
                  const club = r.leaderId ? getClub(r.leaderId) : null;
                  if (!club) return null;
                  return (
                    <Link
                      key={r.competitionId}
                      to={`/clubs/${club.id}`}
                      className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs hover:border-primary/40"
                    >
                      <Crest colors={club.colors} short={club.short} size={22} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{club.short}</span>
                        <span className="block text-[10px] text-muted-foreground">{comp?.name ?? r.competitionId}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* M1041: the rescued results — the fixtures a side took from behind on the recorded
              goal clock, widest hole first, then the earlier escape. */}
          <Panel className="p-4 lg:col-span-2">
            <SectionTitle title={t("world.rescuesTitle")} hint={t("world.rescuesHint")} />
            {rescues.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("world.rescuesNone")}</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("world.rescuesWorld", { n: rescues.replayed, r: rescues.rescued, p: fmt2(rescues.share) })}
                </p>
                <ul className="mt-2 space-y-1">
                  {rescues.rows.map((r) => {
                    const home = getClub(r.homeClubId);
                    const away = getClub(r.awayClubId);
                    const rescuerName = r.rescuer === "home"
                      ? (home?.name ?? r.homeClubId)
                      : (away?.name ?? r.awayClubId);
                    return (
                      <li key={r.matchId} className="rounded-lg border px-3 py-2">
                        <Link to={`/matches/${r.matchId}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 hover:underline">
                          <span className="flex min-w-0 items-center gap-2">
                            <Crest colors={home?.colors} short={home?.short} size={22} />
                            <span className="truncate text-sm font-medium">{home?.name ?? r.homeClubId}</span>
                          </span>
                          <span className="font-mono text-lg font-bold tabular-nums">
                            {r.homeGoals}{SEPARATOR}{r.awayGoals}
                          </span>
                          <span className="flex min-w-0 items-center justify-end gap-2">
                            <span className="truncate text-sm font-medium">{away?.name ?? r.awayClubId}</span>
                            <Crest colors={away?.colors} short={away?.short} size={22} />
                          </span>
                        </Link>
                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <span className="truncate text-muted-foreground">{getCompetition(r.competitionId)?.name ?? r.competitionId}</span>
                          <span className="text-primary">{t("world.rescuesRow", { s: rescuerName, n: r.deficit, m: r.turnMinute })}</span>
                          <Badge variant="outline" className={r.held ? CHIP_CLASS.muted : CHIP_CLASS.badgeSuccess}>
                            {r.held ? t("world.rescuesDrew") : t("world.rescuesWon")}
                          </Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{t("world.rescuesMethod")}</p>
              </>
            )}
          </Panel>

          {report && (
            <Panel className="p-4 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SectionTitle title={t("world.report.title")} hint={t("world.report.hint")} />
                <Button variant="outline" size="sm" onClick={exportReport}>
                  {t("world.report.export")}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile
                  label={t("world.report.dynastyWord")}
                  value={report.dynasties[0]?.titles ?? 0}
                  sub={report.dynasties[0]?.clubName ?? t("world.report.noDynasty")}
                />
                <StatTile
                  label={t("world.report.retiredWord")}
                  value={report.totalRetired}
                  sub={t("world.report.prospectsSub", { n: report.totalProspects })}
                />
                <StatTile
                  label={t("world.report.riseWord")}
                  value={report.rise ? signed(report.rise.delta) : ABSENT}
                  sub={report.rise?.name}
                  tone={report.rise ? "up" : "neutral"}
                />
                <StatTile
                  label={t("world.report.fallWord")}
                  value={report.fall ? signed(report.fall.delta) : ABSENT}
                  sub={report.fall?.name}
                  tone={report.fall ? "down" : "neutral"}
                />
                <StatTile
                  label={t("world.report.marketGrowth")}
                  value={pctLabel(report.marketGrowth)}
                  sub={t("world.report.avgGrowthSub", { n: signed(report.avgGrowth) })}
                />
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-1 pr-3 font-medium">{t("world.report.th.season")}</th>
                      <th className="py-1 pr-3 font-medium">{t("world.report.th.topPoints")}</th>
                      <th className="py-1 pr-3 font-medium">{t("world.report.th.risers")}</th>
                      <th className="py-1 pr-3 font-medium">{t("world.report.th.fallers")}</th>
                      <th className="py-1 pr-3 font-medium">{t("world.report.th.prospects")}</th>
                      <th className="py-1 pr-3 font-medium">{t("world.report.th.retired")}</th>
                      <th className="py-1 font-medium">{t("world.report.th.marketStep")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r) => (
                      <tr key={r.index} className="border-t border-border/40">
                        <td className="py-1.5 pr-3 font-mono text-xs text-muted-foreground">{r.label}</td>
                        <td className="py-1.5 pr-3 tabular-nums">{r.topPoints}</td>
                        <td className="py-1.5 pr-3 tabular-nums">{r.risers}</td>
                        <td className="py-1.5 pr-3 tabular-nums">{r.fallers}</td>
                        <td className="py-1.5 pr-3 tabular-nums">{r.prospectCount}</td>
                        <td className="py-1.5 pr-3 tabular-nums">{r.retiredCount}</td>
                        <td className="py-1.5 tabular-nums">{r.index === 1 ? ABSENT : pctLabel(r.marketStep)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="mt-3 space-y-0.5 text-[11px] text-muted-foreground">
                {report.evidence.map((e, i) => <li key={i}>› {rowLine(e, t)}</li>)}
              </ul>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {t("common.sources")}: {report.sources.map((src) => rowLine(src, t)).join(" · ")}
              </p>
            </Panel>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {t("world.disclaimer")}
      </p>
    </div>
  );
}

function PlayerDelta({ name, clubId, from, to, delta }: { name: string; clubId: string; from: number; to: number; delta: number }) {
  const up = delta > 0;
  return (
    <div className="flex items-center justify-between rounded-lg px-1 py-1 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <Crest colors={getClub(clubId)?.colors} short={getClub(clubId)?.short} size={22} />
        <span className="truncate">{name}</span>
      </span>
      <span className="flex items-center gap-2 font-mono text-xs">
        <span className="text-muted-foreground">{from}</span>
        <span>→</span>
        <span className="font-semibold tabular-nums">{to}</span>
        <span className={up ? "text-success" : "text-destructive"}>{up ? "+" : ""}{delta}</span>
      </span>
    </div>
  );
}
