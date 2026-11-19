// M1201 · The Frozen Diary — the frozen century's own newspaper, print-ready, model-spoken, fold-proved.
// The diary was armed at release time by scripts/update-frozen-diary.mjs: one paragraph per
// competition, every numeral re-proved against public/frozen-fold.json before it was committed.
// This screen renders it exactly as it ships; nothing is generated in the visitor's browser.
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { PANEL_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchReleaseArtifact, type ReleaseStatus } from "@/domain/releaseArtifact";
import { isFrozenDiaryPayload, type FrozenDiaryPayload } from "@/domain/frozenDiary";
import { PrinterIcon } from "lucide-react";

export function FrozenDiary() {
  const { t } = useI18n();
  const [payload, setPayload] = useState<FrozenDiaryPayload | null>(null);
  const [status, setStatus] = useState<ReleaseStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchReleaseArtifact(`${import.meta.env.BASE_URL}frozen-diary.json`, isFrozenDiaryPayload)
      .then((p) => {
        if (cancelled) return;
        if (p && isFrozenDiaryPayload(p)) { setPayload(p); setStatus("ready"); }
        else setStatus("absent");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [attempt]);

  return (
    <div className="space-y-5">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6 print:block", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-amber -right-16 -top-14 h-52 w-52 opacity-70 print:hidden" />
        <div aria-hidden className="fo-orb fo-orb-bronze -left-16 -bottom-14 h-52 w-52 opacity-70 print:hidden" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40 print:hidden" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("frozenDiary.kicker")}</div>
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent print:text-black sm:text-5xl">{t("frozenDiary.title")}</h1>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground print:text-black">{t("frozenDiary.subtitle")}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 print:hidden" onClick={() => window.print()} aria-label={t("frozenDiary.printHint")}>
            <PrinterIcon className="h-3.5 w-3.5" aria-hidden /> {t("frozenDiary.print")}
          </Button>
        </div>
      </header>

      {status === "loading" ? (
        <div className="grid gap-3" aria-label={t("frozenDiary.title")}>{[0, 1].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}</div>
      ) : null}

      {status === "error" || status === "absent" ? (
        <div className="p-6 text-center">
          <div className="text-sm font-semibold text-warning">{t("frozenDiary.errorTitle")}</div>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">{status === "error" ? t("frozenDiary.errorBody") : t("frozenDiary.absentBody")}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setAttempt((n) => n + 1)}>
            {t("frozenDiary.retry")}
          </Button>
        </div>
      ) : null}

      {status === "ready" && payload ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted-foreground print:text-black">
            <div className="font-mono tabular-nums">{t("frozenDiary.meta", { count: payload.diary.length })}</div>
            <div className="font-mono uppercase tracking-widest">{t("frozenDiary.tag")}</div>
            <div className="font-mono tabular-nums">{payload.by === "model" ? t("frozenDiary.byModel") : payload.by === "fold" ? t("frozenDiary.byFold") : t("frozenDiary.byMix")} · {payload.generatedAt.slice(0, 10)}</div>
          </div>
          <ol className="space-y-4 print:space-y-3">
            {payload.diary.map((article) => (
              <li key={article.competitionId} className={cn("rounded-2xl p-5 print:break-inside-avoid", PANEL_CLASS.panelGhost)}>
                <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2 print:border-black/30">
                  <div className="min-w-0">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-primary print:text-black">{article.nation} · {t("frozenDiary.tier", { tier: article.tier })}</div>
                    <h2 className="mt-0.5 truncate text-base font-bold tracking-tight text-foreground print:text-black">{article.competition}</h2>
                  </div>
                  <div className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-muted-foreground print:text-black/70">{article.by === "model" ? t("frozenDiary.byModel") : t("frozenDiary.byFold")}</div>
                </div>
                <div className="mt-3 space-y-2 text-[12px] leading-relaxed text-foreground print:text-black sm:columns-2 sm:gap-6">
                  {article.paragraphs.map((p, i) => (
                    <p key={i} className="break-inside-avoid text-foreground/90 print:text-black">{p}</p>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <p className="text-center text-[10px] text-muted-foreground">{t("frozenDiary.method")}</p>
        </>
      ) : null}
    </div>
  );
}
