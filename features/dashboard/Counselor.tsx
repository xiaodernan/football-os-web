// M1195 · The Counselor — the dashboard's next step, said in prose, imprisoned to the reader's own fold.
// The deterministic chips answer "what now" from the committed state; this panel answers it in words. The model is
// allowed to say ONLY what the reader's own NextStepFacts carry — every numeral it prints is re-proved against the
// facts, or the fold's own reading stands in instead. Never a hallucination, never silently swapped.
import { useState } from "react";
import type { NextStepFacts } from "@/domain/nextStep";
import {
  counselBuild, counselCommit, counselEnvelope, counselPreflight, counselPrecommit,
  counselRefused, verifyCounselText, COUNSEL_LOCAL_KEY, type CounselTraceEntry,
} from "@/domain/counsel";
import { LLM_CONFIG, callLlmStream, withWorldBook } from "@/data/llm";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { CHIP_CLASS, PANEL_CLASS } from "@/ui/primitives";

export default function Counselor({ facts }: { facts: NextStepFacts }) {
  const { t, locale } = useI18n();
  const [answer, setAnswer] = useState("");
  const [trace, setTrace] = useState<readonly CounselTraceEntry[] | null>(null);
  const [verdict, setVerdict] = useState<"none" | "verified" | "folded">("none");
  const [busy, setBusy] = useState(false);

  const local = COUNSEL_LOCAL_KEY(facts);
  const soonMins = Math.max(0, facts.nextMatchInMinutes ?? 0);
  // Every branch calls the dictionary with a LITERAL key — the census forbids a call whose key is an
  // expression passing variables, and the soon branch genuinely needs {n}.
  const localLine = (): string => {
    switch (local.key) {
      case "counsel.localLive": return t("counsel.localLive");
      case "counsel.localSoon": return t("counsel.localSoon", { n: soonMins });
      case "counsel.localEmptyPlan": return t("counsel.localEmptyPlan");
      case "counsel.localNoFilm": return t("counsel.localNoFilm");
      case "counsel.localEmptyWatchlist": return t("counsel.localEmptyWatchlist");
      default: return t("counsel.localNothing");
    }
  };
  const foldAnswer = localLine;

  const ask = async () => {
    if (busy) return;
    let desk = counselBuild(counselPreflight(facts, locale));
    setTrace(desk.trace);
    setVerdict("none");
    setAnswer("");
    if (!LLM_CONFIG.hasKey) { setAnswer(t("counsel.viaLocal")); return; }
    setBusy(true);
    const system = withWorldBook([
      "You are the counsel of Football OS — an imprisoned advisor.",
      "Answer the visitor's next-step question ONLY from the FACTS_ENVELOPE below and THE WORLD BOOK above.",
      "Every numeral you print must be one of the numbers in FACTS_ENVELOPE. Never invent a match, a player, a club or a fixture. If the visitor asks beyond these facts, say so plainly; never guess. Never predict.",
      "At most three sentences, in the visitor's language — tight, concrete, grounded in the numbers below.",
      "",
      "FACTS_ENVELOPE:",
      counselEnvelope(facts),
    ].join("\n"));
    const result = await callLlmStream(t("counsel.question"), [], (d) => setAnswer((p) => p + d), { system });
    setBusy(false);
    if (result.ok) {
      const refusals = verifyCounselText(result.text, facts);
      if (refusals.length === 0) {
        const committed = counselCommit(counselPrecommit(desk, "pass"), result.text);
        setTrace(committed.trace);
        setVerdict("verified");
        setAnswer(result.text);
        return;
      }
      const refused = counselRefused(counselPrecommit(desk, "refused"), foldAnswer());
      setTrace(refused.trace);
      setVerdict("folded");
      setAnswer(foldAnswer());
      return;
    }
    const refused = counselRefused(desk, foldAnswer());
    setTrace(refused.trace);
    setVerdict("folded");
    setAnswer(foldAnswer());
  };

  return (
    <div className={cn("mt-3 rounded-xl p-3", PANEL_CLASS.panelGhost)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t("counsel.kicker")}</span>
        <div className="flex items-center gap-2">
          {verdict === "verified" && <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest", CHIP_CLASS.success)}>{t("counsel.verified")}</span>}
          {verdict === "folded" && <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest", CHIP_CLASS.warning)}>{t("counsel.rejected")}</span>}
          {LLM_CONFIG.hasKey && (
            <button type="button" onClick={() => void ask()} disabled={busy} aria-busy={busy}
              className={cn("rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60", CHIP_CLASS.primary, "hover:border-primary")}>
              {busy ? t("counsel.answering") : t("counsel.ask")}
            </button>
          )}
        </div>
      </div>
      {!LLM_CONFIG.hasKey && <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{t("counsel.viaLocal")}</p>}
      {verdict === "none"
        ? <p className="mt-1.5 text-sm leading-snug text-foreground/90">{foldAnswer()}</p>
        : <p className="mt-1.5 text-sm leading-snug text-foreground/90">{answer}</p>}
      {trace && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          {trace.map((e, i) => <span key={i} className="rounded border border-border/60 px-1 py-0.5">{e.stage}{e.verdict === "refused" ? " ✗" : " ✓"}</span>)}
        </div>
      )}
    </div>
  );
}
