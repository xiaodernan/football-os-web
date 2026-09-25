import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/lib/router";
import { useI18n } from "@/i18n";
import { useOs } from "@/store/useFootballOS";
import { videoProvider } from "@/data/video";
import { attributeLabel } from "@/domain/attributes";
import { buildFilmInsights, type FilmEventKind } from "@/domain/filmInsights";
import { loadFilmClips, saveFilmClips, toClipInputs, type FilmClip } from "@/domain/filmLibrary";
import { useOnline } from "@/lib/hooks";
import { Panel, SectionTitle, EmptyState, LoadingBlock, ErrorState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Film Room (spec §19): the video analysis pipeline as its own pillar. Clips are
// analysed by the swappable videoProvider (Demo provider runs the same stages over
// a deterministic file fingerprint — never impersonating a real pose model) and the
// resulting reports are kept in a local library so you can compare across sessions.

const STAGES = ["Uploading", "Extracting frames", "Detecting players", "Pose / movement", "Event detection", "AI analysis"];

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
  const { t } = useI18n();
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
        setError(new Error("Complete onboarding so the analysis can reference your attributes."));
        return;
      }
      setBusy(true);
      setError(null);
      setProgress(0);
      try {
        for (let i = 0; i < STAGES.length; i++) {
          await new Promise((r) => setTimeout(r, 240));
          setProgress(Math.round(((i + 1) / STAGES.length) * 100));
        }
        const fileId = `${file.name}-${file.size}`;
        const report = await videoProvider.analyze({ fileId, fileName: file.name, sizeBytes: file.size, attrs: state.profile.attributes });
        const clip: FilmClip = { clipId: `${Date.now()}`, addedAt: new Date().toISOString(), report };
        setClips((c) => [clip, ...c]);
        setSelected(clip.clipId);
        toast.success("Clip analysed (demo provider)");
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Analysis failed"));
      } finally {
        setBusy(false);
        setProgress(0);
      }
    },
    [state.profile],
  );

  const remove = (clipId: string) => {
    setClips((c) => c.filter((x) => x.clipId !== clipId));
    if (selected === clipId) setSelected(clips.find((x) => x.clipId !== clipId)?.clipId ?? null);
  };

  const current = useMemo(() => clips.find((c) => c.clipId === selected) ?? null, [clips, selected]);

  const insights = useMemo(() => buildFilmInsights(toClipInputs(clips)), [clips]);

  const buildTraining = async () => {
    if (!current || planning) return;
    const keys = current.report.recommendedFocus;
    if (!keys.length) {
      toast.error("This clip didn't flag a focus to train.");
      return;
    }
    const focus = keys.map(attributeLabel).join(" and ");
    setPlanning(true);
    try {
      const plan = await requestPlan(
        `Film review flagged: ${current.report.improvements[0]}. Build a session on ${focus}.`,
        30,
        keys,
      );
      toast.success(
        `Training built from this clip — ${plan.session.targetMinutes}′ · ${plan.session.exercises.length} blocks on ${focus}.`,
      );
      navigate("/player/training");
    } catch {
      toast.error("Couldn't build training from this clip. Try again.");
    } finally {
      setPlanning(false);
    }
  };

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
          {busy ? t("film.analysing") : "Analyse a clip"}
        </Button>
      </div>

      {!online && (
        <div className="rounded-lg border border-info/40 bg-info/10 px-3 py-2 text-xs text-info">{t("film.offline")}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Library */}
        <Panel className="p-3">
          <SectionTitle title={t("film.library")} hint={`${clips.length} clip${clips.length === 1 ? "" : "s"}`} />
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
            <p className="mt-1">Drop a video here</p>
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
                      {c.report.durationSec}s · {c.report.confidence}% · {new Date(c.addedAt).toLocaleDateString()}
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
              <div className="mt-3 text-xs text-muted-foreground">{STAGES[Math.min(STAGES.length - 1, Math.floor((progress / 100) * STAGES.length))]}…</div>
              <LoadingBlock rows={4} />
            </Panel>
          ) : !current ? (
            <Panel className="p-4">
              <EmptyState title={t("film.reportEmpty")} icon="▶" hint="Analyse a clip to see strengths, weaknesses, evidence frames and a recommended focus." />
            </Panel>
          ) : (
            <>
              <Panel className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{current.report.fileName}</div>
                    <div className="text-xs text-muted-foreground">
                      Provider {current.report.provider} · {current.report.durationSec}s · {current.report.events.length} events detected
                    </div>
                  </div>
                  <Badge variant="outline" className="border-warning/40 text-warning">
                    {current.report.demo ? "DEMO" : "LIVE"} · {current.report.confidence}% conf
                  </Badge>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-success">Strengths</div>
                    <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{current.report.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-destructive">Weaknesses</div>
                    <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{current.report.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-primary">Top improvements</div>
                    <ol className="mt-1 list-decimal pl-5 text-xs text-muted-foreground">{current.report.improvements.map((s, i) => <li key={i}>{s}</li>)}</ol>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={buildTraining} disabled={planning}>{planning ? "Building…" : "Build a training from this →"}</Button>
                  <span className="self-center text-[11px] text-muted-foreground">Recommended focus: {current.report.recommendedFocus.map((k) => t(`attr.name.${k}`)).join(", ")}</span>
                </div>
              </Panel>

              <Panel className="p-4">
                <SectionTitle title={t("film.events")} hint="Event timeline with per-detection confidence" />
                <div className="space-y-1.5">
                  {current.report.events.map((ev, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary/40">
                      <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{ev.t}s</span>
                      <span className={cn("w-16 shrink-0 text-xs font-semibold uppercase", KIND_TONE[ev.kind])}>{ev.kind}</span>
                      <span className="min-w-0 flex-1 truncate">{ev.note}</span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{Math.round(ev.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel className="p-4">
                <SectionTitle title={t("film.frames")} />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {current.report.frames.map((f, i) => (
                    <div key={i} className="grid aspect-video place-items-center rounded bg-gradient-to-br from-secondary to-card p-2 text-center text-[10px] text-muted-foreground">
                      {f.label}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  No real pose model is bundled. The demo provider runs the same pipeline over a deterministic fingerprint of your upload and is labelled DEMO — it never impersonates a live model.
                </p>
              </Panel>
            </>
          )}
        </div>
      </div>

      {clips.length > 0 && (
        <Panel className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle title="Library insights" hint={`${insights.clips} clips · ${insights.analysedMinutes.toFixed(1)} min analysed`} />
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <DemoBadge />
              <span>Confidence {insights.confidence}%</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">Actions / min</div><div className="font-mono text-sm">{insights.actionsPerMinute.toFixed(2)}</div></div>
            <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">Scans / min</div><div className="font-mono text-sm">{insights.scanPerMinute.toFixed(2)}</div></div>
            <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">Scan trend</div><div className={cn("font-mono text-sm", insights.scanTrend == null ? "text-muted-foreground" : insights.scanTrend >= 0 ? "text-success" : "text-destructive")}>{insights.scanTrend == null ? "—" : `${insights.scanTrend >= 0 ? "+" : ""}${insights.scanTrend.toFixed(2)}`}</div></div>
            <div className="rounded-md border bg-card/30 px-2 py-1.5"><div className="text-muted-foreground">Mean detect conf.</div><div className="font-mono text-sm">{insights.avgConfidence}%</div></div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Detections per minute by type</div>
              <div className="mt-2 space-y-2">
                {insights.byKind.filter((k) => k.count > 0).map((k) => {
                  const max = insights.byKind[0].perMinute || 1;
                  return (
                    <div key={k.kind}>
                      <div className="flex justify-between text-xs">
                        <span className={KIND_TONE[k.kind]}>{k.kind}</span>
                        <span className="font-mono text-muted-foreground">{k.perMinute.toFixed(2)} · ×{k.count}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${Math.max(3, (k.perMinute / max) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
                {!insights.byKind.some((k) => k.count > 0) && <p className="text-xs text-muted-foreground">No detections in the library yet.</p>}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Recurring coaching focus</div>
              {insights.topFocus.length ? (
                <ul className="mt-2 space-y-1.5 text-xs">
                  {insights.topFocus.map((f) => (
                    <li key={f.key} className="flex items-center justify-between gap-2">
                      <span>{t(`attr.name.${f.key}`)}</span>
                      <span className="font-mono text-muted-foreground">×{f.clips} clip{f.clips === 1 ? "" : "s"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No recommended focus recorded yet.</p>
              )}
              <div className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">Evidence</div>
              <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                {insights.evidence.map((e, i) => <li key={i}>› {e}</li>)}
              </ul>
              <div className="mt-2 text-[11px] text-muted-foreground">Sources: {insights.sources.join(" · ")}</div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Aggregated only from clips stored on this device. Rates are detections per minute of analysed footage; the demo provider's detections are labelled DEMO and are not real pose-model output.</p>
        </Panel>
      )}
    </div>
  );
}
