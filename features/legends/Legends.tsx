import { useMemo } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { legendsBoard } from "@/domain/legends";
import { positionLabel } from "@/domain/rowText";
import { DemoBadge, Panel, SectionTitle, Crest, CHIP_CLASS, PANEL_CLASS } from "@/ui/primitives";
import { cn, safeDiv } from "@/lib/utils";

/**
 * M1116 · the Hall of Legends - the world's greatest-ever players, drawn once per seed.
 * Nothing invented: the Golden Boot is counted from the seed's finished fixtures (948 total GOAL
 * events, 100% attributed to squads at authoring), and the Immortals are the seed's own overall
 * vector, sorted. If the seed is empty every shelf reads empty.
 */

export function Legends() {
  const { t } = useI18n();
  const board = useMemo(
    () => legendsBoard(footballProvider.matches(), footballProvider.players(), 8, 12),
    [],
  );
  const bootMax = Math.max(1, ...board.goldenBoot.map((r) => r.goals));
  const mvp = board.immortals[0] ?? null;
  const p = mvp;

  return (
    <div className="space-y-5">
      {/* Cinematic hero - the hall of the world's greatest. The orbs and grid are decor only. */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-16 -top-16 h-44 w-44" />
        <div aria-hidden className="fo-orb fo-orb-violet -right-12 -bottom-14 h-40 w-40" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent">
              {t("legends.title")}
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("legends.subtitle")}</p>
        </div>
      </header>

      {/* The world's number one - the current MVP of the seed, printed as a single ceremonial stat. */}
      <section aria-labelledby="legends-mvp" className={cn("overflow-hidden rounded-2xl border p-5 sm:p-7", PANEL_CLASS.panelDeep)}>
        <div className="flex flex-wrap items-center gap-6 sm:gap-10">
          <div className="relative">
            <div aria-hidden className="absolute inset-0 -m-4 rounded-full border border-primary/40" />
            <div aria-hidden className="absolute inset-0 -m-8 rounded-full border border-primary/20" />
            <Crest colors={p ? getClub(p.clubId)?.colors : undefined} short={p ? getClub(p.clubId)?.short : undefined} size={96} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("legends.immortalKing")}</div>
            <div id="legends-mvp" className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
              {p?.name ?? "-"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {p ? `${getClub(p.clubId)?.name ?? p.clubId} · ${positionLabel(p.position, t)} · ${p.nation}` : " "}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={cn(CHIP_CLASS.labelPrimary, "rounded-md px-3 py-1 text-sm font-bold tabular-nums")}>
                {t("legends.overallLine", { n: p?.overall ?? 0 })}
              </span>
              <span className={cn(CHIP_CLASS.mutedSoft, "rounded-md px-3 py-1 text-xs")}>
                {t("legends.ageLine", { n: p?.age ?? 0 })}
              </span>
              <span className={cn(CHIP_CLASS.mutedSoft, "rounded-md px-3 py-1 text-xs")}>
                {p ? positionLabel(p.position, t) : " "}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* The two honour rolls - golden boot, the world's highest overall ceiling */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <SectionTitle title={t("legends.bootTitle")} hint={t("legends.bootHint")} />
          {board.goldenBoot.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("legends.noSeed")}</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {board.goldenBoot.map((row, i) => {
                const club = getClub(row.player.clubId);
                const p = row.player;
                return (
                  <li key={p.id} className={cn("grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-lg border p-2", i === 0 && "border-primary/50 bg-primary/5")}>
                    <span className={cn("grid h-7 w-7 place-items-center rounded font-mono text-xs font-bold", i === 0 ? CHIP_CLASS.labelPrimary : CHIP_CLASS.muted)}>{i + 1}</span>
                    <Crest colors={club?.colors} short={club?.short} size={28} />
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        <Link to={`/player/${p.id}`} className="hover:underline">{p.name}</Link>
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {club?.name ?? p.clubId} · {positionLabel(p.position, t)} · {t("legends.overallLine", { n: p.overall })}
                      </div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary/40">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${safeDiv(row.goals, bootMax) * 100}%` }} />
                      </div>
                    </div>
                    <span className="tabular-nums font-mono text-lg font-bold">{row.goals}</span>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">{t("legends.bootMethod", { total: board.goals, scorers: board.scorers, attributed: board.attributed })}</p>
        </Panel>

        <Panel className="p-5">
          <SectionTitle title={t("legends.immortalsTitle")} hint={t("legends.immortalsHint")} />
          {board.immortals.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("legends.noSeed")}</p>
          ) : (
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {board.immortals.map((p, i) => {
                const club = getClub(p.clubId);
                return (
                  <li key={p.id} className={cn(
                    "rounded-xl border p-3 transition-transform",
                    i < 3 ? "border-primary/50 bg-primary/5 fo-lift" : PANEL_CLASS.panelSoft,
                  )}>
                    <div className="flex items-center gap-2">
                      <Crest colors={club?.colors} short={club?.short} size={44} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{p.name}</div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{club?.name ?? p.clubId}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div>
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{positionLabel(p.position, t)}</div>
                        <div className="text-[10px] text-muted-foreground">{p.nation} · {p.age}</div>
                      </div>
                      <div className="font-mono text-2xl font-black tabular-nums leading-none text-primary">{p.overall}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">{t("legends.immortalsMethod", { n: board.immortals.length })}</p>
        </Panel>
      </div>

      {/* The toll - what an "honour roll" costs you to notice your heroes. */}
      <Panel className="p-5">
        <SectionTitle title={t("legends.tollTitle")} />
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {[
            t("legends.tollBoot", { n: board.goals }),
            t("legends.tollScorers", { n: board.scorers }),
            t("legends.tollAttribution", { n: board.attributed }),
          ].map((line, i) => (
            <li key={i} className="rounded-lg border px-3 py-2 text-xs text-muted-foreground">{line}</li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
