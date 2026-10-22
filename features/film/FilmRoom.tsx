import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/lib/router";
import { newId } from "@/lib/ids";
import { formatDate, useI18n } from "@/i18n";
import { useOs } from "@/store/useFootballOS";
import { videoProvider } from "@/data/video";
import { VIDEO_KIND_KEY } from "@/data/video";
import { buildFilmInsights, type FilmEventKind } from "@/domain/filmInsights";
import { deltaSign } from "@/domain/attributes";
import { rowLine } from "@/domain/rowText";
import { loadFilmClips, saveFilmClips, toClipInputs, type FilmClip } from "@/domain/filmLibrary";
import { useOnline } from "@/lib/hooks";
import { Panel, SectionTitle, EmptyState, LoadingBlock, ErrorState, DemoBadge, DELTA_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {cn, pct, pctLabel, fmt2, fmt1, signed2, ABSENT } from "@/lib/utils";

// Film Room (spec §19): the video analysis pipeline as its own pillar. Clips are
// analysed by the swappable videoProvider (Demo provider runs the same stages over
// a deterministic file fingerprint — never impersonating a real pose model) and the
// resulting reports are kept in a local library so you can compare across sessions.

// The six pipeline stages are progress copy, but the line that shows them is derived
// from a percentage rather than chosen, so the label is resolved through the dictionary
// by code (`film.stage.*`) instead of being carried as English in this array. The codes
// are data; check 17 holds the dictionary against this list.
const STAGES = ["uploading", "extracting_frames", "detecting_players", "pose_movement", "event_detection", "ai_analysis"];

const KIND_TONE: Record<FilmEventKind, string> = {
  scan: "text-info",
  touch: "text-success",
  pass: "text-info",
  dribble: "text-warning",
  shot: "text-destructive",
  turn: "text-primary",
  press: "text-muted-foreground",
};

export function FilmRoom() {
  const { t, locale } = useI18n();
  const { state, requestPlan } = useOs();
  const { navigate } = useRouter();
  const online = useOnline();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);

  const [clips, setClips] = useState<FilmClip[]>(() => loadFilmClips());
  const [selected, setSelected] = useState<string | null>(() => loadFilmClips()[0]?.clipId ?? null);
  const [busy, setBusy] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    saveFilmClips(clips);
  }, [clips]);

  const analyze = useCallback(
    async (file: File) => {
      lastFileRef.current = file;
      if (!state.profile) {
        setError(new Error(t("common.err.needOnboarding")));
        return;
      }
      setBusy(true);
      setError(null);
      setProgress(0);
      try {
        for (let i = 0; i < STAGES.length; i++) {
          await new Promise((r) => setTimeout(r, 240));
          setProgress(pct((i + 1) / STAGES.length));
        }
        const fileId = `${file.name}-${file.size}`;
        const report = await videoProvider.analyze({ fileId, fileName: file.name, sizeBytes: file.size, attrs: state.profile.attributes });
        const clip: FilmClip = { clipId: newId("clip-"), addedAt: new Date().toISOString(), report };
        setClips((c) => [clip, ...c]);
        setSelected(clip.clipId);
        toast.success(t("film.toastAnalysed"));
      } catch (e) {
        setError(e instanceof Error ? e : new Error(t("common.err.analysisFailed")));
      } finally {
        setBusy(false);
        setProgress(0);
      }
    },
    [state.profile, t],
  );

  const remove = (clipId: string) => {
    setClips((c) => c.filter((x) => x.clipId !== clipId));
    if (selected === clipId) setSelected(clips.find((x) => x.clipId !== clipId)?.clipId ?? null);
  };

  const current = useMemo(() => clips.find((c) => c.clipId === selected) ?? null, [clips, selected]);

  const insights = useMemo(() => buildFilmInsights(toClipInputs(clips)), [clips]);

  // One derivation for the focus names the reader sees: the report panel and the
  // training toast must not spell the same list twice (and a second interpolation
  // site would be a second thing for check 16 to declare).
  const focusLocal = current
    ? current.report.recommendedFocus.map((k) => t(`attr.name.${k}`)).join(", ")
    : "";

  const buildTraining = async () => {
    if (!current || planning) return;
    const keys = current.report.recommendedFocus;
    if (!keys.length) {
      toast.error(t("film.toastNoFocus"));
      return;
    }
    // One row, two readings: the provider gets its English column (so `analyze` matches the
    // words it knows) and the reader gets their own — including on the activity timeline, which
    // used to show this sentence frozen in whatever language the button was clicked in. The
    // toast under it is read by a person and takes the dictionary's names directly.
    setPlanning(true);
    try {
      // The improvement travels as the KEY of the row the panel above prints, not as the
      // words: M231 made `improvement` a key-holding variable, so the timeline row and the
      // report list are one fact with two readings instead of an English sentence inside a
      // Chinese one. A clip stored before the report was rows holds a value row and no key,
      // and then the prompt simply does not claim an improvement.
      const flagged = current.report.improvements[0];
      const plan = await requestPlan(
        { key: "ai.filmAnalysisPrompt", vars: { improvement: flagged && "key" in flagged ? flagged.key : "", focus: keys.join(",") } },
        30,
        keys,
      );
      toast.success(
        t("film.toastBuilt", {
          min: plan.session.targetMinutes,
          n: plan.session.exercises.length,
          focus: focusLocal,
        }),
      );
      navigate("/player/training");
    } catch {
      toast.error(t("film.toastBuildFailed"));
    } finally {
      setPlanning(false);
    }
  };

  // Which of the six pipeline stages the progress line is on, resolved through the
  // dictionary by the STAGES code rather than printed from the English list.
  const stageKey = STAGES[Math.min(STAGES.length - 1, Math.floor((progress / 100) * STAGES.length))];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{t("film.title")}</h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("film.subtitle")}</p>
        </div>
        <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && analyze(e.target.files[0])} />
        <Button size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? t("film.analysing") : t("film.analyseClip")}
        </Button>
      </div>

      {!online && (
        <div className="rounded-lg border border-info/40 bg-info/10 px-3 py-2 text-xs text-info">{t("film.offline")}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Library */}
        <Panel className="p-3">
          <SectionTitle title={t("film.library")} hint={t(clips.length === 1 ? "film.libraryHintOne" : "film.libraryHintMany", { n: clips.length })} />
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) analyze(f);
            }}
            className="mb-3 grid place-items-center rounded-lg border-2 border-dashed px-3 py-5 text-center text-xs text-muted-foreground"
          >
            <div className="text-2xl opacity-40">⬆</div>
            <p className="mt-1">{t("film.dropHere")}</p>
          </div>
          {clips.length ? (
            <div className="space-y-1">
              {clips.map((c) => (
                <div
                  key={c.clipId}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    selected === c.clipId ? "bg-primary/10 text-foreground" : "hover:bg-secondary/50",
                  )}
                >
                  <button className="min-w-0 flex-1 text-left" onClick={() => setSelected(c.clipId)}>
                    <div className="truncate">{c.report.fileName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {c.report.durationSec}s · {c.report.confidence}% · {formatDate(locale, c.addedAt)}
                    </div>
                  </button>
                  <button aria-label={t("film.deleteClip")} onClick={() => remove(c.clipId)} className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title={t("film.emptyTitle")} icon="✂" hint={t("film.emptyHint")} />
          )}
        </Panel>

        {/* Report */}
        <div className="space-y-4">
          {error && <ErrorState error={error} retry={() => lastFileRef.current && analyze(lastFileRef.current)} />}
          {busy ? (
            <Panel className="p-4">
              <Progress value={progress} className="h-1.5" />
              <div className="mt-3 text-xs text-muted-foreground">{t(`film.stage.${stageKey}`)}…</div>
              <LoadingBlock rows={4} />
            </Panel>
          ) : !current ? (
            <Panel className="p-4">
              <EmptyState title={t("film.reportEmpty")} icon="▶" hint={t("film.reportHint")} />
            </Panel>
          ) : (
            <>
              <Panel className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{current.report.fileName}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("film.providerLine", {
                        provider: current.report.provider,
                        duration: current.report.durationSec,
                        events: current.report.events.length,
                      })}
                    </div>
                  </div>
                  <Badge variant="outline" className="border-warning/40 text-warning">
                    {t(current.report.demo ? "film.mode.demo" : "film.mode.live")} · {t("film.confidenceShort", { n: current.report.confidence })}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-success">{t("film.strengths")}</div>
                    <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{current.report.strengths.map((s, i) => <li key={i}>{rowLine(s, t)}</li>)}</ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-destructive">{t("film.weaknesses")}</div>
                    <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{current.report.weaknesses.map((s, i) => <li key={i}>{rowLine(s, t)}</li>)}</ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t("film.improvements")}</div>
                    <ol className="mt-1 list-decimal pl-5 text-xs text-muted-foreground">{current.report.improvements.map((s, i) => <li key={i}>{rowLine(s, t)}</li>)}</ol>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={buildTraining} disabled={planning}>{planning ? t("film.building") : t("film.buildTraining")}</Button>
                  <span className="self-center text-[11px] text-muted-foreground">{t("film.recommendedFocus", { focus: focusLocal })}</span>
                </div>
              </Panel>

              <Panel className="p-4">
                <SectionTitle title={t("film.events")} hint={t("film.timelineHint")} />
                <div className="space-y-1.5">
                  {current.report.events.map((ev, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary/40">
                      <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{ev.t}s</span>
                      <span className={cn("w-16 shrink-0 text-xs font-semibold uppercase", KIND_TONE[ev.kind])}>{t(VIDEO_KIND_KEY[ev.kind])}</span>
                      <span className="min-w-0 flex-1 truncate">{rowLine(ev.note, t)}</span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{pctLabel(ev.confidence)}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel className="p-4">
                <SectionTitle title={t("film.frames")} />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {current.report.frames.map((f, i) => (
                    <div key={i} className="grid aspect-video place-items-center rounded bg-gradient-to-br from-secondary to-card p-2 text-center text-[10px] text-muted-foreground">
                      {rowLine(f.label, t)}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">{t("film.demoDisclosure")}</p>
              </Panel>
            </>
          )}
        </div>
      </div>

      {clips.length > 0 && (
        <Panel className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle
              title={t("film.insightsTitle")}
              hint={t(insights.clips === 1 ? "film.insightsHintOne" : "film.insightsHintMany", {
                n: insights.clips,
                min: fmt1(insights.analysedMinutes),
              })}
            />
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <DemoBadge />
              <span>{t("film.confidence", { n: insights.confidence })}</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">{t("film.actionsPerMin")}</div><div className="font-mono text-sm">{fmt2(insights.actionsPerMinute)}</div></div>
            <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">{t("film.scansPerMin")}</div><div className="font-mono text-sm">{fmt2(insights.scanPerMinute)}</div></div>
            <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">{t("film.scanTrend")}</div><div className={cn("font-mono text-sm", DELTA_CLASS[deltaSign(insights.scanTrend ?? 0)])}>{insights.scanTrend == null ? ABSENT : signed2(insights.scanTrend)}</div></div>
            <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">{t("film.meanConf")}</div><div className="font-mono text-sm">{insights.avgConfidence}%</div></div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("film.byType")}</div>
              <div className="mt-2 space-y-2">
                {insights.byKind.filter((k) => k.count > 0).map((k) => {
                  const max = insights.byKind[0].perMinute || 1;
                  return (
                    <div key={k.kind}>
                      <div className="flex justify-between text-xs">
                        <span className={KIND_TONE[k.kind]}>{t(VIDEO_KIND_KEY[k.kind])}</span>
                        <span className="font-mono text-muted-foreground">{fmt2(k.perMinute)} · ×{k.count}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${Math.max(3, (k.perMinute / max) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
                {!insights.byKind.some((k) => k.count > 0) && <p className="text-xs text-muted-foreground">{t("film.noDetections")}</p>}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("film.recurringFocus")}</div>
              {insights.topFocus.length ? (
                <ul className="mt-2 space-y-1.5 text-xs">
                  {insights.topFocus.map((f) => (
                    <li key={f.key} className="flex items-center justify-between gap-2">
                      <span>{t(`attr.name.${f.key}`)}</span>
                      <span className="font-mono text-muted-foreground">{t(f.clips === 1 ? "film.focusClipsOne" : "film.focusClipsMany", { n: f.clips })}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">{t("film.noFocus")}</p>
              )}
              <div className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">{t("common.evidence")}</div>
              <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                {insights.evidence.map((e, i) => <li key={i}>› {rowLine(e, t)}</li>)}
              </ul>
              <div className="mt-2 text-[11px] text-muted-foreground">{t("film.sources", { list: insights.sources.map((s) => rowLine(s, t)).join(" · ") })}</div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">{t("film.aggregationNote")}</p>
        </Panel>
      )}
    </div>
  );
}
