import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, EmptyState, DemoBadge, Crest, CHIP_CLASS } from "@/ui/primitives";
import { footballProvider, getClub, playersByClub, recentMatchesForClub } from "@/data/footballService";
import { meanOverall, sum, maxBy } from "@/domain/attributes";
import { round1 } from "@/domain/scouting";
import { fmtMoney, cn, ABSENT } from "@/lib/utils";

type FormResult = "win" | "draw" | "loss";

interface ClubStat {
  id: string;
  name: string;
  size: number;
  avgOverall: number;
  value: number;
  avgAge: number;
  topPlayer: string;
  topOverall: number;
  form: FormResult[];
}

function clubStat(clubId: string): ClubStat | null {
  const club = getClub(clubId);
  if (!club) return null;
  const squad = playersByClub(clubId);
  const top = squad.length > 0 ? maxBy(squad, (p) => p.overall) : null;
  const form: FormResult[] = recentMatchesForClub(clubId, 5).map((m) => {
    const home = m.homeClubId === clubId;
    const gf = (home ? m.homeGoals : m.awayGoals) ?? 0;
    const ga = (home ? m.awayGoals : m.homeGoals) ?? 0;
    return gf > ga ? "win" : gf < ga ? "loss" : "draw";
  });
  return {
    id: club.id,
    name: club.name,
    size: squad.length,
    avgOverall: squad.length > 0 ? round1(meanOverall(squad, 0)) : 0,
    value: sum(squad, (p) => p.value),
    avgAge: squad.length > 0 ? round1(sum(squad, (p) => p.age) / squad.length) : 0,
    topPlayer: top ? top.name : "",
    topOverall: top ? top.overall : 0,
    form,
  };
}

export function ClubCompare() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [aId, setAId] = useState(() => clubs[0]?.id ?? "");
  const [bId, setBId] = useState(() => clubs[1]?.id ?? "");

  const a = useMemo(() => clubStat(aId), [aId]);
  const b = useMemo(() => clubStat(bId), [bId]);

  const formLabel = (r: FormResult): string =>
    r === "win" ? t("compare.club.resultWin") : r === "loss" ? t("compare.club.resultLoss") : t("compare.club.resultDraw");
  const formTone = (r: FormResult): string =>
    r === "win" ? CHIP_CLASS.success : r === "loss" ? CHIP_CLASS.destructive : CHIP_CLASS.muted;

  if (!a || !b) {
    return <EmptyState title={t("compare.club.title")} hint={t("compare.club.subtitle")} icon="⚖️" />;
  }

  const pick = (value: string, onChange: (v: string) => void, exclude: string) => (
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

  const row = (label: string, aVal: string, bVal: string, aBetter: boolean, bBetter: boolean) => (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("min-w-16 text-right", aBetter && "font-semibold text-primary")}>{aVal}</span>
      <span className={cn("min-w-16 text-right", bBetter && "font-semibold text-primary")}>{bVal}</span>
    </div>
  );

  const formRow = (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{t("compare.club.rowForm")}</span>
      {[a, b].map((c) => (
        <span key={c.id} className="flex justify-end gap-1">
          {c.form.length === 0 ? (
            <span className="text-xs text-muted-foreground">{t("compare.club.noForm")}</span>
          ) : (
            c.form.map((r, i) => (
              <span key={i} className={cn("rounded px-1.5 py-0.5 text-xs", formTone(r))}>
                {formLabel(r)}
              </span>
            ))
          )}
        </span>
      ))}
    </div>
  );

  const formPoints = (c: ClubStat) => sum(c.form, (r) => (r === "win" ? 3 : r === "draw" ? 1 : 0));

  return (
    <div className="space-y-5">
      <Panel className="p-5">
        <SectionTitle title={t("compare.club.title")} />
        <p className="mt-1 text-sm text-muted-foreground">{t("compare.club.subtitle")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{t("compare.club.pickA")}</span>
            {pick(aId, setAId, bId)}
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{t("compare.club.pickB")}</span>
            {pick(bId, setBId, aId)}
          </label>
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border pb-2">
          <span />
          <span className="flex min-w-16 items-center justify-end gap-1.5 text-sm font-medium">
            <Crest colors={getClub(a.id)?.colors} short={getClub(a.id)?.short} size={20} />
            <span className="max-w-28 truncate">{a.name}</span>
          </span>
          <span className="flex min-w-16 items-center justify-end gap-1.5 text-sm font-medium">
            <Crest colors={getClub(b.id)?.colors} short={getClub(b.id)?.short} size={20} />
            <span className="max-w-28 truncate">{b.name}</span>
          </span>
        </div>
        {row(t("compare.club.rowSize"), String(a.size), String(b.size), a.size > b.size, b.size > a.size)}
        {row(
          t("compare.club.rowAvgOverall"),
          String(a.avgOverall),
          String(b.avgOverall),
          a.avgOverall > b.avgOverall,
          b.avgOverall > a.avgOverall,
        )}
        {row(t("compare.club.rowValue"), fmtMoney(a.value), fmtMoney(b.value), a.value > b.value, b.value > a.value)}
        {row(t("compare.club.rowAvgAge"), String(a.avgAge), String(b.avgAge), false, false)}
        {row(
          t("compare.club.rowTopPlayer"),
          a.topOverall > 0 ? `${a.topPlayer} (${a.topOverall})` : ABSENT,
          b.topOverall > 0 ? `${b.topPlayer} (${b.topOverall})` : ABSENT,
          a.topOverall > b.topOverall,
          b.topOverall > a.topOverall,
        )}
        {formRow}
        {row(
          t("compare.club.rowFormPoints"),
          String(formPoints(a)),
          String(formPoints(b)),
          formPoints(a) > formPoints(b),
          formPoints(b) > formPoints(a),
        )}
      </Panel>

      <DemoBadge />
    </div>
  );
}
