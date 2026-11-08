import { useMemo, useState } from "react";
import { useI18n, formatDate } from "@/i18n";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge, CHIP_CLASS, BAR_FILL } from "@/ui/primitives";
import { footballProvider, getClub } from "@/data/footballService";
import { streaks } from "@/domain/analytics";
import { maxBy } from "@/domain/attributes";
import { ABSENT, cn, pctOf } from "@/lib/utils";

export function Streaks() {
  const { t, locale } = useI18n();
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [compId, setCompId] = useState(() => competitions[0]?.id ?? "");

  const runs = useMemo(() => streaks(compId, matches, clubs), [compId, matches, clubs]);
  const rows = runs.rows;
  // The longest run still alive: the board is about history, this tile is about right now.
  const alive = rows.length ? maxBy(rows, (r) => r.currentUnbeaten) : null;
  // M964: the drought is the other record — who went longest without a win, and who is in one now.
  const drought = rows.length ? maxBy(rows, (r) => r.longestWinless) : null;
  // M968: the record's edge — only runs worth naming (two matches or more) get a breaker line;
  // the rows are already in unbeaten order, so this list keeps that order.
  const edges = rows.filter((r) => r.longestUnbeaten >= 2);
  const peak = runs.longestUnbeaten > 0 ? runs.longestUnbeaten : 1;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("streaks.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("streaks.subtitle")}</p>
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

      {runs.longestUnbeaten === 0 ? (
        <Panel className="p-4">
          <EmptyState title={t("streaks.empty")} hint={t("streaks.emptyHint")} icon="🔥" />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("streaks.bestWin")}
              value={runs.longestWin}
              sub={t("streaks.bestWinSub", {
                c: runs.winHolder ? (getClub(runs.winHolder)?.short ?? ABSENT) : ABSENT,
              })}
              tone="up"
            />
            <StatTile
              label={t("streaks.bestUnbeaten")}
              value={runs.longestUnbeaten}
              sub={t("streaks.bestUnbeatenSub", {
                c: runs.unbeatenHolder ? (getClub(runs.unbeatenHolder)?.short ?? ABSENT) : ABSENT,
              })}
              tone="up"
            />
            <StatTile
              label={t("streaks.alive")}
              value={alive ? alive.currentUnbeaten : 0}
              sub={
                alive && alive.currentUnbeaten > 0
                  ? t("streaks.aliveSub", { c: getClub(alive.clubId)?.short ?? ABSENT })
                  : t("streaks.none")
              }
            />
            <StatTile
              label={t("streaks.drought")}
              value={drought ? drought.longestWinless : 0}
              sub={
                drought && drought.longestWinless > 0
                  ? t("streaks.droughtSub", { c: getClub(drought.clubId)?.short ?? ABSENT })
                  : t("streaks.none")
              }
              tone="down"
            />
          </div>

          <Panel className="p-5">
            <SectionTitle title={t("streaks.boardTitle")} hint={t("streaks.boardHint")} />
            <ul className="mt-2 space-y-1">
              {rows.map((r) => {
                const club = getClub(r.clubId);
                const idle = r.played === 0;
                return (
                  <li
                    key={r.clubId}
                    className={cn(
                      "grid items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                      "grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_minmax(120px,220px)]",
                      idle && "opacity-60",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Crest colors={club?.colors} short={club?.short} size={26} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                        <div className="text-xs text-muted-foreground">
                          {idle
                            ? t("streaks.none")
                            : t("streaks.currentLine", { w: r.currentWin, u: r.currentUnbeaten })}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {t("streaks.venueLine", { hw: r.homeWin, hu: r.homeUnbeaten, aw: r.awayWin, au: r.awayUnbeaten })}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {t("streaks.droughtLine", { n: r.longestWinless, m: r.currentWinless })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.longestWin}
                      <div className="text-xs text-muted-foreground">{t("streaks.colWin")}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.longestUnbeaten}
                      <div className="text-xs text-muted-foreground">{t("streaks.colUnbeaten")}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className={cn("h-2 rounded-full", r.longestUnbeaten === runs.longestUnbeaten ? BAR_FILL.good : BAR_FILL.info)}
                          style={{ width: pctOf(r.longestUnbeaten, peak) }}
                        />
                      </div>
                      <div className="mt-1 truncate text-[11px] text-muted-foreground">
                        {t("streaks.colCurrent", { n: r.currentUnbeaten })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("streaks.method", { n: runs.matches })}</p>
          </Panel>

          <Panel className="p-5">
            <SectionTitle title={t("streaks.edgeTitle")} hint={t("streaks.edgeHint")} />
            <ul className="mt-2 space-y-1">
              {edges.map((r) => {
                const club = getClub(r.clubId);
                const breaker = r.unbeatenBreak ? getClub(r.unbeatenBreak.opponentId) : null;
                return (
                  <li
                    key={r.clubId}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Crest colors={club?.colors} short={club?.short} size={26} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.unbeatenBreak
                            ? t("streaks.edgeEnded", {
                                c: breaker?.short ?? ABSENT,
                                gf: r.unbeatenBreak.goalsFor,
                                ga: r.unbeatenBreak.goalsAgainst,
                              })
                            : t("streaks.edgeAlive")}
                        </div>
                        {r.unbeatenBreak && (
                          <div className="text-[11px] text-muted-foreground">
                            {formatDate(locale, r.unbeatenBreak.kickoff)}
                          </div>
                        )}
                        {/* M1005: the same edge read once per end — the home run ending at home, the away run ending away. */}
                        {(r.homeBreak || r.awayBreak) && (
                          <div className="text-[11px] text-muted-foreground">
                            {r.homeBreak && (
                              <div>
                                {t("streaks.edgeHomeEnd", {
                                  c: getClub(r.homeBreak.opponentId)?.short ?? ABSENT,
                                  gf: r.homeBreak.goalsFor,
                                  ga: r.homeBreak.goalsAgainst,
                                })}
                              </div>
                            )}
                            {r.awayBreak && (
                              <div>
                                {t("streaks.edgeAwayEnd", {
                                  c: getClub(r.awayBreak.opponentId)?.short ?? ABSENT,
                                  gf: r.awayBreak.goalsFor,
                                  ga: r.awayBreak.goalsAgainst,
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.longestUnbeaten}
                      <div className="text-xs text-muted-foreground">{t("streaks.edgeRun")}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("streaks.edgeMethod")}</p>
          </Panel>
        </>
      )}
    </div>
  );
}
