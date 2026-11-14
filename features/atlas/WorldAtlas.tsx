import { useMemo } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { atlasBoard } from "@/domain/atlas";
import { DemoBadge, Panel, SectionTitle, Crest, CHIP_CLASS, PANEL_CLASS } from "@/ui/primitives";
import { cn, fmtGrouped, fmt2, safeDiv, clamp } from "@/lib/utils";

/**
 * M1120 · the World Atlas — the frozen world's own dimensions, stated honestly.
 * Every figure is a runtime fold over the seed's arrays: population, fixtures by status, goals
 * and goals per finished fixture, unique scorers, attribution — and the two headline humans from
 * the legends door. Nothing here estimates a number; if the seed were empty, the tiles read zero.
 */
export function WorldAtlas() {
  const { t } = useI18n();
  const board = useMemo(
    () => atlasBoard(footballProvider.matches(), footballProvider.players(), footballProvider.clubs(), footballProvider.competitions()),
    [],
  );
  const finishedPct = clamp(board.finishedShare, 0, 100);
  const convoy = [
    { id: "finished", n: board.finished, tone: "bg-primary", label: t("atlas.finished", { n: board.finished }) },
    { id: "live", n: board.live, tone: "bg-info", label: t("atlas.live", { n: board.live }) },
    { id: "scheduled", n: board.scheduled, tone: "bg-secondary", label: t("atlas.scheduled", { n: board.scheduled }) },
  ];

  const tiles: { value: string; id: string; label: string }[] = [
    { value: fmtGrouped(board.players), id: "players", label: t("atlas.players") },
    { value: fmtGrouped(board.clubs), id: "clubs", label: t("atlas.clubs") },
    { value: fmtGrouped(board.competitions), id: "competitions", label: t("atlas.competitions") },
    { value: fmtGrouped(board.fixtures), id: "fixtures", label: t("atlas.fixtures") },
    { value: fmtGrouped(board.goals), id: "goals", label: t("atlas.goals") },
    { value: fmt2(board.goalsPerMatch), id: "goalsPerMatch", label: t("atlas.goalsPerMatch") },
    { value: fmtGrouped(board.scorers), id: "scorers", label: t("atlas.scorers") },
    { value: `${finishedPct}%`, id: "finishedShare", label: t("atlas.finishedShare") },
  ];

  return (
    <div className="space-y-5">
      {/* Cinematic hero — the world, population counted */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-16 -top-16 h-44 w-44" />
        <div aria-hidden className="fo-orb fo-orb-violet -right-14 -bottom-14 h-44 w-44" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
              {t("atlas.title")}
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("atlas.subtitle")}</p>
        </div>
      </header>

      {/* The population — eight tiles, always recomputed */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map(({ value, id, label }) => (
          <div key={id} className={cn("rounded-xl border p-4 text-center", PANEL_CLASS.panelSoft)}>
            <div className="text-2xl font-black tabular-nums leading-none text-primary sm:text-3xl">{value}</div>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          </div>
        ))}
      </section>

      {/* The convoy — fixtures by status, one stacked bar, from the world's own count */}
      <Panel className="p-5">
        <SectionTitle title={t("atlas.convoyTitle")} hint={t("atlas.convoyHint")} />
        <div className="mt-3 flex h-8 w-full overflow-hidden rounded-lg border">
          {convoy.map(({ id, n, tone }) => n > 0 && (
            <div
              key={id}
              className={cn(tone, "flex h-full items-center justify-center text-[10px] font-bold text-primary-foreground transition-transform")}
              style={{ width: `${safeDiv(n, board.fixtures) * 100}%` }}
            >
              {safeDiv(n, board.fixtures) > 0.06 ? `${n}` : ""}
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className={cn(CHIP_CLASS.labelPrimary, "rounded-md px-2 py-1")}>{convoy[0].label}</span>
          <span className={cn(CHIP_CLASS.labelInfo, "rounded-md px-2 py-1")}>{convoy[1].label}</span>
          <span className={cn(CHIP_CLASS.mutedSoft, "rounded-md px-2 py-1")}>{convoy[2].label}</span>
        </div>
      </Panel>

      {/* The two humans — headline numbers, not fake biography */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Panel className="p-5">
          <SectionTitle title={t("atlas.tileBestTitle")} />
          {board.best ? (
            <div className="mt-3 flex items-center gap-4">
              <Crest colors={getClub(board.best.clubId)?.colors} short={getClub(board.best.clubId)?.short} size={64} />
              <div>
                <Link to="/legends" className="text-lg font-bold leading-tight hover:underline">{board.best.name}</Link>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{getClub(board.best.clubId)?.name ?? board.best.clubId}</div>
                <div className="mt-2 font-mono text-2xl font-black tabular-nums text-primary">{t("legends.overallLine", { n: board.best.overall })}</div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">{t("atlas.noSeed")}</p>
          )}
        </Panel>

        <Panel className="p-5">
          <SectionTitle title={t("atlas.tileBootTitle")} />
          {board.goldenBoot ? (
            <div className="mt-3 flex items-center gap-4">
              <Crest colors={getClub(board.goldenBoot.clubId)?.colors} short={getClub(board.goldenBoot.clubId)?.short} size={64} />
              <div>
                <Link to="/legends" className="text-lg font-bold leading-tight hover:underline">{board.goldenBoot.name}</Link>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{getClub(board.goldenBoot.clubId)?.name ?? board.goldenBoot.clubId}</div>
                <div className="mt-2 font-mono text-2xl font-black tabular-nums text-primary">{board.goldenBoot.goals}<span className="text-sm text-muted-foreground"> {t("atlas.tileBootGoals")}</span></div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">{t("atlas.noSeed")}</p>
          )}
        </Panel>
      </div>

      {/* The honesty line — the one sentence that keeps this page true */}
      <p className="text-center text-[11px] text-muted-foreground">{t("atlas.method", { n: board.attributed, total: board.goals })}</p>
    </div>
  );
}
