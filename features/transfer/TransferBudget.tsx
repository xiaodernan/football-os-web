import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TransferBudget() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

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
      marketCap: Math.floor(Math.random() * 500000000) + 100000000,
      wageBill: Math.floor(Math.random() * 100000000) + 20000000,
    }));
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!clubData.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("transferBudget.title")} />
        <p className="text-muted-foreground mb-4">
          {t("transferBudget.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("transferBudget.title")} />

      {/* 选中的俱乐部 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || '' : '全联盟'}</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div>{t("transferBudget.selectClub")}</div>
        </div>
      </div>

      {/* 转会预算概览 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("transferBudget.budgetOverview")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("transferBudget.marketCap")}
            value={selectedClub ? clubData.find(c => c.id === selectedClub)?.marketCap.toLocaleString() : '—'}
            subtitle={t("transferBudget.marketValue")}
          />
          <StatTile
            title={t("transferBudget.wageBill")}
            value={selectedClub ? clubData.find(c => c.id === selectedClub)?.wageBill.toLocaleString() : '—'}
            subtitle={t("transferBudget.salaryBill")}
          />
        </div>
      </Panel>

      {/* 预算使用情况 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("transferBudget.budgetUsage")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("transferBudget.remainingBudget", { remaining: 100 })}</p>
        <div className="progress-bar bg-gray-200 h-2 rounded">
          <div
            className={`progress-bar-fill bg-primary h-2 rounded`}
            style={{ width: "60%" }}
          >
            <span>60% 已使用</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t("transferBudget.spent", { spent: 40 })}</p>
      </Panel>

      {/* 转会历史 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("transferBudget.transferHistory")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("transferBudget.lastSeasonTransfers")}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>{t("transferBudget.purchase1", { amount: t("currency.euro")} {Math.floor(Math.random() * 50000000) + 10000000})}</li>
          <li>{t("transferBudget.sale1", { amount: t("currency.euro")} {Math.floor(Math.random() * 30000000) + 5000000})}</li>
          <li>{t("transferBudget.loan1")}</li>
        </ul>
      </Panel>

      {/* 财务规划 */}
      <Panel className="p-4">
        <SectionTitle title={t("transferBudget.financialPlanning")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("transferBudget.futureStrategy")}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>{t("transferBudget.youthInvestment")}</li>
          <li>{t("transferBudget.experiencedPlayers")}</li>
          <li>{t("transferBudget.balanceSquad")}</li>
        </ul>
        <p className="text-xs text-primary mt-2">
          {t("transferBudget.budgetManagement")}</p>
      </Panel>

      {/* 联盟对比 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("transferBudget.leagueComparison")} />
        <p className="text-sm text-muted-foreground">
          {t("transferBudget.leagueMarketCaps")}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>{t("transferBudget.highestMarketCap")}</li>
          <li>{t("transferBudget.lowestMarketCap")}</li>
          <li>{t("transferBudget.avgWageBill")}</li>
        </ul>
      </Panel>
    </Panel>
  );
}