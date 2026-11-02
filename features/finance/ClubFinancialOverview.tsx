import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubFinancialOverview() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      played: c.matchesPlayed || 38,
      won: c.wins || 0,
      drawn: c.draws || 0,
      lost: c.losses || 0,
      goalsFor: c.goalsFor || 0,
      goalsAgainst: c.goalsAgainst || 0,
      points: c.points || 0,
      marketValue: c.marketValue || 0,
      wageBill: c.wageBill || 0,
    }));
  }, [clubs]);

  const sortedClubs = useMemo(
    () => [...clubData].sort((a, b) => b.marketValue - a.marketValue),
    [clubData]
  );

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("clubFinancialOverview.title")} />
        <p className="text-muted-foreground mb-4">
          {t("clubFinancialOverview.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("clubFinancialOverview.title")} />

      {/* 联盟财务概览 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("clubFinancialOverview.leagueOverview")} />
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            title={t("clubFinancialOverview.totalClubs")}
            value={clubs.length}
            subtitle={t("clubFinancialOverview.league")}
          />
          <StatTile
            title={t("clubFinancialOverview.totalMarketValue")}
            value={t("currency.euro", {
              amount: clubData.reduce((sum, c) => sum + c.marketValue, 0),
            })}}
          />
          <StatTile
            title={t("clubFinancialOverview.totalWageBill")}
            value={t("currency.euro", {
              amount: clubData.reduce((sum, c) => sum + c.wageBill, 0),
            })}}
          />
        </div>
      </Panel>

      {/* 俱乐部排名 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("clubFinancialOverview.clubRanking")} />
        <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
          {sortedClubs.map((c, i) => (
            <li key={c.id} className="font-medium text-primary mb-1">
              {t("clubFinancialOverview.position", { position: i + 1 })}:
              {t("clubFinancialOverview.{name}", { name: c.name })} - {t("currency.euro", { amount: c.marketValue })}市值 - {t("currency.euro", { amount: c.wageBill })}薪资</li>
          ))}
        </ol>
      </Panel>

      {/* 俱乐部详情 */}
      <Panel className="p-4">
        <SectionTitle title={t("clubFinancialOverview.clubDetails")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium text-primary">{t("clubFinancialOverview.name")}</div>
            <div className="text-2xl text-primary">{clubs[0]?.name || ''}</div>
          </div>
          <div>
            <div className="font-medium text-primary">{t("clubFinancialOverview.marketValue")}</div>
            <div>{t("currency.euro", { amount: clubs[0]?.marketValue || 0 })}</div>
          </div>
        </div>

        <div className="mt-3">
          <div className="font-medium text-primary">{t("clubFinancialOverview.points")}</div>
          <div className="text-3xl text-primary">{clubs[0]?.points || 0}分</div>
        </div>

        <div className="mt-3">
          <div className="font-medium text-primary">{t("clubFinancialOverview.goalDifference")}</div>
          <div>
            {clubs[0]?.goalsFor - clubs[0]?.goalsAgainst >= 0 ? `+${clubs[0]?.goalsFor - clubs[0]?.goalsAgainst}` : clubs[0]?.goalsFor - clubs[0]?.goalsAgainst}
          </div>
        </div>
      </Panel>

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("clubFinancialOverview.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("clubFinancialOverview.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("clubFinancialOverview.totalPlayers", { count: footballProvider.players().length })} 名球员</p>
      </Panel>
    </Panel>
  );
}