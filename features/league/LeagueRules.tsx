import { useMemo, useState } from "react";
import { Panel, SectionTitle, EmptyState, DemoBadge, CHIP_CLASS, Crest } from "@/ui/primitives";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { customPointsTable, STANDARD_RULES, TWO_ONE_ZERO_RULES, ALL_OR_NOTHING_RULES, type PointsRules } from "@/domain/league";
import { cn, SEPARATOR, signed } from "@/lib/utils";

// M1023: the table, under different rules — the seed's own fixtures folded again under three
// win/draw/loss possibilities. The screen reads the fold and nothing else; every row below
// agrees with the standard-oil board the seed prints, because both folds read the same fixtures.

const PRESETS = [
  { id: "standard", rules: STANDARD_RULES, key: "rules.presetStandard" },
  { id: "twoOneZero", rules: TWO_ONE_ZERO_RULES, key: "rules.presetTwoOne" },
  { id: "allOrNothing", rules: ALL_OR_NOTHING_RULES, key: "rules.presetAll" },
] as const;

export function LeagueRules() {
  const { t } = useI18n();
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [compId, setCompId] = useState(() => competitions[0]?.id ?? "");
  const [presetId, setPresetId] = useState<(typeof PRESETS)[number]["id"]>("standard");

  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const rules: PointsRules = preset.rules;
  const board = useMemo(() => customPointsTable(compId, matches, clubs, rules), [compId, matches, clubs, rules]);
  const comp = competitions.find((c) => c.id === compId);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("rules.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("rules.subtitle")}</p>
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

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPresetId(p.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              presetId === p.id ? CHIP_CLASS.optionOn : CHIP_CLASS.optionOff,
            )}
          >
            {t(p.key)}
          </button>
        ))}
      </div>

      <Panel className="p-5">
        {board.rows.length === 0 ? (
          <EmptyState title={t("rules.none")} hint={t("rules.noneHint")} icon="🎲" />
        ) : (
          <>
            <SectionTitle title={t("rules.boardTitle", { comp: comp?.name ?? compId })} hint={t("rules.boardHint", { n: board.rows.length, m: board.matches, w: rules.win, d: rules.draw, l: rules.loss })} />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">{t("player.valueBoard.colRank")}</th>
                    <th className="py-2 pr-3 font-medium">{t("common.club")}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t("fw.table.p")}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t("mgr.wdl")}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t("rules.colGA")}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t("form.colPoints")}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t("rules.colShift")}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t("rules.colSway")}</th>
                  </tr>
                </thead>
                <tbody>
                  {board.rows.map((r) => {
                    const club = getClub(r.clubId);
                    return (
                      <tr key={r.clubId} className="border-t">
                        <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">{r.rulesPosition}</td>
                        <td className="py-1.5 pr-3">
                          <Link to={`/clubs/${r.clubId}`} className="flex min-w-0 items-center gap-2 hover:underline">
                            <Crest colors={club?.colors} short={club?.short} size={20} />
                            <div className="min-w-0">
                              <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                              <div className="text-xs text-muted-foreground">{t("rules.stdLine", { p: r.standardPoints, q: r.standardPosition })}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{r.played}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{r.won}{SEPARATOR}{r.drawn}{SEPARATOR}{r.lost}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{r.gf}{SEPARATOR}{r.ga}</td>
                        <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">{r.rulesPoints}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{signed(r.shift)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{signed(r.sway)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{t("rules.method")}</p>
          </>
        )}
      </Panel>
    </div>
  );
}
