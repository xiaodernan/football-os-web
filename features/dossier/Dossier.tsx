import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import { scoutDossier } from "@/domain/scout";
import { callLlmStream, LLM_CONFIG } from "@/data/llm";
import {
  createStudio, studioPreflight, verifyStudioText, type StudioTraceEntry, type StudioViolation,
  STUDIO_BUILD_ENTRY, STUDIO_COMMIT_ENTRY, STUDIO_FOLD_ENTRY, STUDIO_PRECOMMIT_PASS, STUDIO_PRECOMMIT_REFUSED,
} from "@/domain/scoutStudio";
import {
  fsmBuild, fsmCommit, fsmRefused, fsmPrecommit,
} from "@/domain/tracedFsm";
import { DemoBadge, Panel, Crest, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";
import { positionLabel, footLabel } from "@/domain/rowText";
import { cn, fmt2, fmtMoney, signed } from "@/lib/utils";

/**
 * M1142 · The Dossier — the one scout report the world owes itself.
 * Every number is the frozen seed's own: the prospect is chosen deterministically by
 * (overall, value, id) — not by us, not by drift. The last page is model-lived only on
 * the Railway deployment; static Pages honestly says the desk is asleep.
 */
export function Dossier() {
  const { t, locale } = useI18n();
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);
  const dossier = useMemo(() => scoutDossier(matches, clubs, players), [matches, clubs, players]);
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState("");
  const [studioTrace, setStudioTrace] = useState<readonly StudioTraceEntry[] | null>(null);
  const [studioViolations, setStudioViolations] = useState<readonly StudioViolation[] | null>(null);

  const foldStudioAnswerText = (): string => {
    if (!dossier) return "";
    const { player } = dossier;
    const positionWord = positionLabel(player.position, t).toLowerCase();
    const clause = player.overall >= 82
      ? t("dossier.foldAnswer.clause.prime")
      : player.overall >= 68
        ? t("dossier.foldAnswer.clause.starter")
        : t("dossier.foldAnswer.clause.notYet");
    const tape = dossier.goals >= 10
      ? t("dossier.foldAnswer.tapeMany", { goals: dossier.goals, apps: dossier.appearances, perApp: fmt2(dossier.goalsPerApp) })
      : dossier.appearances > 0
        ? t("dossier.foldAnswer.tapeFew", { apps: dossier.appearances, perApp: fmt2(dossier.goalsPerApp) })
        : t("dossier.foldAnswer.tapeEmpty");
    return [
      t("dossier.foldAnswer.intro", {
        name: player.name,
        age: player.age,
        positionWord,
        overall: player.overall,
        potential: player.potential,
        clause,
      }),
      tape,
      t("dossier.foldAnswer.hold"),
      t("dossier.foldAnswer.promise"),
    ].join(" ");
  };

  const askStudio = async () => {
    if (!dossier || asking) return;
    const { player, club } = dossier;
    const positionWord = positionLabel(player.position, t);
    const question = `Write one honest 4-sentence portrait of ${player.name}, age ${player.age}, ${positionWord} at club "${dossier.club?.name}", overall ${player.overall}, potential ${player.potential}, at EUR ${Math.round(player.value / 1_000_000)}m. THE DEEP DIGEST is the world beneath; every figure in your reply must be either that digest's own or the seed's for THIS prospect. Never invent a fact, never predict a career outside his numbers; keep it warm but honest; end with one concrete reason a scout should fly to see him, or accept plainly that the numbers say not yet.`;

    let desk = studioPreflight(createStudio(
      { overall: player.overall, potential: player.potential, gap: dossier.gap, value: player.value, apps: dossier.appearances, goals: dossier.goals },
      { name: player.name, club: club?.name ?? null, age: player.age, positionLabel: positionWord, foot: footLabel(player.foot, t) },
      locale,
    ));
    desk = fsmBuild(desk, STUDIO_BUILD_ENTRY, "model");
    if (desk.status === "refused") {
      setStudioTrace(desk.trace);
      setStudioViolations(["wrongNumbers"]);
      setAnswer(foldStudioAnswerText());
      return;
    }

    if (!LLM_CONFIG.hasKey) {
      setStudioTrace(desk.trace);
      setStudioViolations(null);
      setAnswer(t("dossier.via.local"));
      return;
    }
    setAsking(true);
    setAnswer("");
    const result = await callLlmStream(question, [], (d) => setAnswer((p) => p + d));
    if (result.ok) {
      const refusals = verifyStudioText(result.text, desk);
      if (refusals.length === 0) {
        const committed = fsmCommit(fsmPrecommit(desk, "pass", STUDIO_PRECOMMIT_PASS, STUDIO_PRECOMMIT_REFUSED), result.text, STUDIO_COMMIT_ENTRY);
        setStudioTrace(committed.trace);
        setStudioViolations(null);
        setAnswer(result.text);
        setAsking(false);
        return;
      }
      setStudioViolations(refusals);
      const refused = fsmRefused(fsmPrecommit(desk, "refused", STUDIO_PRECOMMIT_REFUSED, STUDIO_PRECOMMIT_REFUSED), foldStudioAnswerText(), STUDIO_FOLD_ENTRY);
      setStudioTrace(refused.trace);
      setAnswer(foldStudioAnswerText());
      setAsking(false);
      return;
    }
    setStudioViolations(null);
    const offline = fsmRefused(desk, foldStudioAnswerText(), STUDIO_FOLD_ENTRY);
    setStudioTrace(offline.trace);
    setAnswer(foldStudioAnswerText());
    setAsking(false);
  };

  if (!dossier) {
    return (
      <div className="space-y-5">
        <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
          <div className="relative">
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent">{t("dossier.title")}</h1>
            <DemoBadge />
          </div>
        </header>
        <Panel className="p-6 text-center text-sm text-muted-foreground">{t("dossier.empty")}</Panel>
      </div>
    );
  }

  const { player, club } = dossier;
  const comp = useMemo(() => footballProvider.competitions().find((c) => c.id === club?.competitionId), [club]);

  const SIX: { label: string; value: React.ReactNode }[] = [
    { label: t("dossier.overall"), value: player.overall },
    { label: t("dossier.potential"), value: player.potential },
    { label: t("dossier.gap"), value: signed(dossier.gap) },
    { label: t("dossier.value"), value: fmtMoney(player.value) },
    { label: t("dossier.position"), value: positionLabel(player.position, t) },
    { label: t("dossier.foot"), value: footLabel(player.foot, t) },
  ];

  return (
    <div className="space-y-5 print:bg-transparent">
      {/* The envelope — the dossier's own front page */}
      <header className={cn("relative overflow-hidden rounded-2xl border px-5 py-8", PANEL_CLASS.panelDeep)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-20 -top-20 h-56 w-56" />
        <div aria-hidden className="fo-orb fo-orb-violet -right-16 -bottom-16 h-56 w-56" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <span aria-hidden className={cn("absolute right-4 top-4 rotate-6 rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest", CHIP_CLASS.badgeWarning)}>{t("dossier.confidential")}</span>
        <div className="relative text-center">
          <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.35em] text-primary">
            <span>{t("dossier.kicker")}</span>
            <DemoBadge />
          </div>
          <Crest colors={club?.colors} short={club?.short} size={96} />
          <div className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">{comp?.name ?? club?.competitionId}</div>
          <h1 className="fo-spectrum mt-1 bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-6xl print:text-black">
            {player.name}
          </h1>
          <p className="mx-auto mt-1 max-w-md text-[11px] text-muted-foreground print:text-black">
            {player.age} · {positionLabel(player.position, t)} · {club?.name ?? player.clubId}
          </p>
        </div>
      </header>

      {/* The six monuments */}
      <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {SIX.map((cell) => (
          <div key={cell.label} className={cn("rounded-xl border p-3 text-center", PANEL_CLASS.panelQuiet)}>
            <div className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text font-mono text-2xl font-black tabular-nums text-transparent sm:text-3xl">{cell.value}</div>
            <div className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground">{cell.label}</div>
          </div>
        ))}
      </section>

      {/* The tape — his played form, measured by the seed itself */}
      <section className={cn("overflow-hidden rounded-2xl border p-6", PANEL_CLASS.panelDeep)}>
        <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("dossier.tapeTitle")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 text-center sm:grid-cols-3">
          <div>
            <div className="font-mono text-3xl font-black tabular-nums text-primary">{dossier.appearances}</div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("dossier.apps")}</div>
          </div>
          <div>
            <div className="font-mono text-3xl font-black tabular-nums text-primary">{dossier.goals}</div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("dossier.goals")}</div>
          </div>
          <div>
            <div className="font-mono text-3xl font-black tabular-nums text-primary">{fmt2(dossier.goalsPerApp)}</div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("dossier.goalsPerApp")}</div>
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">{t("dossier.tapeHint")}</p>
      </section>

      {/* The last page — the model gets one sentence, if it is awake */}
      <section className={cn("rounded-2xl border p-6", PANEL_CLASS.panelQuiet)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("dossier.lastPage")}</h2>
          <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest", LLM_CONFIG.hasKey ? CHIP_CLASS.info : CHIP_CLASS.warning)}>
            {LLM_CONFIG.hasKey && <span aria-hidden className="fo-live-dot inline-flex h-1.5 w-1.5 rounded-full bg-info" />}
            {LLM_CONFIG.hasKey ? t("ai.via.live", { model: LLM_CONFIG.model }) : t("ai.via.local")}
          </div>
        </div>
        {LLM_CONFIG.hasKey ? (
          <>
            <button
              type="button"
              onClick={askStudio}
              disabled={asking}
              className="fo-lift mt-3 inline-flex items-center rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-muted disabled:opacity-60"
            >
              {asking ? t("pressroom.answering") : t("dossier.askTheDesk")}
            </button>
            {answer && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>}
            {studioViolations && studioViolations.length > 0 && (
              <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-warning">
                {studioViolations.map((v) => t(`dossier.violation.${v}`)).join(" · ")}
              </p>
            )}
            {studioTrace && (
              <div className="mt-4 border-t border-border/60 pt-3">
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("dossier.trace.label")}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{studioTrace.some((e) => e.verdict === "refused") ? t("dossier.trace.refused") : t("dossier.trace.verified")}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {studioTrace.map((entry) => (
                    <span
                      key={entry.stage}
                      title={t(`dossier.trace.note.${entry.note}`)}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-widest",
                        entry.verdict === "pass" ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.badgeWarning,
                      )}
                    >
                      {t(`dossier.trace.stage.${entry.stage}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("dossier.via.local")}</p>
        )}
      </section>

      <p className="text-center text-[11px] text-muted-foreground">{t("dossier.method")}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link to="/watchlist" className="text-xs text-muted-foreground hover:underline">{t("nav.watch")}</Link>
        <Link to="/scouting" className="text-xs text-muted-foreground hover:underline">{t("nav.scouting")}</Link>
        <Link to="/manual" className="text-xs text-muted-foreground hover:underline">{t("manual.title")}</Link>
      </div>
    </div>
  );
}
