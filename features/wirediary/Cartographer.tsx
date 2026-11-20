// M1219 · The Cartographer — door 14, the model-driven StateGraph branch.
// Door 13 let the model choose answer-or-abstain. Here the model ALSO chooses which lens
// the graph enters: one streamed call carries all three sealed Frozen Dispatch envelopes,
// the first line is a strict graph directive, and the body is still re-proved against the
// chosen envelope by the ONE shared numeral verifier before commit. No directive, no commit.
import { useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";
import { cn } from "@/lib/utils";
import { LLM_CONFIG, callLlmStream, withWorldBook } from "@/data/llm";
import {
  benchAbstained,
  benchBuild,
  benchCommit,
  benchCrossAbstained,
  benchCrossChose,
  benchCrossContested,
  benchCrossCorroborated,
  benchCrossRouteInvalid,
  benchEnvelope,
  benchModel,
  benchModelChose,
  benchModelRouteInvalid,
  benchPrecommit,
  benchPreflight,
  benchRefused,
  createBench,
  parseBenchDirective,
  parseCrossDirective,
  stripBenchDirective,
  stripCrossDirective,
  verifyBenchText,
  WITNESS_LENSES,
  type BenchState,
  type BenchTraceEntry,
  type WitnessLens,
} from "@/domain/witnessBench";

type MapBadge = "modelChosen" | "verified" | "folded" | "abstained" | "invalid" | "offline" | "corroborated" | "contested";

const foldSummary = (envelope: object): string[] => {
  const env = envelope as { competitions: { name: string; summit?: readonly (readonly [number, string, number, number, number, number, number])[]; gap?: number; runs?: readonly (readonly [number, string, number, string])[] }[] };
  return env.competitions.slice(0, 5).map((c) => `- ${c.name}: ${c.summit?.[0]?.[1] ?? "?"} ${c.summit?.[0]?.[2] ?? 0} pts · gap ${c.gap ?? 0} · ${c.runs?.[0]?.[3] ?? "-"}`);
};

export function Cartographer() {
  const { t, locale } = useI18n();
  const [answer, setAnswer] = useState("");
  const [trace, setTrace] = useState<readonly BenchTraceEntry[] | null>(null);
  const [violations, setViolations] = useState<readonly string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [badge, setBadge] = useState<MapBadge | null>(null);
  const [lens, setLens] = useState<WitnessLens | null>(null);
  const [deskState, setDeskState] = useState<BenchState | null>(null);
  const [crossBusy, setCrossBusy] = useState(false);
  const [crossLens, setCrossLens] = useState<WitnessLens | null>(null);

  const folded = (lens: WitnessLens): string =>
    [t("witnessBench.fold.intro"), ...foldSummary(benchEnvelope(lens))].join("\n");

  // One graph entry, one honest drawing of who chose the lens.
  const enter = (desk: BenchState, text: string, next: MapBadge) => {
    setDeskState(desk);
    setTrace(desk.trace);
    setAnswer(text);
    setBadge(next);
    setBusy(false);
  };

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setAnswer("");
    setViolations(null);
    setBadge(null);
    setLens(null);
    setDeskState(null);
    setCrossLens(null);

    if (!LLM_CONFIG.hasKey) {
      enter(benchRefused(benchBuild(benchPreflight(createBench("crown", locale))), folded("crown")), folded("crown"), "offline");
      return;
    }

    // The routing envelope is built from the SAME frozen shelves as door 13 — no new data,
    // no handwritten numbers, and the same byte-stable world-book prefix for the cache lane.
    const routingEnvelope = Object.fromEntries(WITNESS_LENSES.map((id) => [id, benchEnvelope(id)]));
    const system = withWorldBook([
      "You are the Cartographer of Football OS. You choose which lens the witness reads, then speak from it.",
      "FIRST LINE: exactly LENS:crown, LENS:chase or LENS:form — pick the lens whose sealed envelope best supports one truthful sentence. Or write ABSTAIN alone if none can.",
      "AFTER THAT: one plain paragraph, at most 90 words, in the visitor's language.",
      "Every numeral in the paragraph must appear in the CHOSEN envelope. Never invent a club, a competition, a result or a future tense.",
      "",
      "ROUTING ENVELOPE:",
      JSON.stringify(routingEnvelope, null, 2),
    ].join("\n"));

    const result = await callLlmStream(t("witnessBench.ask.model"), [], (delta) => setAnswer((prev) => prev + delta), { system });
    if (!result.ok) {
      enter(benchRefused(benchBuild(benchPreflight(createBench("crown", locale))), folded("crown")), folded("crown"), "offline");
      return;
    }

    const directive = parseBenchDirective(result.text);
    if (!directive) {
      const text = folded("crown");
      enter(benchModelRouteInvalid(benchBuild(benchPreflight(createBench("crown", locale))), text), text, "invalid");
      return;
    }
    if (directive.route === "abstain" || directive.lens === null) {
      const text = folded("crown");
      const desk = benchBuild(benchPreflight(createBench("crown", locale)));
      enter(benchAbstained(benchModel(desk, "abstain"), text), text, "abstained");
      return;
    }

    const lens = directive.lens;
    setLens(lens);
    const prose = stripBenchDirective(result.text);
    const envelope = benchEnvelope(lens);
    const chosen = benchModelChose(benchBuild(benchPreflight(createBench(lens, locale))), lens);

    const found = verifyBenchText(prose, envelope);
    if (found.length === 0) {
      enter(benchCommit(benchPrecommit(chosen, "pass"), prose), prose, "modelChosen");
      return;
    }

    setViolations(found);
    const text = folded(lens);
    enter(benchRefused(benchPrecommit(chosen, "refused"), text), text, "folded");
  };

  // M1221 · the second graph edge. The claim from the first shelf is NOT trusted because it
  // reads well; a second sealed shelf must carry the same numerals before it stands.
  const crossExamine = async () => {
    if (crossBusy || !deskState) return;
    setCrossBusy(true);
    setCrossLens(null);
    const claim = deskState.answer;
    // Even the keyless/fold arm can be cross-examined: the second shelf either corroborates
    // the fold's summary through a live model or honestly declares itself contested offline.
    const firstLens = lens ?? "crown";
    const crossFold = (other: WitnessLens): string => folded(other);

    const finish = (desk: BenchState, text: string, next: MapBadge) => {
      enter(desk, text, next);
      setCrossBusy(false);
    };
    if (!LLM_CONFIG.hasKey) {
      finish(benchCrossAbstained(deskState, crossFold(firstLens)), crossFold(firstLens), "contested");
      return;
    }

    const routingEnvelope = Object.fromEntries(WITNESS_LENSES.map((id) => [id, benchEnvelope(id)]));
    const system = withWorldBook([
      "You are the second witness of Football OS. A colleague made one claim from a sealed shelf.",
      "FIRST LINE: exactly CHECK:crown, CHECK:chase or CHECK:form — name a DIFFERENT shelf from the one the claim came from. Or write ABSTAIN alone if no other shelf can test it.",
      "AFTER THAT: at most 40 words, in the visitor's language, saying only what that second shelf shows. Never invent a numeral, a club, a result or a future tense.",
      "",
      "THE CLAIM UNDER TEST:",
      claim,
      "",
      "ALL SEALED SHELVES:",
      JSON.stringify(routingEnvelope, null, 2),
    ].join("\n"));

    const result = await callLlmStream(t("cartographer.cross.ask"), [], () => {}, { system });
    if (!result.ok) {
      finish(benchCrossAbstained(deskState, crossFold(firstLens)), crossFold(firstLens), "contested");
      return;
    }
    const directive = parseCrossDirective(result.text);
    if (!directive || directive.route === "abstain" || directive.lens === null) {
      finish(directive?.route === "abstain"
        ? benchCrossAbstained(deskState, crossFold(firstLens))
        : benchCrossRouteInvalid(deskState, crossFold(firstLens)), crossFold(firstLens), "contested");
      return;
    }
    if (directive.lens === firstLens) {
      finish(benchCrossRouteInvalid(deskState, crossFold(firstLens)), crossFold(firstLens), "contested");
      return;
    }

    const other = directive.lens;
    setCrossLens(other);
    const secondProse = stripCrossDirective(result.text);
    const secondEnvelope = benchEnvelope(other);
    const secondViolations = verifyBenchText(secondProse, secondEnvelope);
    const claimViolations = verifyBenchText(claim, secondEnvelope);
    const chosen = benchCrossChose(deskState, other);
    if (secondViolations.length === 0 && claimViolations.length === 0) {
      finish(benchCrossCorroborated(chosen, secondProse), secondProse, "corroborated");
      return;
    }
    setViolations([...new Set([...secondViolations, ...claimViolations])]);
    finish(benchCrossContested(chosen, crossFold(other)), crossFold(other), "contested");
  };

  const badgeLabel = badge === "modelChosen"
    ? t("witnessBench.badge.modelChosen")
    : badge === "corroborated" ? t("cartographer.badge.corroborated")
    : badge === "contested" ? t("cartographer.badge.contested")
    : badge === "invalid" ? t("witnessBench.badge.modelInvalid")
    : badge === "abstained" ? t("witnessBench.badge.abstained")
    : badge === "folded" ? t("library.door.badge.folded")
    : badge === "offline" ? t("library.door.badge.fallback")
    : t("library.door.badge.verified");

  return (
    <div className="space-y-5 print:hidden">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-violet -right-16 -top-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("cartographer.kicker")}</div>
          <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">{t("cartographer.title")}</h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("cartographer.subtitle")}</p>
          <span className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest", LLM_CONFIG.hasKey ? CHIP_CLASS.badgeInfoStrong : CHIP_CLASS.warning)}>
            {LLM_CONFIG.hasKey && <span aria-hidden className="fo-live-dot inline-flex h-1.5 w-1.5 rounded-full bg-info" />}
            {LLM_CONFIG.hasKey ? t("ai.via.live", { model: LLM_CONFIG.model }) : t("ai.via.local")}
          </span>
        </div>
      </header>

      <Panel className="p-5">
        <p className="mb-3 text-[10px] text-muted-foreground">{t("cartographer.hint")}</p>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="fo-lift rounded-lg border px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-muted disabled:opacity-60"
        >
          {t("witnessBench.ask.model")}
        </button>
        {answer && <p aria-live="polite" className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>}
        {badge && (
          <span className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest", badge === "modelChosen" || badge === "verified" || badge === "corroborated" ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.badgeWarning)}>
            {badgeLabel}
          </span>
        )}
        {lens && (
          <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            {t("cartographer.picked")} · {t(`witnessBench.ask.${lens}`)}
          </p>
        )}
        {deskState && (
          <button
            type="button"
            onClick={() => void crossExamine()}
            disabled={crossBusy}
            className={cn("fo-lift mt-4 rounded-lg border px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-colors hover:bg-muted disabled:opacity-60", CHIP_CLASS.badgeInfoStrong)}
          >
            {t("cartographer.cross.ask")}
          </button>
        )}
        {crossLens && (
          <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            {t("cartographer.cross.picked")} · {t(`witnessBench.ask.${crossLens}`)}
          </p>
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
        <p className="mt-3 text-[10px] text-muted-foreground">{t("cartographer.method")}</p>
      </Panel>
    </div>
  );
}
