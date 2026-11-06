import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge, CHIP_CLASS, BAR_FILL } from "@/ui/primitives";
import { footballProvider, getClub } from "@/data/footballService";
import { leadRetention, comebackPoints, collapses } from "@/domain/analytics";
import { maxBy } from "@/domain/attributes";
import { ABSENT, cn, pctLabel, pctOf } from "@/lib/utils";

export function LeadRetention() {
  const { t } = useI18n();
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [compId, setCompId] = useState(() => competitions[0]?.id ?? "");

  const retention = useMemo(() => leadRetention(compId, matches, clubs), [compId, matches, clubs]);
  const comeback = useMemo(() => comebackPoints(compId, matches, clubs), [compId, matches, clubs]);
  const thrown = useMemo(() => collapses(compId, matches, clubs), [compId, matches, clubs]);
  const rows = retention.rows;
  const worst = rows.length ? maxBy(rows, (r) => r.dropped) : null;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("leads.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("leads.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {competitions.map((c) => (
          <button
            key={c.id}
            onClick={() => setCompId(c.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              compId === c.id ? CHIP_CLASS.filterOn : CHIP_CLASS.filterOff,
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <Panel className="p-4">
          <EmptyState title={t("leads.empty")} hint={t("leads.emptyHint")} icon="📉" />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("leads.led")}
              value={retention.led}
              sub={t("leads.ledSub", { n: retention.matches })}
            />
            <StatTile
              label={t("leads.kept")}
              value={pctLabel(retention.led ? retention.won / retention.led : 0)}
              sub={t("leads.keptSub", { n: retention.won })}
              tone="up"
            />
            <StatTile
              label={t("leads.dropped")}
              value={retention.dropped}
              sub={t("leads.droppedSub", { n: retention.drawn + retention.lost })}
              tone="down"
            />
            <StatTile
              label={t("leads.worst")}
              value={worst && worst.dropped > 0 ? (getClub(worst.clubId)?.short ?? ABSENT) : ABSENT}
              sub={worst && worst.dropped > 0 ? t("leads.worstSub", { n: worst.dropped }) : t("leads.none")}
              tone="down"
            />
          </div>

          <Panel className="p-5">
            <SectionTitle title={t("leads.boardTitle")} hint={t("leads.boardHint")} />
            <ul className="mt-2 space-y-1">
              {rows.map((r) => {
                const club = getClub(r.clubId);
                return (
                  <li
                    key={r.clubId}
                    className={cn(
                      "grid items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                      "grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_minmax(120px,220px)]",
                      r.dropped === 0 && "opacity-70",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Crest colors={club?.colors} short={club?.short} size={26} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("leads.rowLine", { w: r.won, d: r.drawn, l: r.lost })}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {t("leads.homeLine", { h: r.homeWon, hl: r.homeLed, a: r.awayWon, al: r.awayLed })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.led}
                      <div className="text-xs text-muted-foreground">{t("leads.colLed")}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.dropped}
                      <div className="text-xs text-muted-foreground">{t("leads.colDropped")}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className={cn("h-2 rounded-full", r.dropped === 0 ? BAR_FILL.good : BAR_FILL.low)}
                          style={{ width: pctOf(r.keepShare, 100) }}
                        />
                      </div>
                      <div className="mt-1 truncate text-[11px] text-muted-foreground">
                        {t("leads.colKeep", { n: r.keepShare })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("leads.method", { n: retention.matches })}</p>
          </Panel>

          {/* M957: the other half of the ledger — the same replay read from the side that was
              behind, so a deficit rescued to a win shows up beside a lead that was thrown away. */}
          <Panel className="p-5">
            <SectionTitle title={t("leads.comebackTitle")} hint={t("leads.comebackHint")} />
            {comeback.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("leads.comebackNone")}</p>
            ) : (
              <>
                <ul className="mt-2 space-y-1">
                  {comeback.rows.map((r) => {
                    const club = getClub(r.clubId);
                    return (
                      <li
                        key={r.clubId}
                        className={cn(
                          "grid items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                          "grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_minmax(120px,220px)]",
                          r.points === 0 && "opacity-70",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Crest colors={club?.colors} short={club?.short} size={26} />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                            <div className="text-xs text-muted-foreground">
                              {t("leads.comebackRowLine", { w: r.won, d: r.drawn, l: r.lost })}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {t("leads.comebackHomeLine", { hp: r.homePoints, ht: r.homeTrailed, ap: r.awayPoints, at: r.awayTrailed })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right tabular-nums">
                          {r.trailed}
                          <div className="text-xs text-muted-foreground">{t("leads.comebackColTrailed")}</div>
                        </div>
                        <div className="text-right tabular-nums">
                          {r.points}
                          <div className="text-xs text-muted-foreground">{t("leads.comebackColPoints")}</div>
                        </div>
                        <div className="hidden sm:block">
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className={cn("h-2 rounded-full", r.points > 0 ? BAR_FILL.good : BAR_FILL.low)}
                              style={{ width: pctOf(r.rescueShare, 100) }}
                            />
                          </div>
                          <div className="mt-1 truncate text-[11px] text-muted-foreground">
                            {t("leads.comebackBar", { n: r.rescueShare })}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("leads.comebackMethod", { n: comeback.matches, p: comeback.points })}
                </p>
              </>
            )}
          </Panel>

          {/* M961: the fixtures behind the board — the leads that did not survive, named one by
              one with how far ahead the side got and when the peak arrived. */}
          <Panel className="p-5">
            <SectionTitle title={t("leads.collapseTitle")} hint={t("leads.collapseHint")} />
            {thrown.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("leads.collapseNone")}</p>
            ) : (
              <>
                <ul className="mt-2 space-y-1">
                  {thrown.rows.slice(0, 8).map((r) => {
                    const club = getClub(r.clubId);
                    const opponent = getClub(r.opponentId);
                    return (
                      <li
                        key={`${r.matchId}-${r.clubId}`}
                        className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Crest colors={club?.colors} short={club?.short} size={24} />
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate font-medium">{club?.name ?? r.clubId}</span>
                              <span className="text-xs text-muted-foreground">{t("common.vs")}</span>
                              <span className="truncate text-muted-foreground">{opponent?.name ?? r.opponentId}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t("leads.collapseRow", { n: r.lead, m: r.minute, gf: r.goalsFor, ga: r.goalsAgainst })}
                            </div>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px]",
                            r.outcome === "drawn" ? CHIP_CLASS.muted : CHIP_CLASS.destructive,
                          )}
                        >
                          {r.outcome === "drawn" ? t("leads.collapseDrawn") : t("leads.collapseLost")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("leads.collapseMethod", { n: thrown.matches, c: thrown.count })}
                </p>
              </>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
