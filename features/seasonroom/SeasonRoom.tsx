import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, EmptyState, DemoBadge, Crest, PANEL_CLASS } from "@/ui/primitives";
import { footballProvider, getClub } from "@/data/footballService";
import { seasonSituation } from "@/domain/seasonRoom";
import { cn, fmt2, fmtMoney } from "@/lib/utils";

/**
 * M1080 — the Season Command Room. One screen, four honest answers about the seeded world's
 * frozen season. Everything is read off `domain/seasonRoom.ts`, a pure fold over matches/players/
 * clubs/competitions: no clock, no DOM, no fetch, nothing the reader can disagree on.
 */
export function SeasonRoom() {
  const { t } = useI18n();
  const matches = useMemo(() => footballProvider.matches(), []);
  const players = useMemo(() => footballProvider.players(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const sit = useMemo(() => seasonSituation(matches, players, clubs, competitions), [matches, players, clubs, competitions]);
  if (sit.standings.length === 0) {
    return (
      <div className="space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{t("srs.title")}</h1>
              <DemoBadge />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("srs.hint")}</p>
          </div>
        </header>
        <Panel className="p-5"><EmptyState title={t("srs.champs")} hint={t("srs.champsHint")} /></Panel>
      </div>
    );
  }

  const gapable = [...sit.standings].filter((r) => r.gap > 0).sort((a, b) => a.gap - b.gap).slice(0, 6);
  // The two historic-triplet families, read outside JSX: their key names are dictionary lookups,
  // not interface prose, and the raw-UI census measures every literal between `>` and `<` as copy.
  const altFamilies = [
    { titleKey: "rules.swingTwo", entries: sit.twoOneZero },
    { titleKey: "rules.swingAll", entries: sit.allOrNothing },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{t("srs.title")}</h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("srs.hint")}</p>
        </div>
      </header>

      {/* The champions under the standard triplet */}
      <Panel className="p-5">
        <SectionTitle title={t("srs.champs")} hint={t("srs.champsHint")} />
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sit.standings.map((r) => (
            <div key={r.compId} className="fo-lift rounded-xl border border-border/50 p-3 transition hover:border-primary/40 hover:border-primary/60 hover:bg-card/70">
              <div className="flex items-center gap-3">
                <Crest colors={getClub(r.leaderId)?.colors} short={getClub(r.leaderId)?.short} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{r.leaderName}</div>
                  <div className="truncate text-[11px] uppercase tracking-widest text-muted-foreground">{r.compName} · {r.nation}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold tabular-nums">{r.leaderPoints}</div>
                  <div className="text-[10px] text-muted-foreground">{t("srs.columnPoints")}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>{t("srs.fixtureShare", { n: r.playedFixtures, total: r.totalFixtures })}</span>
                <span className="font-mono">+{r.gap} · {r.runnerUpName}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* The financial verdict — top five profitable and deepest solvent */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <SectionTitle title={t("srs.financial")} hint={t("srs.financialHint")} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-1.5 pr-3"></th>
                  <th className="py-1.5 pr-3 text-right">{t("srs.columnNet")}</th>
                  <th className="py-1.5 pr-3 text-right">{t("srs.columnSquad")}</th>
                  <th className="py-1.5 pr-3 text-right">{t("srs.columnWageRatio")}</th>
                </tr>
              </thead>
              <tbody>
                {sit.profitableFive.map((r) => (
                  <tr key={r.clubId} className="border-t">
                    <td className="py-1.5 pr-3"><div className="flex min-w-0 items-center gap-2"><Crest colors={getClub(r.clubId)?.colors} short={getClub(r.clubId)?.short} size={20} /><span className="truncate">{r.clubName}</span></div></td>
                    <td className="py-1.5 pr-3 text-right font-semibold tabular-nums text-success">{t("fin.netPlus", { v: fmtMoney(Math.abs(r.net)) })}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{fmtMoney(r.squadValue)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{fmt2(r.wageRatio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel className="p-5">
          <SectionTitle title={t("srs.financialTail")} hint={t("srs.financialTailHint")} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-1.5 pr-3"></th>
                  <th className="py-1.5 pr-3 text-right">{t("srs.columnNet")}</th>
                  <th className="py-1.5 pr-3 text-right">{t("srs.columnSquad")}</th>
                  <th className="py-1.5 pr-3 text-right">{t("srs.columnWageRatio")}</th>
                </tr>
              </thead>
              <tbody>
                {sit.insolventFive.map((r) => (
                  <tr key={r.clubId} className="border-t">
                    <td className="py-1.5 pr-3"><div className="flex min-w-0 items-center gap-2"><Crest colors={getClub(r.clubId)?.colors} short={getClub(r.clubId)?.short} size={20} /><span className="truncate">{r.clubName}</span></div></td>
                    <td className="py-1.5 pr-3 text-right font-semibold tabular-nums text-destructive">{t("fin.netMinus", { v: fmtMoney(Math.abs(r.net)) })}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{fmtMoney(r.squadValue)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{fmt2(r.wageRatio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* If the rules were rewritten — the crowns that change holder */}
      <Panel className="p-5">
        <SectionTitle title={t("srs.alt")} hint={t("srs.altHint")} />
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {altFamilies.map((family) => (
            <div key={family.titleKey} className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t(family.titleKey)}</div>
              {family.entries.slice(0, 4).map((r) => (
                <div key={r.compId} className={cn("rounded-lg p-2.5", PANEL_CLASS.panelMuted)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Crest colors={getClub(r.rulerId)?.colors} short={getClub(r.rulerId)?.short} size={22} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{r.rulerName}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{r.compName}</div>
                      </div>
                    </div>
                    <div className="text-right text-[11px]">
                      <div className="font-mono font-semibold tabular-nums">{r.rulerPoints} {t("srs.columnPoints")}</div>
                      <div className="text-muted-foreground">{r.sameAsStandard ? t("srs.sameRuler") : t("srs.flipRuler")}</div>
                      {!r.sameAsStandard && <div className="text-[10px] text-muted-foreground">{t("srs.stdLeaderTag", { name: r.standardLeaderName })}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Panel>

      {/* The closest crowns — the difference a rule would make */}
      <Panel className="p-5">
        <SectionTitle title={t("srs.closest")} hint={t("srs.closestHint")} />
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {gapable.map((r) => (
            <div key={r.compId} className="rounded-lg border border-border/50 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 truncate text-sm font-semibold">{r.compName}</div>
                <div className="text-xs font-mono tabular-nums text-muted-foreground">+{r.gap}</div>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px]">
                <Crest colors={getClub(r.leaderId)?.colors} short={getClub(r.leaderId)?.short} size={16} />
                <span className="truncate">{r.leaderName}</span>
                <span className="text-muted-foreground">+{r.gap}</span>
                <Crest colors={getClub(r.runnerUpId)?.colors} short={getClub(r.runnerUpId)?.short} size={16} />
                <span className="truncate text-muted-foreground">{r.runnerUpName} ({t("srs.pointsShort", { v: r.runnerUpPoints })})</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
