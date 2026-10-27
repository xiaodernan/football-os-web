import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, EmptyState, DemoBadge } from "@/ui/primitives";
import { footballProvider, getClub } from "@/data/footballService";
import { positionLabel } from "@/domain/rowText";

interface ScorerRow {
  key: string;
  name: string;
  clubName: string;
  positionLabel: string;
  goals: number;
}

interface BookedRow {
  key: string;
  name: string;
  clubName: string;
  yellow: number;
  red: number;
}

export function LeagueLeaders() {
  const { t } = useI18n();

  // Every goal and card in the seeded fixtures is a match event with a player name and a side,
  // so the board is a fold over the fixtures — never a stored table that could drift from them.
  const { scorers, booked } = useMemo(() => {
    const goals = new Map<string, { name: string; clubId: string; n: number }>();
    const cards = new Map<string, { name: string; clubId: string; yellow: number; red: number }>();

    for (const m of footballProvider.matches()) {
      for (const e of m.events ?? []) {
        const clubId = e.side === "home" ? m.homeClubId : m.awayClubId;
        const key = `${clubId}|${e.player}`;
        if (e.type === "GOAL") {
          const cur = goals.get(key) ?? { name: e.player, clubId, n: 0 };
          cur.n += 1;
          goals.set(key, cur);
        } else if (e.type === "YELLOW" || e.type === "RED") {
          const cur = cards.get(key) ?? { name: e.player, clubId, yellow: 0, red: 0 };
          if (e.type === "YELLOW") cur.yellow += 1;
          else cur.red += 1;
          cards.set(key, cur);
        }
      }
    }

    const byKey = new Map(footballProvider.players().map((p) => [`${p.clubId}|${p.name}`, p]));
    const clubName = (clubId: string) => getClub(clubId)?.name ?? clubId;
    const posLabel = (key: string) => {
      const p = byKey.get(key);
      return p ? positionLabel(p.position, t) : "";
    };

    const scorers: ScorerRow[] = [...goals.entries()]
      .map(([key, v]) => ({
        key,
        name: v.name,
        clubName: clubName(v.clubId),
        positionLabel: posLabel(key),
        goals: v.n,
      }))
      .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
      .slice(0, 15);

    const booked: BookedRow[] = [...cards.entries()]
      .map(([key, v]) => ({ key, name: v.name, clubName: clubName(v.clubId), yellow: v.yellow, red: v.red }))
      .sort((a, b) => b.yellow + b.red - (a.yellow + a.red) || b.red - a.red || a.name.localeCompare(b.name))
      .slice(0, 10);

    return { scorers, booked };
  }, [t]);

  if (scorers.length === 0 && booked.length === 0) {
    return <EmptyState title={t("leaders.title")} hint={t("leaders.empty")} icon="🏆" />;
  }

  return (
    <div className="space-y-5">
      <Panel className="p-5">
        <SectionTitle title={t("leaders.title")} />
        <p className="mt-1 text-sm text-muted-foreground">{t("leaders.subtitle")}</p>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title={t("leaders.scorersTitle")} />
        <ul className="mt-2 space-y-1">
          {scorers.map((r, i) => (
            <li
              key={r.key}
              className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-lg border px-2 py-2 text-sm"
            >
              <span className="text-muted-foreground">{i + 1}</span>
              <span className="min-w-0">
                <span className="truncate font-medium">{r.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {r.clubName}
                  {r.positionLabel ? ` · ${r.positionLabel}` : ""}
                </span>
              </span>
              <span className="text-right">
                <span className="font-semibold text-primary">{r.goals}</span>
                <span className="ml-1 text-xs text-muted-foreground">{t("leaders.colGoals")}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title={t("leaders.bookedTitle")} />
        <ul className="mt-2 space-y-1">
          {booked.map((r, i) => (
            <li
              key={r.key}
              className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-lg border px-2 py-2 text-sm"
            >
              <span className="text-muted-foreground">{i + 1}</span>
              <span className="min-w-0">
                <span className="truncate font-medium">{r.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{r.clubName}</span>
              </span>
              <span className="text-right text-xs text-muted-foreground">
                {t("leaders.yellowShort")} {r.yellow} · {t("leaders.redShort")} {r.red}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <DemoBadge />
    </div>
  );
}
