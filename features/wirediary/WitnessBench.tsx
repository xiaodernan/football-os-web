// M1217 · The Witness Bench — the thirteenth imprisoned LLM door.
// One callLlmStream, one envelope, one verifier — and one new thing: the model's own
// output drives the graph. ABSTAIN as the opening word walks the FSM to the refused arm;
// otherwise every numeral is re-proved before the graph is allowed to commit.
import { useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";
import { cn } from "@/lib/utils";
import { LLM_CONFIG, callLlmStream, withWorldBook } from "@/data/llm";
import {
  benchAbstained,
  benchBuild,
  benchCommit,
  benchEnvelope,
  benchModel,
  benchPrecommit,
  benchPreflight,
  benchRefused,
  benchRoute,
  createBench,
  verifyBenchText,
  WITNESS_LENSES,
  type BenchTraceEntry,
  type WitnessLens,
} from "@/domain/witnessBench";

type BenchBadge = "verified" | "folded" | "abstained" | "offline";

export function WitnessBench() {
  const { t, locale } = useI18n();
  const [answer, setAnswer] = useState("");
  const [trace, setTrace] = useState<readonly BenchTraceEntry[] | null>(null);
  const [violations, setViolations] = useState<readonly string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [badge, setBadge] = useState<BenchBadge | null>(null);

  // The fold answers the lens that was actually asked — never a canned crown summary.
  const foldFallback = (lens: WitnessLens): string =>
    [t("witnessBench.fold.intro"), ...foldSummary(benchEnvelope(lens))].join("\n");

  const foldSummary = (envelope: object): string[] => {
    const env = envelope as { competitions: { name: string; summit?: readonly (readonly [number, string, number, number, number, number, number])[]; gap?: number; runs?: readonly (readonly [number, string, number, string])[] }[] };
    return env.competitions.slice(0, 5).map((c) => `- ${c.name}: ${c.summit?.[0]?.[1] ?? "?"} ${c.summit?.[0]?.[2] ?? 0} pts · gap ${c.gap ?? 0} · ${c.runs?.[0]?.[3] ?? "-"}`);
  };

  const run = async (lens: WitnessLens) => {
    if (busy) return;
    setBusy(true);
    setAnswer("");
    setViolations(null);
    setBadge(null);
    const desk = benchBuild(benchPreflight(createBench(lens, locale)));
    setTrace(desk.trace);

    if (!LLM_CONFIG.hasKey) {
      const folded = benchRefused(desk, foldFallback(lens));
      setTrace(folded.trace);
      setAnswer(foldFallback(lens));
      setBadge("offline");
      setBusy(false);
      return;
    }

    const envelope = benchEnvelope(lens);
    const system = withWorldBook([
      "You are the Witness Bench of Football OS — a witness, never a prophet.",
      "Speak ONLY from the envelope below, in the visitor's language, at most 90 words.",
      "Every numeral you write must appear in this envelope. Never invent a club, a competition, a result or a future tense.",
      "If the envelope cannot support a truthful sentence, write exactly ABSTAIN and nothing else.",
      "Otherwise write one plain paragraph. No lists, no headers.",
      "",
      "ENVELOPE:",
      JSON.stringify(envelope, null, 2),
    ].join("\n"));

    const result = await callLlmStream(t(`witnessBench.ask.${lens}`), [], (delta) => setAnswer((prev) => prev + delta), { system });
    if (!result.ok) {
      const folded = benchRefused(desk, foldFallback(lens));
      setTrace(folded.trace);
      setAnswer(foldFallback(lens));
      setBadge("offline");
      setBusy(false);
      return;
    }

    // The model's very first word is a graph edge, not decoration.
    const route = benchRoute(result.text);
    const routed = benchModel(desk, route);
    if (route === "abstain") {
      const abstained = benchAbstained(routed, foldFallback(lens));
      setTrace(abstained.trace);
      setAnswer(foldFallback(lens));
      setBadge("abstained");
      setBusy(false);
      return;
    }

    const found = verifyBenchText(result.text, envelope);
    if (found.length === 0) {
      const committed = benchCommit(benchPrecommit(routed, "pass"), result.text);
      setTrace(committed.trace);
      setAnswer(result.text);
      setBadge("verified");
      setBusy(false);
      return;
    }

    setViolations(found);
    const folded = benchRefused(benchPrecommit(routed, "refused"), foldFallback(lens));
    setTrace(folded.trace);
    setAnswer(foldFallback(lens));
    setBadge("folded");
    setBusy(false);
  };

  return (
    <div className="space-y-5 print:hidden">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-violet -right-16 -top-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-orb fo-orb-cyan -left-16 -bottom-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("witnessBench.kicker")}</div>
          <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">{t("witnessBench.title")}</h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("witnessBench.subtitle")}</p>
          <span className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest", LLM_CONFIG.hasKey ? CHIP_CLASS.badgeInfoStrong : CHIP_CLASS.warning)}>
            {LLM_CONFIG.hasKey && <span aria-hidden className="fo-live-dot inline-flex h-1.5 w-1.5 rounded-full bg-info" />}
            {LLM_CONFIG.hasKey ? t("ai.via.live", { model: LLM_CONFIG.model }) : t("ai.via.local")}
          </span>
        </div>
      </header>

      <Panel className="p-5">
        <p className="mb-3 text-[10px] text-muted-foreground">{t("witnessBench.hint")}</p>
        <div className="flex flex-wrap gap-2">
          {WITNESS_LENSES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => void run(id)}
              disabled={busy}
              aria-label={t(`witnessBench.ask.${id}`)}
              className="fo-lift rounded-lg border px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-muted disabled:opacity-60"
            >
              {t(`witnessBench.ask.${id}`)}
            </button>
          ))}
        </div>
        {answer && <p aria-live="polite" className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>}
        {badge && (
          <span className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest", badge === "verified" ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.badgeWarning)}>
            {badge === "verified" ? t("library.door.badge.verified") : badge === "folded" ? t("library.door.badge.folded") : badge === "abstained" ? t("witnessBench.badge.abstained") : t("library.door.badge.fallback")}
          </span>
        )}
        {violations && violations.length > 0 && (
          <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-warning">{violations.map((v) => t(`witnessBench.violation.${v}`)).join(" | ")}</p>
        )}
        {trace && (
          <div className="mt-4 border-t border-border/60 pt-3">
            <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("library.door.trace.label")}</p>
            <div className="flex flex-wrap gap-1">
              {trace.map((entry, index) => (
                <span
                  key={`${entry.stage}-${index}`}
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
        <p className="mt-3 text-[10px] text-muted-foreground">{t("witnessBench.method")}</p>
      </Panel>
    </div>
  );
}
