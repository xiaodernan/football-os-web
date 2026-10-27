import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function AdvancedFinancialAnalyst() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      revenue: {
        ticket: Math.floor(Math.random() * 80000000) + 10000000,
        broadcast: Math.floor(Math.random() * 100000000) + 30000000,
        commercial: Math.floor(Math.random() * 40000000) + 15000000,
      },
      expenses: {
        wages: Math.floor(Math.random() * 120000000) + 80000000,
        transferSpending: Math.floor(Math.random() * 50000000) + 20000000,
        stadiumMaintenance: Math.floor(Math.random() * 20000000) + 5000000,
        youthAcademy: Math.floor(Math.random() * 10000000) + 2000000,
      },
      calculateNetProfit: function() {
        const totalRevenue = this.revenue.ticket + this.revenue.broadcast + this.revenue.commercial;
        const totalExpenses = this.expenses.wages + this.expenses.transferSpending + this.expenses.stadiumMaintenance + this.expenses.youthAcademy;
        return totalRevenue - totalExpenses;
      },
    }));
  }, [clubs]);

  const selectedClubData = clubData.find(c => c.id === selectedClub);
  if (selectedClubData) {
    selectedClubData.calculateNetProfit();
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
        <div className="grid grid-cols-3 gap-3">
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

      {/* 损益账户 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.profitLoss")} />
        <div className="grid grid-cols-3 gap-3">
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
            value={club.netProfit >= 0 ? `+${t("currency.euro")} ${club.netProfit.toLocaleString()}` : `-${t("currency.euro")} ${Math.abs(club.netProfit).toLocaleString()}`}
            variant={club.netProfit >= 0 ? "primary" : "destructive"}
          />
        </div>
      </Panel>

      {/* 支出明细 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.expensesBreakdown")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("manager.wages")}
            value={`-${t("currency.euro")} ${club.expenses.wages.toLocaleString()}`}
            subtitle={t("manager.wagesDesc")}
          />
          <StatTile
            title={t("manager.transferSpending")}
            value={`-${t("currency.euro")} ${club.expenses.transferSpending.toLocaleString()}`}
            subtitle={t("manager.transferSpendingDesc")}
          />
          <StatTile
            title={t("manager.stadiumMaintenance")}
            value={`-${t("currency.euro")} ${club.expenses.stadiumMaintenance.toLocaleString()}`}
            subtitle={t("manager.stadiumMaintenanceDesc")}
          />
          <StatTile
            title={t("manager.youthAcademy")}
            value={`-${t("currency.euro")} ${club.expenses.youthAcademy.toLocaleString()}`}
            subtitle={t("manager.youthAcademyDesc")}
          />
        </div>
      </Panel>

      {/* 财务健康评级 */}
      <Panel className="p-4">
        <SectionTitle title={t("manager.financialHealth")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("manager.revenueGrowth")}
            value="20%"
            subtitle={t("manager.healthy")}
          />
          <StatTile
            title={t("manager.liquidityRatio")}
            value="2.5"
            subtitle={t("manager.strong")}
          />
          <StatTile
            title={t("manager.solvencyRatio")}
            value="2.0"
            subtitle={t("manager.good")}
          />
        </div>
      </Panel>
    </Panel>
  );
}