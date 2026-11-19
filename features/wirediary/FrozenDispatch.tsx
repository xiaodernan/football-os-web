// M1199 · The Frozen Dispatch — the frozen century's own wire desk. Three lenses on the seed's
// own fold; each taps ONE imprisoned model call through the same shared callLlmStream door the
// rest of the world uses; the fold re-proves every numeral before print. Never free prose.
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";
import { cn } from "@/lib/utils";
import type { ReleaseBadge } from "@/domain/releaseArtifact";
import { LLM_CONFIG, callLlmStream, withWorldBook } from "@/data/llm";
import { footballProvider } from "@/data/footballService";
import {
  createFrozenDispatch,
  dispatchBuild,
  dispatchCommit,
  dispatchPrecommit,
  dispatchPreflight,
  dispatchRefused,
  retrieveFrozen,
  verifyFrozenText,
  frozenFolds,
  FROZEN_ASKS,
  type FrozenAskId,
  type DispatchTraceEntry,
} from "@/domain/frozenDispatch";

export function FrozenDispatch() {
  const { t, locale } = useI18n();
  const [askId, setAskId] = useState<FrozenAskId>("summit");
  const [answer, setAnswer] = useState("");
  const [trace, setTrace] = useState<readonly DispatchTraceEntry[] | null>(null);
  const [violations, setViolations] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [badge, setBadge] = useState<ReleaseBadge | null>(null);

  // Building the fold is deterministic work; memoize per ask selection.
  const foldLens = useMemo(() => retrieveFrozen(askId, frozenFolds(footballProvider)), [askId]);

  const foldFallback = (): string =>
    [t("frozenDispatch.fold.intro"), ...foldSummary(askId)].join("\n");

  const foldSummary = (lens: FrozenAskId): string[] => {
    const env = foldLens as { competitions: { name: string; summit?: readonly (readonly [number, string, number, number, number, number, number])[]; gap?: number; runs?: readonly (readonly [number, string, number, string])[] }[] };
    if (lens === "summit") {
      return env.competitions.slice(0, 5).map((c) => `- ${c.name}: ${c.summit?.[0]?.[1] ?? "?"}. ${c.summit?.[0]?.[2] ?? 0} pts.`);
    }
    if (lens === "chase") {
      return env.competitions.slice(0, 5).map((c) => `- ${c.name}: gap ${c.gap ?? 0}`);
    }
    return env.competitions.slice(0, 5).map((c) => `- ${c.name}: ${c.runs?.[0]?.[3] ?? "-"}`);
  };

  const run = async (lens: FrozenAskId) => {
    if (busy) return;
    setAskId(lens);
    setBusy(true);
    setAnswer("");
    setViolations(null);
    setBadge(null);
    const desk = dispatchBuild(dispatchPreflight(createFrozenDispatch(lens, locale)));
    setTrace(desk.trace);
    if (!LLM_CONFIG.hasKey) {
      const folded = dispatchRefused(desk, foldFallback());
      setTrace(folded.trace);
      setAnswer(foldFallback());
      setBadge("offline");
      setBusy(false);
      return;
    }
    const envelope = retrieveFrozen(lens, frozenFolds(footballProvider));
    const system = withWorldBook([
      "You are the frozen dispatcher of Football OS — the seeded world's wire desk.",
      "Answer ONLY from the envelope below (the seed's own numbers).",
      "NEVER invent a numeral, pool club name, a competition name or a result the envelope does not carry.",
      "Never predict the future. Keep the answer in the visitor's language, at most 120 words.",
      "",
      "ENVELOPE:",
      JSON.stringify(envelope, null, 2),
    ].join("\n"));
    const result = await callLlmStream(t(`frozenDispatch.ask.${lens}`), [], (delta) => setAnswer((prev) => prev + delta), { system });
    if (result.ok) {
      const violations = verifyFrozenText(result.text, envelope);
      if (violations.length === 0) {
        const committed = dispatchCommit(dispatchPrecommit(desk, "pass"), result.text);
        setTrace(committed.trace);
        setAnswer(result.text);
        setBadge("verified");
        setBusy(false);
        return;
      }
      setViolations(violations);
      const folded = dispatchRefused(dispatchPrecommit(desk, "refused"), foldFallback());
      setTrace(folded.trace);
      setAnswer(foldFallback());
      setBadge("folded");
      setBusy(false);
      return;
    }
    const folded = dispatchRefused(desk, foldFallback());
    setTrace(folded.trace);
    setAnswer(foldFallback());
    setBadge("offline");
    setBusy(false);
  };

  return (
    <div className="space-y-5 print:hidden">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-sun -right-16 -top-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-orb fo-orb-bronze -left-16 -bottom-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("frozenDispatch.kicker")}</div>
          <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">{t("frozenDispatch.title")}</h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("frozenDispatch.subtitle")}</p>
          <span className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest", LLM_CONFIG.hasKey ? CHIP_CLASS.badgeInfoStrong : CHIP_CLASS.warning)}>
            {LLM_CONFIG.hasKey && <span aria-hidden className="fo-live-dot inline-flex h-1.5 w-1.5 rounded-full bg-info" />}
            {LLM_CONFIG.hasKey ? t("ai.via.live", { model: LLM_CONFIG.model }) : t("ai.via.local")}
          </span>
        </div>
      </header>

      <Panel className="p-5">
        <div className="flex flex-wrap gap-2">
          {FROZEN_ASKS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => void run(id)}
              disabled={busy}
              aria-label={t(`frozenDispatch.ask.${id}`)}
              className="fo-lift rounded-lg border px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-muted disabled:opacity-60"
            >
              {t(`frozenDispatch.ask.${id}`)}
            </button>
          ))}
        </div>
        {answer && <p aria-live="polite" className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>}
        {badge && (
          <span className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest", badge === "verified" ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.badgeWarning)}>
            {badge === "verified" ? t("library.door.badge.verified") : badge === "folded" ? t("library.door.badge.folded") : t("library.door.badge.fallback")}
          </span>
        )}
        {violations && violations.length > 0 && (
          <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-warning">{violations.map((v) => t(`frozenDispatch.violation.${v}`)).join(" | ")}</p>
        )}
        {trace && (
          <div className="mt-4 border-t border-border/60 pt-3">
            <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("library.door.trace.label")}</p>
            <div className="flex flex-wrap gap-1">
              {trace.map((entry) => (
                <span
                  key={entry.stage}
                  title={t(`library.door.note.${entry.note}`)}
                  className={cn(
                    "rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-widest",
                    entry.verdict === "pass" ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.badgeWarning,
                  )}
                >
                  {t(`manual.librarian.stage.${entry.stage}`)}
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="mt-3 text-[10px] text-muted-foreground">{t("frozenDispatch.method")}</p>
      </Panel>
    </div>
  );
}
