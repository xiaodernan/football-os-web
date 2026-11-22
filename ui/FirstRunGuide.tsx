// The first-run guide (M1230): six coach-marks that walk a brand-new visitor across the main
// board once. A spotlight ring frames the control the step is about, the card teaches it in one
// or two sentences, and the whole thing is dismissible and replayable — a guide you cannot leave
// is a jail, not a tutorial. Every number and sentence comes from domain/firstRunGuide.ts and
// the dictionary; this file only draws.
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { useLocalStorage } from "@/lib/hooks";
import { useRouter } from "@/lib/router";
import { browserStore, readJson } from "@/domain/localData";
import {
  TOUR_KEY, currentStep, initialTour, parseTour, tourAdvance, tourBack, tourProgress, tourSkip,
  type TourState,
} from "@/domain/firstRunGuide";
import { Button } from "@/components/ui/button";

export function FirstRunGuide() {
  const { t } = useI18n();
  const { path } = useRouter();
  const [state, setState] = useLocalStorage<TourState>(TOUR_KEY, initialTour());
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = currentStep(state);
  const progress = tourProgress(state);

  // Frame the step's own control: measured on step change, on resize and on scroll (the board is
  // long, and a ring that does not follow the scroll teaches nothing). A step whose target is not
  // on screen — the mode switch inside the closed mobile drawer, say — falls back to a centred
  // card rather than a ring around nothing.
  useEffect(() => {
    if (!step?.target) { setRect(null); return; }
    const measure = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step?.target]);

  // The guide is one singleton mounted in the shell, but its key can be rewritten by another
  // surface while it is mounted — the settings row's replay, or the palette's, both of which
  // then land on the board. A storage write in the same tab updates nobody's React state, so the
  // guide re-reads the key on every route change (and on the cross-tab storage event), adopting
  // the new value when it differs. Without this, a replay would only take effect after a reload.
  useEffect(() => {
    const adopt = () => setState((prev) => {
      const stored = parseTour(readJson(browserStore(), TOUR_KEY, initialTour()).value);
      return JSON.stringify(stored) === JSON.stringify(prev) ? prev : stored;
    });
    adopt();
    window.addEventListener("storage", adopt);
    return () => window.removeEventListener("storage", adopt);
  }, [path, setState]);

  // Escape dismisses for good — the same promise the Skip button makes.
  useEffect(() => {
    if (!step) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setState(tourSkip); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, setState]);

  if (!step || !progress) return null;
  const last = progress.n === progress.of;

  return (
    // Non-modal by design: the dim and the spotlight frame the step's control, but the page
    // underneath stays clickable — a guide you cannot click out of is a jail, not a tutorial.
    // (The modal attribute is deliberately absent; the card alone takes the pointer.)
    <div className="pointer-events-none fixed inset-0 z-[60]" role="dialog" aria-label={t(step.titleKey)}>
      {/* The dim. A spotlight ring carves the step's control out of it when there is one. */}
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all"
          style={{
            left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.66)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/60" />
      )}

      {/* The card: under the ring when there is room, over it otherwise, centred for a whole-board
          step. */}
      <div
        className="pointer-events-auto absolute left-1/2 w-80 -translate-x-1/2 rounded-xl border border-border bg-popover p-4 shadow-2xl"
        style={rect
          ? { top: Math.min(rect.bottom + 14, window.innerHeight - 210) }
          : { top: "50%", transform: "translate(-50%, -50%)" }}
      >
        <div className="text-[10px] uppercase tracking-widest text-primary">
          {t("guide.kicker", { n: progress.n, of: progress.of })}
        </div>
        <h2 className="mt-1 text-base font-bold">{t(step.titleKey)}</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{t(step.bodyKey)}</p>
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setState(tourSkip)}>{t("guide.skip")}</Button>
          {progress.n > 1 && (
            <Button size="sm" variant="outline" onClick={() => setState(tourBack)}>{t("guide.back")}</Button>
          )}
          <Button size="sm" className="ml-auto" onClick={() => setState(tourAdvance)}>
            {last ? t("guide.finish") : t("guide.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
