import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge, CHIP_CLASS, BAR_FILL, DELTA_CLASS } from "@/ui/primitives";
import { footballProvider, getClub } from "@/data/footballService";
import { formTable, type FormLetter } from "@/domain/analytics";
import { maxBy, deltaSign } from "@/domain/attributes";
import { cn, ABSENT, SEPARATOR } from "@/lib/utils";

// The window is five matches; anything bigger is a season, anything smaller is a fixture.
function FormPips({ form }: { form: FormLetter[] }) {
  if (!form.length) return <span className="text-xs text-muted-foreground">{ABSENT}</span>;
  return (
    <span className="flex gap-0.5">
      {form.map((r, i) => (
        <span
          key={i}
          className={cn(
            "grid h-4 w-4 place-items-center rounded-[3px] text-[9px] font-bold text-white",
            r === "W" ? BAR_FILL.good : r === "L" ? BAR_FILL.bad : "bg-muted-foreground/60",
          )}
        >
          {r}
        </span>
      ))}
    </span>
  );
}

export function FormTable() {
  const { t } = useI18n();
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [compId, setCompId] = useState(() => competitions[0]?.id ?? "");

  const table = useMemo(() => formTable(compId, matches, clubs), [compId, matches, clubs]);
  const rows = table.rows;
  const active = rows.filter((r) => r.played > 0);
  const climber = active.length ? maxBy(active, (r) => r.climb) : null;
  const slide = active.length ? maxBy(active, (r) => -r.climb) : null;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("form.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("form.subtitle")}</p>
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

      {table.ranked === 0 ? (
        <Panel className="p-4">
          <EmptyState title={t("form.empty")} hint={t("form.emptyHint")} icon="📈" />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label={t("form.window")} value={table.matches} sub={t("form.windowSub", { n: table.window })} />
            <StatTile
              label={t("form.climber")}
              value={climber && climber.climb > 0 ? climber.climb : ABSENT}
              sub={
                climber && climber.climb > 0
                  ? t("form.climberSub", { c: getClub(climber.clubId)?.short ?? ABSENT, n: climber.climb })
                  : t("form.none")
              }
              tone="up"
            />
            <StatTile
              label={t("form.slide")}
              value={slide && slide.climb < 0 ? Math.abs(slide.climb) : ABSENT}
              sub={
                slide && slide.climb < 0
                  ? t("form.slideSub", { c: getClub(slide.clubId)?.short ?? ABSENT, n: -slide.climb })
                  : t("form.none")
              }
              tone="down"
            />
            <StatTile
              label={t("form.sharpest")}
              value={active.length ? Math.max(...active.map((r) => r.points)) : 0}
              sub={t("form.sharpestSub", { n: table.window })}
              tone="up"
            />
          </div>

          <Panel className="p-5">
            <SectionTitle title={t("form.boardTitle")} hint={t("form.boardHint")} />
            <ul className="mt-2 space-y-1">
              {rows.map((r) => {
                const club = getClub(r.clubId);
                const idle = r.played === 0;
                return (
                  <li
                    key={r.clubId}
                    className={cn(
                      "grid items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                      "grid-cols-[1.6rem_1fr_auto] sm:grid-cols-[1.6rem_1fr_auto_auto_auto_auto_auto_auto]",
                      idle && "opacity-60",
                    )}
                  >
                    <span className="text-right tabular-nums text-muted-foreground">{idle ? ABSENT : r.formPosition}</span>
                    <div className="flex min-w-0 items-center gap-2">
                      <Crest colors={club?.colors} short={club?.short} size={26} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <FormPips form={r.form} />
                          {idle && <span>{t("form.idle")}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right tabular-nums text-xs text-muted-foreground">
                      {idle ? ABSENT : t("form.recordLine", { w: r.won, d: r.drawn, l: r.lost })}
                    </div>
                    <div className="hidden text-right tabular-nums text-xs text-muted-foreground sm:block">
                      {idle ? ABSENT : `${r.gf}${SEPARATOR}${r.ga}`}
                    </div>
                    <div className="hidden text-right tabular-nums sm:block">
                      {idle ? ABSENT : r.homePoints}
                      <div className="text-[10px] text-muted-foreground">{idle ? ABSENT : t("form.homePld", { n: r.homePlayed })}</div>
                    </div>
                    <div className="hidden text-right tabular-nums sm:block">
                      {idle ? ABSENT : r.awayPoints}
                      <div className="text-[10px] text-muted-foreground">{idle ? ABSENT : t("form.awayPld", { n: r.awayPlayed })}</div>
                    </div>
                    <div className="hidden text-right tabular-nums sm:block">
                      {r.points}
                      <div className="text-xs text-muted-foreground">{t("form.colPoints")}</div>
                    </div>
                    <div className={cn("hidden text-right text-xs sm:block", DELTA_CLASS[deltaSign(r.climb)])}>
                      {idle
                        ? ABSENT
                        : r.climb > 0
                          ? t("form.moveUp", { n: r.climb })
                          : r.climb < 0
                            ? t("form.moveDown", { n: -r.climb })
                            : t("form.moveSame")}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("form.method", { n: table.window })}</p>
          </Panel>
        </>
      )}
    </div>
  );
}
