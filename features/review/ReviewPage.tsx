import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useRouter } from "@/lib/router";
import { useI18n } from "@/i18n";
import { useOs, levelInfo } from "@/store/useFootballOS";
import { buildReview, type WeeklyReview } from "@/domain/review";
import { deltaSign } from "@/domain/attributes";
import type { DeltaSign } from "@/domain/attributes";
import { rowLine } from "@/domain/rowText";
import { VIDEO_KIND_KEY } from "@/data/video";
import { attributeGoalTitle } from "@/domain/goals";
import { useLearnRecords, useFilmClips } from "@/lib/hooks";
import { DEMO_MODE } from "@/data/footballService";
import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";
import type { TileTone } from "@/ui/primitives";
import { ProgressLine } from "@/ui/charts";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {cn, signed, DAY_MS, pctOf, fmt2, ABSENT } from "@/lib/utils";

const WINDOWS = [7, 30, 90];

// The tone a change in a player's overall is shown in. The QUESTION — which way does the change
// point — is the domain's (attributes.ts's deltaSign, which the comparison page and the entity
// detail ask too); the tile's tones are this screen's own.
const DELTA_TILE: Record<DeltaSign, TileTone> = {
  up: "up",
  down: "down",
  flat: "neutral",
};

const TONE: Record<WeeklyReview["insights"][number]["kind"], string> = {
  positive: CHIP_CLASS.success,
  watch: CHIP_CLASS.warning,
  plan: CHIP_CLASS.primary,
};

export function ReviewPage() {
  const { t } = useI18n();
  const { state, requestPlan, addGoal } = useOs();
  const { navigate } = useRouter();
  const [days, setDays] = useState(7);
  const [compiling, setCompiling] = useState(false);
  const [building, setBuilding] = useState(false);
  const [rev, setRev] = useState(0);
  const learn = useLearnRecords(rev);
  const film = useFilmClips(rev);

  const review = useMemo(
    () =>
      state.profile
        ? buildReview({
            nowMs: Date.now(),
            windowDays: days,
            sessions: state.sessions,
            goals: state.goals,
            progress: state.progress,
            attributes: state.profile.attributes,
            streak: state.streak.current,
            learn: learn.map((l) => ({ at: l.completedAt, quizCorrect: l.quizCorrect })),
            film,
          })
        : null,
    [state, days, learn, film],
  );

  const info = state.profile ? levelInfo(state.profile.xp) : null;

  const recompyle = () => {
    setCompiling(true);
    setRev((r) => r + 1);
    window.setTimeout(() => setCompiling(false), 420);
  };

  const buildForRecommendation = async () => {
    const key = review?.recommendation?.attributeKey;
    if (!key || building) return;
    setBuilding(true);
    try {
      const plan = await requestPlan({ key: "rv.recoPrompt" }, 30, [key]);
      toast.success(
        t("common.buildDone", { m: plan.session.targetMinutes, n: plan.session.exercises.length }),
      );
      navigate("/player/training");
    } catch {
      toast.error(t("common.buildError"));
    } finally {
      setBuilding(false);
    }
  };

  const recoKey = review?.recommendation?.attributeKey;
  const recoTracked = !!recoKey && state.goals.some((g) => g.metric === "attribute" && g.key === recoKey);
  const trackRecommendation = () => {
    const reco = review?.recommendation;
    if (!reco || !state.profile || recoTracked) return;
    const current = Math.round(state.profile.attributes[reco.attributeKey] ?? 0);
    const target = Math.min(99, current + 5);
    addGoal({
      title: attributeGoalTitle(reco.attributeKey),
      metric: "attribute",
      key: reco.attributeKey,
      target,
      current,
    });
    toast.success(t("rv.trackDone", { a: t(`attr.name.${reco.attributeKey}`), t: target }));
  };

  const points = useMemo(() => {
    if (!state.profile) return [];
    const from = Date.now() - days * DAY_MS;
    const win = state.progress
      .filter((p) => new Date(p.date).getTime() >= from)
      .slice(0, 30);
    return win.map((p, i) => ({ label: `${i}`, value: Math.round(p.overall) }));
  }, [state.progress, days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            {t("rv.title")} {DEMO_MODE && <DemoBadge />}
          </h1>
          <p className="text-sm text-muted-foreground">{t("rv.subtitle")}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setDays(w)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                days === w ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/50",
              )}
            >
              {t("rv.window", { n: w })}
            </button>
          ))}
          <Button size="sm" variant="outline" onClick={recompyle} disabled={compiling}>
            {compiling ? t("rv.compiling") : t("rv.recompile")}
          </Button>
        </div>
      </div>

      {!state.profile || !review ? (
        <Panel className="p-4">
          <EmptyState title={t("rv.noProfileTitle")} hint={t("rv.noProfileHint")} icon="▤" />
          <div className="mt-4 flex justify-center">
            <Button onClick={() => navigate("/onboarding")}>{t("rv.start")}</Button>
          </div>
        </Panel>
      ) : !review.hasData ? (
        <Panel className="p-4">
          <EmptyState title={t("rv.emptyTitle")} hint={t("rv.emptyHint")} icon="◷" />
          <div className="mt-4 flex justify-center">
            <Button onClick={() => navigate("/player/coach")}>{t("rv.goCoach")}</Button>
          </div>
        </Panel>
      ) : (
        <div className={cn("space-y-4 transition-opacity", compiling && "pointer-events-none opacity-60")}>
          {/* confidence strip */}
          <Panel className="p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="font-medium">{t("rv.basedOn")} · {t("rv.window", { n: review.windowDays })}</div>
              <div className="text-xs text-muted-foreground">
                {t("rv.confidence")} <span className="font-mono text-primary">{review.confidence}%</span>
              </div>
            </div>
            <Progress value={review.confidence} className="mt-2" />
          </Panel>

          {/* headline stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            <StatTile label={t("rv.statSessions")} value={review.completed} sub={`${review.planned} ${t("rv.planned")} · ${review.missed} ${t("rv.missed")}`} />
            <StatTile label={t("rv.statMinutes")} value={review.minutes} sub={t("rv.minutesUnit")} />
            <StatTile label={t("rv.statXp")} value={signed(review.xpGained)} tone="up" sub={info ? `${t("common.level")} ${info.level}` : undefined} />
            <StatTile label={t("rv.streak")} value={`${review.streak}d`} />
            <StatTile
              label={t("rv.overall")}
              value={review.overallEnd ?? ABSENT}
              tone={DELTA_TILE[deltaSign(review.overallDelta ?? 0)]}
              sub={review.overallDelta != null ? `${review.overallStart ?? ABSENT} → ${review.overallEnd ?? ABSENT}` : t("rv.noChange")}
            />
            <StatTile label={t("rv.quality")} value={review.avgRating ?? ABSENT} sub={review.avgRating != null ? t("rv.outOf5") : t("rv.noRating")} />
            <StatTile label={t("rv.statAcademy")} value={review.lessonsCompleted} sub={t("rv.statAcademyPassed", { n: review.lessonsMastered })} />
            <StatTile
              label={t("rv.statFilm")}
              value={review.filmClips || ABSENT}
              sub={
                review.filmClips
                  ? `${t("rv.statFilmMinutes", { n: review.filmMinutes })} · ${fmt2(review.filmScanRate)} ${t("rv.scansPerMin")}`
                  : t("rv.noFilm")
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* insights */}
            <Panel className="p-4 lg:col-span-2">
              <SectionTitle title={t("rv.highlights")} />
              <div className="mt-2 space-y-2">
                {review.insights.map((ins, i) => (
                  <div key={i} className={cn("rounded-lg border px-3 py-2 text-sm", TONE[ins.kind])}>
                    {rowLine(ins.text, t)}
                  </div>
                ))}
              </div>

              {points.length > 1 && (
                <div className="mt-4">
                  <div className="mb-1 text-xs text-muted-foreground">{t("rv.growthCurve")}</div>
                  <ProgressLine points={points} height={120} />
                </div>
              )}
            </Panel>

            {/* recommendation + focus */}
            <div className="space-y-4">
              <Panel className="p-4">
                <SectionTitle title={t("rv.recoTitle")} hint={t("rv.recoHint")} />
                {review.recommendation ? (
                  <div className="mt-1">
                    <div className="text-sm font-medium text-primary">{t(`attr.name.${review.recommendation.attributeKey}`)}</div>
                    <p className="mt-1 text-sm">{rowLine(review.recommendation.reason, t)}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{t("rv.confidence")}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${review.recommendation.confidence}%` }} />
                      </div>
                      <span className="font-mono">{review.recommendation.confidence}%</span>
                    </div>
                    <Button size="sm" className="mt-3 w-full" onClick={buildForRecommendation} disabled={building}>
                      {building ? t("common.buildBusy") : t("rv.planForIt")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={trackRecommendation}
                      disabled={recoTracked}
                    >
                      {recoTracked ? t("rv.trackedCta") : t("rv.trackCta")}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("rv.recoEmpty")}</p>
                )}
              </Panel>

              <Panel className="p-4">
                <SectionTitle title={t("rv.focusMix")} />
                {review.topFocus.length ? (
                  <div className="mt-2 space-y-2">
                    {review.topFocus.map((f) => {
                      const max = review.topFocus[0].sessions || 1;
                      return (
                        <div key={f.key}>
                          <div className="flex justify-between text-xs">
                            <span>{t(`attr.name.${f.key}`)}</span>
                            <span className="font-mono text-muted-foreground">×{f.sessions}</span>
                          </div>
                          <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-muted">
                            <div className="h-full bg-primary" style={{ width: pctOf(f.sessions, max) }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{t("rv.focusEmpty")}</p>
                )}
              </Panel>

              {review.attributeGains.length > 0 && (
                <Panel className="p-4">
                  <SectionTitle title={t("rv.gainsTitle")} hint={t("rv.gainsHint")} />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {review.attributeGains.map((g) => (
                      <span key={g.key} className={cn("rounded-md border px-2 py-1 text-xs font-medium", CHIP_CLASS.success)}>
                        {t(`attr.name.${g.key}`)} <span className="font-mono">+{g.delta}</span>
                      </span>
                    ))}
                  </div>
                </Panel>
              )}
              {review.filmClips > 0 && (
                <Panel className="p-4">
                  <SectionTitle title={t("rv.filmTitle")} hint={t("rv.filmHint")} />
                  <div className="mt-2 space-y-2">
                    {review.filmKinds.map((k) => {
                      const max = review.filmKinds[0].perMinute || 1;
                      return (
                        <div key={k.kind}>
                          <div className="flex justify-between text-xs">
                            <span className="capitalize">{t(VIDEO_KIND_KEY[k.kind])}</span>
                            <span className="font-mono text-muted-foreground">
                              {fmt2(k.perMinute)} {t("rv.filmPerMin")} · ×{k.count}
                            </span>
                          </div>
                          <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-muted">
                            <div className="h-full bg-primary" style={{ width: pctOf(k.perMinute, max) }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {review.filmFocus.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">{t("rv.filmFocus")}:</span>
                      {review.filmFocus.map((f) => (
                        <span key={f.key} className="rounded-md border px-2 py-0.5 text-[11px] text-muted-foreground">
                          {t(`attr.name.${f.key}`)} ×{f.clips}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {review.filmDetections} {t("rv.filmDetections")} · {review.filmConfidence}% {t("rv.filmConfidence")}
                    {review.filmScanTrend != null && (
                      <>
                        {" · "}
                        {t("rv.filmTrend")} {signed(review.filmScanTrend)}
                      </>
                    )}
                  </p>
                </Panel>
              )}
            </div>
          </div>

          {/* evidence + sources */}
          <Panel className="p-4">
            <SectionTitle title={t("common.evidence")} hint={t("rv.evidenceHint")} />
            <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              {review.evidence.map((e, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-primary">›</span>
                  <span>{rowLine(e, t)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>{t("rv.sources")}:</span>
              {review.sources.map((s, i) => (
                <span key={i} className="rounded border px-1.5 py-0.5">{rowLine(s, t)}</span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{t("rv.disclaimer")}</p>
          </Panel>

          <div className="flex flex-wrap gap-2">
            <Link to="/player/progress" className="text-xs text-primary hover:underline">{t("rv.linkProgress")} →</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/history" className="text-xs text-primary hover:underline">{t("rv.linkHistory")} →</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/achievements" className="text-xs text-primary hover:underline">{t("rv.linkAchievements")} →</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/film" className="text-xs text-primary hover:underline">{t("rv.linkFilm")} →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
