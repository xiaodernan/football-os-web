import { useMemo } from "react";
import { Panel, SectionTitle, StatTile, Crest, DemoBadge, BAR_FILL } from "@/ui/primitives";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { clubFinance } from "@/domain/finance";
import { deltaSign } from "@/domain/attributes";
import type { TileTone } from "@/ui/primitives";
import { cn, fmtMoney, pctOf, fmt2 } from "@/lib/utils";

// M1022: the balance sheet, at world scale — the one screen a devoted manager's finance desk
// always wanted and the lane never reached: the same seeded world's money, read as a walk,
// folded on every render and handed to the glass as-is. Every figure here is derivable from the
// seeded club and player records; nothing was keyed by hand.

export function FinanceBoard() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);
  // Every figure is folded here in one walk; the screen prints what it was handed.
  const world = useMemo(() => clubFinance(clubs, players), [clubs, players]);
  const peak = world.rows.length ? Math.max(...world.rows.map((r) => Math.abs(r.net)), 1) : 1;
  // The tone rides the sign door — a difference's sign is one question, asked once.
  const netSign = deltaSign(world.net);
  const netTone: TileTone = netSign === "flat" ? "neutral" : netSign;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("fin.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("fin.subtitle")}</p>
      </div>

      <Panel className="p-5">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label={t("fin.tileClubs")} value={world.clubs} sub={t("fin.tileClubsSub")} />
          <StatTile label={t("fin.tileRevenue")} value={fmtMoney(world.revenue)} sub={t("fin.tileRevenueSub", { v: fmtMoney(world.squadValue) })} />
          <StatTile label={t("fin.tileWages")} value={fmtMoney(world.wages)} sub={t("fin.tileWagesSub", { p: fmt2(world.wageRatio * 100) })} />
          <StatTile label={t("fin.tileNet")} value={fmtMoney(world.net)} sub={t("fin.tileNetSub", { a: fmtMoney(world.amortize) })} tone={netTone} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("fin.worldLine")}</p>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title={t("fin.boardTitle")} hint={t("fin.boardHint", { n: world.clubs })} />
        <ul className="mt-2 space-y-1">
          {world.rows.map((r, i) => {
            const club = getClub(r.clubId);
            const profit = r.net >= 0;
            return (
              <li
                key={r.clubId}
                className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto_minmax(120px,200px)]"
              >
                <span className="text-muted-foreground">{i + 1}</span>
                <div className="flex min-w-0 items-center gap-2">
                  <Link to={`/clubs/${r.clubId}`} className="flex min-w-0 items-center gap-2 hover:underline">
                    <Crest colors={club?.colors} short={club?.short} size={22} />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("fin.rowLine", { m: fmtMoney(r.matchday), b: fmtMoney(r.broadcast), c: fmtMoney(r.commercial), w: fmtMoney(r.wages), s: fmtMoney(r.squadValue), a: fmtMoney(r.amortize), v: fmtMoney(r.revenue) })}
                      </div>
                    </div>
                  </Link>
                </div>
                <div className="text-right tabular-nums">
                  <div className={cn("font-semibold", profit ? "text-success" : "text-destructive")}>{t(profit ? "fin.netPlus" : "fin.netMinus", { v: fmtMoney(Math.abs(r.net)) })}</div>
                  <div className="text-xs text-muted-foreground">{t("fin.wageShare", { p: fmt2(r.wageRatio * 100) })}</div>
                </div>
                <div className="hidden sm:block">
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={cn("h-2 rounded-full", profit ? BAR_FILL.good : BAR_FILL.bad)}
                      style={{ width: pctOf(Math.abs(r.net), peak) }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">{t("fin.method")}</p>
      </Panel>
    </div>
  );
}
