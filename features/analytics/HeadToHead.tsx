import { useMemo, useState } from "react";
import { useI18n, formatDate } from "@/i18n";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge, BAR_FILL } from "@/ui/primitives";
import { footballProvider, getClub, getCompetition } from "@/data/footballService";
import { headToHead } from "@/domain/analytics";
import { cn, pctOf, SEPARATOR } from "@/lib/utils";

const MEETING_DATE: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

export function HeadToHead() {
  const { t, locale } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const matches = useMemo(() => footballProvider.matches(), []);
  const [aId, setAId] = useState(() => clubs[0]?.id ?? "");
  const [bId, setBId] = useState(() => clubs[1]?.id ?? "");

  const a = getClub(aId);
  const b = getClub(bId);
  const h2h = useMemo(() => headToHead(aId, bId, matches), [aId, bId, matches]);
  const rows = [...h2h.meetings].reverse();
  const totalGoals = h2h.goalsA + h2h.goalsB;

  const select = (value: string, onChange: (v: string) => void, exclude: string) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm"
    >
      {clubs
        .filter((c) => c.id !== exclude)
        .map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
    </select>
  );

  if (!a || !b) {
    return <EmptyState title={t("h2h.title")} hint={t("h2h.subtitle")} icon="⚔️" />;
  }

  const streakLine = !h2h.streak
    ? t("h2h.noDecider")
    : h2h.streak.side === "draw"
      ? t("h2h.streakDraw", { n: h2h.streak.length })
      : t("h2h.streakWin", {
          club: (h2h.streak.side === "a" ? a : b).short,
          n: h2h.streak.length,
        });
  const biggestLine = !h2h.biggest
    ? t("h2h.noDecider")
    : t("h2h.biggestLine", {
        club: (h2h.biggest.winner === "a" ? a : b).short,
        margin: Math.abs(h2h.biggest.goalsA - h2h.biggest.goalsB),
      });

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("h2h.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("h2h.subtitle")}</p>
      </div>

      <Panel className="p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">{t("h2h.clubA")}</span>
            {select(aId, setAId, bId)}
          </label>
          <div className="hidden pb-1.5 text-lg text-muted-foreground sm:block">⚔️</div>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">{t("h2h.clubB")}</span>
            {select(bId, setBId, aId)}
          </label>
        </div>
      </Panel>

      {h2h.played === 0 ? (
        <Panel className="p-4">
          <EmptyState title={t("h2h.empty")} hint={t("h2h.emptyHint")} icon="⚔️" />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("h2h.meetings")}
              value={h2h.played}
              sub={t("h2h.meetingsSub", { n: h2h.competitions })}
            />
            <StatTile
              label={t("h2h.wins", { club: a.short })}
              value={h2h.winsA}
              sub={t("h2h.ofPlayed", { n: h2h.played })}
              tone={h2h.winsA > h2h.winsB ? "up" : h2h.winsA < h2h.winsB ? "down" : undefined}
            />
            <StatTile label={t("h2h.draws")} value={h2h.draws} sub={t("h2h.ofPlayed", { n: h2h.played })} />
            <StatTile
              label={t("h2h.wins", { club: b.short })}
              value={h2h.winsB}
              sub={t("h2h.ofPlayed", { n: h2h.played })}
              tone={h2h.winsB > h2h.winsA ? "up" : h2h.winsB < h2h.winsA ? "down" : undefined}
            />
          </div>

          <Panel className="p-5">
            <SectionTitle
              title={t("h2h.goals")}
              hint={t("h2h.goalsHint", { a: h2h.goalsA, b: h2h.goalsB })}
            />
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-2 rounded-l-full", BAR_FILL.good)}
                style={{ width: pctOf(h2h.goalsA, totalGoals || 1) }}
              />
              <div
                className={cn("h-2 rounded-r-full", BAR_FILL.info)}
                style={{ width: pctOf(h2h.goalsB, totalGoals || 1) }}
              />
            </div>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                <span className="text-foreground">{t("h2h.biggest")}</span> · {biggestLine}
              </div>
              <div>
                <span className="text-foreground">{t("h2h.streak")}</span> · {streakLine}
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionTitle title={t("h2h.table")} hint={t("h2h.tableHint")} />
            <div className="hidden grid-cols-[6rem_1fr_5rem_1fr] gap-2 border-b pb-1 text-[11px] uppercase tracking-wide text-muted-foreground sm:grid">
              <span>{t("h2h.colWhen")}</span>
              <span>{t("h2h.colHome")}</span>
              <span className="text-center">{t("h2h.colScore")}</span>
              <span className="text-right">{t("h2h.colAway")}</span>
            </div>
            <ul className="mt-1 space-y-1">
              {rows.map((m) => {
                const home = getClub(m.homeClubId);
                const away = getClub(m.awayClubId);
                const comp = getCompetition(m.competitionId);
                const widest = m.matchId === h2h.biggest?.matchId;
                return (
                  <li
                    key={m.matchId}
                    className={cn(
                      "grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border px-3 py-2 text-sm sm:grid-cols-[6rem_1fr_5rem_1fr]",
                      widest && "border-primary/40",
                    )}
                  >
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {formatDate(locale, m.kickoff, MEETING_DATE)}
                      <span className="mx-1">·</span>
                      {comp?.name ?? m.competitionId}
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Crest colors={home?.colors} short={home?.short} size={22} />
                      <span className="truncate font-medium">{home?.name ?? m.homeClubId}</span>
                    </div>
                    <div className="text-right font-semibold tabular-nums sm:text-center">
                      {m.homeGoals} {SEPARATOR} {m.awayGoals}
                    </div>
                    <div className="hidden min-w-0 items-center justify-end gap-2 sm:flex">
                      <span className="truncate text-muted-foreground">{away?.name ?? m.awayClubId}</span>
                      <Crest colors={away?.colors} short={away?.short} size={22} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("h2h.method")}</p>
          </Panel>
        </>
      )}
    </div>
  );
}
