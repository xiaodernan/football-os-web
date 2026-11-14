import { useMemo } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { moonshots } from "@/domain/moonshots";
import { positionLabel } from "@/domain/rowText";
import { DemoBadge, Panel, Crest, PANEL_CLASS } from "@/ui/primitives";
import { cn, safeDiv } from "@/lib/utils";

/**
 * M1126 · the Moonshots — the seed's own ceilings, read honestly.
 * Everything here is one fold over the world's youngest players, ranked by (potential − overall);
 * the ceremony is the orbs, the maths is the world's. If the seed had nothing under 21, the
 * page says so plainly.
 */
export function Moonshots() {
  const { t } = useI18n();
  const rows = useMemo(() => moonshots(footballProvider.players(), 12), []);
  const peak = Math.max(1, ...rows.map((r) => r.gap));

  return (
    <div className="space-y-5">
      {/* Cinematic hero — the seed's open promises, framed as still-lit comet trails */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-violet -left-16 -top-16 h-44 w-44" />
        <div aria-hidden className="fo-orb fo-orb-lime -right-14 -bottom-16 h-48 w-48" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary">
            <span>{t("moonshots.kicker")}</span>
            <DemoBadge />
          </div>
          <h1 className="fo-spectrum mt-1 bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
            {t("moonshots.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("moonshots.subtitle")}</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <Panel className="p-6 text-center text-sm text-muted-foreground">{t("moonshots.noSeed")}</Panel>
      ) : (
        <ol className="grid gap-3">
          {rows.map((r, i) => {
            const club = getClub(r.player.clubId);
            return (
              <li key={r.player.id}>
                <article className={cn("overflow-hidden rounded-xl border p-3 sm:p-4", PANEL_CLASS.panelSoft)}>
                  <div className="flex items-center gap-3">
                    <div className="grid w-8 shrink-0 place-items-center font-mono text-[11px] font-bold text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <Crest colors={club?.colors} short={club?.short} size={36} />
                    <Link to={`/player/${r.player.id}`} className="min-w-0 flex-1 hover:underline">
                      <div className="truncate text-sm font-bold">{r.player.name}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {positionLabel(r.player.position, t)} · {club?.name ?? r.player.clubId} · {t("moonshots.age", { n: r.player.age })} · {r.player.nation}
                      </div>
                    </Link>
                    <div className="shrink-0 text-right">
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("moonshots.gapChip")}</div>
                      <div className="font-mono text-lg font-black tabular-nums text-primary">+{r.gap}</div>
                    </div>
                  </div>
                  {/* The ceiling meter — how far the gap still looms, against the leader */}
                  <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full border">
                    <div className="h-full bg-primary" style={{ width: `${safeDiv(r.gap, peak) * 100}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[9px] tabular-nums text-muted-foreground">
                    <span>{t("moonshots.gaps", { ovr: r.player.overall, pot: r.player.potential })}</span>
                    <span>{t("moonshots.ceiling")}</span>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}

      {/* The honesty line */}
      <p className="text-center text-[11px] text-muted-foreground">{t("moonshots.method")}</p>
    </div>
  );
}
