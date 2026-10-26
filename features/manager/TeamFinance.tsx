import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TeamFinance() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      revenue: {
        ticket: Math.floor(Math.random() * 50000000) + 5000000,
        broadcast: Math.floor(Math.random() * 80000000) + 20000000,
        commercial: Math.floor(Math.random() * 30000000) + 10000000
      },
      expenses: {
        wages: Math.floor(Math.random() * 100000000) + 60000000,
        transferSpending: Math.floor(Math.random() * 40000000) + 10000000,
        stadiumMaintenance: Math.floor(Math.random() * 15000000) + 3000000
      },
      netProfit: 0 // will calculate
    }));
  }, [clubs]);

  // 计算净利润
  const calculateNetProfit = (club: any) => {
    const totalRevenue = club.revenue.ticket + club.revenue.broadcast + club.revenue.commercial;
    const totalExpenses = club.expenses.wages + club.expenses.transferSpending + club.expenses.stadiumMaintenance;
    return totalRevenue - totalExpenses;
  };

  if (!selectedClub) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("manager.teamFinanceTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("manager.selectClubToViewFinance")}
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

  const club = clubData.find(c => c.id === selectedClub)!;
  club.netProfit = calculateNetProfit(club);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.teamFinanceTitle")} />
      
      {/* 收入概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("revenue.ticketSales")}
          value=`${t("currency.euro")} ${club.revenue.ticket.toLocaleString()}`
          subtitle={t("revenue.matchDay")}
        />
        <StatTile
          title={t("revenue.broadcast")}
          value=`${t("currency.euro")} ${club.revenue.broadcast.toLocaleString()}`
          subtitle={t("revenue.tvDeal")}
        />
        <StatTile
          title={t("revenue.commercial")}
          value=`${t("currency.euro")} ${club.revenue.commercial.toLocaleString()}`
          subtitle={t("revenue.sponsorship")}
        />
      </div>

      {/* 支出概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("expenses.wages")}
          value=`-${t("currency.euro")} ${club.expenses.wages.toLocaleString()}`
          subtitle={t("playerWages")}
          variant="destructive"
        />
        <StatTile
          title={t("expenses.transferSpending")}
          value=`-${t("currency.euro")} ${club.expenses.transferSpending.toLocaleString()}`
          subtitle={t("transferFees")}
          variant="destructive"
        />
        <StatTile
          title={t("expenses.stadiumMaintenance")}
          value=`-${t("currency.euro")} ${club.expenses.stadiumMaintenance.toLocaleString()}`
          subtitle={t("stadiumUpkeep")}
        />
      </div>

      {/* 净利润 */}
      <Panel className="p-4 mt-6" style={{ borderTop: '1px solid var(--primary)' }}>
        <SectionTitle title={t("netProfit")} />
        <StatTile
          title={t("netProfitTotal")}
          value={club.netProfit >= 0 ? `+${t("currency.euro")} ${club.netProfit.toLocaleString()}` : `-${t("currency.euro")} ${Math.abs(club.netProfit).toLocaleString()}`}
          variant={club.netProfit >= 0 ? "primary" : "destructive"}
        />
        <p className="text-sm text-muted-foreground mt-2">
          {t(club.netProfit >= 0 ? "profit" : "loss")}
        </p>
      </Panel>
    </Panel>
  );
}