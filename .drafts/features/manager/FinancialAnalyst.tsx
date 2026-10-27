import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function FinancialAnalyst() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      totalRevenue: Math.floor(Math.random() * 100000000) + 50000000,
      totalExpenses: Math.floor(Math.random() * 80000000) + 30000000,
      totalAssets: Math.floor(Math.random() * 200000000) + 100000000,
      totalLiabilities: Math.floor(Math.random() * 50000000) + 10000000,
      equity: 0, // will calculate
    }));
  }, [clubs]);

  // 计算所有权权益
  const calculateEquity = (club: any) => {
    club.equity = club.totalAssets - club.totalLiabilities;
    return club.equity;
  };

  const selectedClubData = clubData.find(c => c.id === selectedClub);
  if (selectedClubData) {
    calculateEquity(selectedClubData);
  }

  if (!selectedClub) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("manager.financialAnalystTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("manager.selectClubToAnalyze")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {clubs.map(c => (
            <Button
              key={c.id}
              variant="outline"
              size="sm"
              onClick={() => setSelectedClub(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </Panel>
    );
  }

  const club = selectedClubData!;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.financialAnalystTitle")} />
      
      {/* 资产负债表 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.balanceSheet")} />
        <div className="grid grid-cols-2 gap-4">
          <StatTile
            title={t("manager.totalAssets")}
            value={`${t("currency.euro")} ${club.totalAssets.toLocaleString()}`}
            subtitle={t("manager.totalAssetsDesc")}
          />
          <StatTile
            title={t("manager.totalLiabilities")}
            value={`-${t("currency.euro")} ${club.totalLiabilities.toLocaleString()}`}
            subtitle={t("manager.totalLiabilitiesDesc")}
            variant="destructive"
          />
          <StatTile
            title={t("manager.equity")}
            value={club.equity >= 0 ? `+${t("currency.euro")} ${club.equity.toLocaleString()}` : `-${t("currency.euro")} ${Math.abs(club.equity).toLocaleString()}`}
            variant={club.equity >= 0 ? "primary" : "destructive"}
          />
        </div>
      </Panel>

      {/* 损益概览 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.profitLoss")} />
        <div className="grid grid-cols-2 gap-4">
          <StatTile
            title={t("manager.totalRevenue")}
            value={`${t("currency.euro")} ${club.totalRevenue.toLocaleString()}`}
            subtitle={t("manager.totalRevenueDesc")}
          />
          <StatTile
            title={t("manager.totalExpenses")}
            value={`-${t("currency.euro")} ${club.totalExpenses.toLocaleString()}`}
            subtitle={t("manager.totalExpensesDesc")}
            variant="destructive"
          />
          <StatTile
            title={t("manager.netProfit")}
            value={club.totalRevenue - club.totalExpenses >= 0 ? `+${t("currency.euro")} ${(club.totalRevenue - club.totalExpenses).toLocaleString()}` : `-${t("currency.euro")} ${Math.abs(club.totalRevenue - club.totalExpenses).toLocaleString()}`}
            variant={club.totalRevenue - club.totalExpenses >= 0 ? "primary" : "destructive"}
          />
        </div>
      </Panel>

      {/* 财务健康评级 */}
      <Panel className="p-4">
        <SectionTitle title={t("manager.financialHealth")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("manager.revenueGrowth")}
            value="15%"
            subtitle={t("manager.healthy")}
          />
          <StatTile
            title={t("manager.liquidityRatio")}
            value="2.1"
            subtitle={t("manager.good")}
          />
          <StatTile
            title={t("manager.solvencyRatio")}
            value="1.8"
            subtitle={t("manager.satisfactory")}
          />
        </div>
      </Panel>
    </Panel>
  );
}