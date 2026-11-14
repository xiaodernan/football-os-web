import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import { worldLetters } from "@/domain/letters";
import { callLlmStream, LLM_CONFIG } from "@/data/llm";
import { DemoBadge, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";
import { cn, fmt2 } from "@/lib/utils";

/**
 * M1135 - The Letterbox: the world writes to itself.
 * Seven postcards folded from the frozen seed at render time; not one of them borrows
 * a network except the optional P.S., and that one goes through the same /api/llm/chat
 * door every live answer in this app uses. The blanks, the shocks and the wildest nights
 * are measured facts, not invented lore; the model may only add a postscript, never a claim.
 */
export function Letterbox() {
  const { t } = useI18n();
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const letters = useMemo(() => worldLetters(matches, clubs), [matches, clubs]);
  const compName = (id: string) => competitions.find((c) => c.id === id)?.name ?? id;
  const [ps, setPs] = useState<string>("");
  const [streaming, setStreaming] = useState(false);

  const tonight = letters.tonight;
  const liveQuestion = tonight
    ? `Write the postscript to tonight's paper for ${tonight.home} vs ${tonight.away} in ${tonight.comp}. The Poisson eye reads ${tonight.score}. Three sentences, one from each bench, no spoilers, no fabrications — the world is synthetic and knows it.`
    : `Write a postscript to tonight's world from the groundkeeper's desk - the seed is frozen, the night is not.`;

  const askPostscript = async () => {
    if (streaming || !tonight) return;
    setStreaming(true);
    setPs("");
    const result = await callLlmStream(liveQuestion, [], (delta) => setPs((cur) => cur + delta));
    if (!result.ok && !ps) setPs(result.error);
    setStreaming(false);
  };

  const CARD = "relative overflow-hidden rounded-2xl border p-5 print:break-inside-avoid";

  return (
    <div className="space-y-5">
      {/* The hero - the bag of postcards, framed as a cinematic headline */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-24 -top-24 h-56 w-56" />
        <div aria-hidden className="fo-orb fo-orb-violet -right-20 -bottom-20 h-56 w-56" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("letters.kicker")}</span>
            <DemoBadge />
          </div>
          <h1 className="fo-spectrum mt-2 bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-6xl print:text-black">
            {t("letters.title")}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-xs text-muted-foreground print:text-black">{t("letters.subtitle")}</p>
        </div>
      </header>

      {/* The letters themselves */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* the wildest scoreline, folded */}
        {letters.wildest && (
          <article className={cn(CARD, PANEL_CLASS.panelDeep)}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("letters.wildest.kicker")}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              {t("letters.wildest.body", { score: letters.wildest.score, margin: letters.wildest.margin })}
            </p>
          </article>
        )}
        {/* the night the model's nerve broke */}
        {letters.upset && (
          <article className={cn(CARD, PANEL_CLASS.panelDeep)}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("letters.upset.kicker")}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              {t("letters.upset.body", { score: letters.upset.score, deficit: letters.upset.deficit, away: letters.upset.away, home: letters.upset.home })}
            </p>
          </article>
        )}
        {/* the blanks */}
        {letters.blank && (
          <article className={cn(CARD, PANEL_CLASS.panelDeep)}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("letters.blank.kicker")}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              {t("letters.blank.body", { club: letters.blank.holder ?? "", n: letters.blank.longest })}
            </p>
          </article>
        )}
        {/* the one who finishes */}
        {letters.lethal && (
          <article className={cn(CARD, PANEL_CLASS.panelDeep)}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("letters.lethal.kicker")}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              {t("letters.lethal.body", { club: letters.lethal.club, n: fmt2(letters.lethal.rate), league: fmt2(letters.lethal.league) })}
            </p>
          </article>
        )}
        {/* the goal-pile night */}
        {letters.spread && (
          <article className={cn(CARD, PANEL_CLASS.panelDeep)}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("letters.spread.kicker")}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              {t("letters.spread.body", { score: letters.spread.score, n: letters.spread.total })}
            </p>
          </article>
        )}
        {/* tonight, in the groundkeeper's hand */}
        {letters.tonight && (
          <article className={cn(CARD, PANEL_CLASS.panelDeep)}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("letters.tonight.kicker")}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              {t("letters.tonight.body", { comp: compName(letters.tonight.comp), home: letters.tonight.home, away: letters.tonight.away, score: letters.tonight.score, h: letters.tonight.h, d: letters.tonight.d, a: letters.tonight.a })}
            </p>
            <Link to={`/tomorrow`} className="mt-2 inline-block text-[11px] text-primary hover:underline print:hidden">
              {t("tomorrow.openFixture")}
            </Link>
          </article>
        )}
        {/* the ledger's own marginalia */}
        <article className={cn(CARD, PANEL_CLASS.panelDeep)}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("letters.ledger.kicker")}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            {t("letters.ledger.body", { fixtures: letters.ledger.fixtures, clubs: letters.ledger.clubs, goals: letters.ledger.goals })}
          </p>
        </article>
      </div>

      {/* The P.S. - the one letter the model may write, honestly fenced */}
      <section className={cn("rounded-2xl border p-6", PANEL_CLASS.panelQuiet)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("letters.live.kicker")}</h2>
          <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest", LLM_CONFIG.hasKey ? CHIP_CLASS.info : CHIP_CLASS.warning)}>
            {LLM_CONFIG.hasKey && <span aria-hidden className="fo-live-dot inline-flex h-1.5 w-1.5 rounded-full bg-info" />}
            {LLM_CONFIG.hasKey ? t("ai.via.live", { model: LLM_CONFIG.model }) : t("ai.via.local")}
          </div>
        </div>
        {LLM_CONFIG.hasKey ? (
          <>
            <button
              type="button"
              onClick={askPostscript}
              disabled={streaming}
              className="fo-lift mt-3 inline-flex items-center rounded-lg border px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted disabled:opacity-60"
            >
              {streaming ? t("letters.live.streaming") : t("letters.live.button")}
            </button>
            {ps && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{ps}</p>}
          </>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("letters.live.via.local")}</p>
        )}
      </section>

      <p className="text-center text-[11px] text-muted-foreground">{t("letters.method")}</p>
    </div>
  );
}
