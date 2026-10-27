import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, EmptyState, DemoBadge, DELTA_CLASS } from "@/ui/primitives";
import { footballProvider, getClub } from "@/data/footballService";
import { positionLabel } from "@/domain/rowText";
import { projectGrowth } from "@/domain/projection";
import { weakestAttributes, byOverall, deltaSign } from "@/domain/attributes";
import { attrCeiling } from "@/domain/playerCareer";
import { cn, signed } from "@/lib/utils";

const WEEK_OPTIONS = [4, 8, 12];
const SESSION_OPTIONS = [2, 3, 4, 5];
const RATING_OPTIONS = [3, 4, 5];

export function PlayerProjection() {
  const { t } = useI18n();
  const players = useMemo(() => [...footballProvider.players()].sort(byOverall), []);
  const [playerId, setPlayerId] = useState(() => players[0]?.id ?? "");
  const [weeks, setWeeks] = useState(8);
  const [sessions, setSessions] = useState(3);
  const [rating, setRating] = useState(4);

  const player = players.find((p) => p.id === playerId) ?? null;

  // Replays the same diminishing-returns per-session gain the training loop applies, over the
  // weakest three attributes — a scouting "if they keep working, where do they land?" read.
  const projection = useMemo(() => {
    if (!player?.attributes) return null;
    const focus = weakestAttributes(player.attributes, 3).map((w) => w.key);
    return projectGrowth({
      attributes: player.attributes,
      focusKeys: focus,
      sessionsPerWeek: sessions,
      weeks,
      rating,
    });
  }, [player, weeks, sessions, rating]);

  if (!player) {
    return <EmptyState title={t("projection.title")} hint={t("projection.empty")} icon="📈" />;
  }

  return (
    <div className="space-y-5">
      <Panel className="p-5">
        <SectionTitle title={t("projection.title")} />
        <p className="mt-1 text-sm text-muted-foreground">{t("projection.subtitle")}</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{t("projection.pickPlayer")}</span>
            <select
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm"
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{t("projection.weeks")}</span>
            <select
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm"
            >
              {WEEK_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{t("projection.sessions")}</span>
            <select
              value={sessions}
              onChange={(e) => setSessions(Number(e.target.value))}
              className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm"
            >
              {SESSION_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{t("projection.rating")}</span>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm"
            >
              {RATING_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-lg font-semibold">{player.name}</div>
            <div className="text-sm text-muted-foreground">
              {getClub(player.clubId)?.name ?? player.clubId} · {positionLabel(player.position, t)} · {player.age}
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-muted-foreground">
              {t("projection.potential")} {attrCeiling(player.potential)}
            </div>
          </div>
        </div>
      </Panel>

      {projection ? (
        <Panel className="p-5">
          <SectionTitle title={t("projection.focusTitle")} />
          <div className="mt-2 grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b pb-1 text-xs text-muted-foreground">
            <span>{t("projection.colAttr")}</span>
            <span className="text-right">{t("projection.colNow")}</span>
            <span className="text-right">{t("projection.colProjected")}</span>
            <span className="text-right">{t("projection.colDelta")}</span>
          </div>
          <ul className="mt-1 space-y-1">
            {projection.items.map((it) => (
              <li
                key={it.key}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg border px-2 py-2 text-sm"
              >
                <span className="min-w-0 truncate">{t(`attr.name.${it.key}`)}</span>
                <span className="text-right text-muted-foreground">{it.from}</span>
                <span className="text-right font-medium">{it.to}</span>
                <span className={cn("text-right", DELTA_CLASS[deltaSign(it.delta)])}>
                  {signed(it.delta)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <span className="text-muted-foreground">
              {t("projection.overall")} {projection.overallBefore} → {projection.overallAfter}
            </span>
            <span className="text-muted-foreground">
              {t("projection.potential")} {attrCeiling(player.potential)}
            </span>
          </div>
        </Panel>
      ) : (
        <EmptyState title={t("projection.title")} hint={t("projection.noAttributes")} icon="📈" />
      )}

      <DemoBadge />
    </div>
  );
}
