import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubFinancialModel() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      revenue: Math.floor(Math.random() * 200000000) + 50000000,
      wageBill: Math.floor(Math.random() * 150000000) + 30000000,
      transferSpending: Math.floor(Math.random() * 100000000) + 20000000,
      transferIncome: Math.floor(Math.random() * 80000000) + 10000000,
      stadiumRevenue: Math.floor(Math.random() * 50000000) + 15000000,
      matchDayRevenue: Math.floor(Math.random() * 30000000) + 8000000,
      broadcastingRevenue: Math.floor(Math.random() * 60000000) + 25000000,
      commercialRevenue: Math.floor(Math.random() * 40000000) + 12000000,
      assets: Math.floor(Math.random() * 500000000) + 200000000,
      liabilities: Math.floor(Math.random() * 300000000) + 80000000,
    }));
  }, [clubs]);

  // 计算净资产
  clubData.forEach(c => {
    c.netWorth = c.assets - c.liabilities;
    c.profitLoss = c.revenue - c.wageBill - c.transferSpending + c.transferIncome;
  });

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!selectedClub) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("clubFinance.title") } />
        <p className="text-muted-foreground mb-4">
          {t("clubFinance.selectClub")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {clubs.map(c => (
            <Button
              key={c.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectClub(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </Panel>
    );
  }

  const c = clubData.find(club => club.id === selectedClub)!;

  // 财务比率
  const currentRatio = useMemo(() => {
    const currentAssets = c.revenue + c.stadiumRevenue + c.matchDayRevenue;
    const currentLiabilities = c.liabilities;
    return Number((currentAssets / currentLiabilities).toFixed(2));
  }, [c.revenue, c.stadiumRevenue, c.matchDayRevenue, c.liabilities]);

  const debtToValue = useMemo(() => {
    return c.liabilities > 0 ? Number((c.liabilities / c.assets * 100).toFixed(1)) : 0;
  }, [c.liabilities, c.assets]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("clubFinance.title") } />

      {/* 俱乐部画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("clubFinance.clubInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("clubFinance.name")}</div>
              <div className="text-2xl font-bold text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("clubFinance.founded")}</div>
              <div className="text-muted-foreground">1900</div>
            </div>
            <div>
              <div className="font-medium">{t("clubFinance.league")}</div>
              <div className="text-info">{t(`league.${Math.floor(Math.random() * 5 + 1)}`)}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("clubFinance.financialOverview") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("clubFinance.revenue")}</div>
              <div className="text-2xl text-success">{t("currency.euro")} {c.revenue.toLocaleString()}</div>
            </div>
            <div>
              <div className="font-medium">{t("clubFinance.wageBill")}</div>
              <div className="text-primary">{t("currency.euro")} {c.wageBill.toLocaleString()}/w</div>
            </div>
            <div>
              <div className="font-medium">{t("clubFinance.netWorth")}</div>
              <div className={c.netWorth >= 0 ? "text-success" : "text-danger"}>
                {t("currency.euro")} {c.netWorth.toLocaleString()}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 收入支出明细 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("clubFinance.revenueStreams") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("clubFinance.stadiumRevenue")}</div>
            <div className="text-primary">{t("currency.euro")} {c.stadiumRevenue.toLocaleString()}</div>
          </div>
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("clubFinance.broadcastingRevenue")}</div>
            <div className="text-primary">{t("currency.euro")} {c.broadcastingRevenue.toLocaleString()}</div>
          </div>
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("clubFinance.commercialRevenue")}</div>
            <div className="text-primary">{t("currency.euro")} {c.commercialRevenue.toLocaleString()}</div>
          </div>
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("clubFinance.matchDayRevenue")}</div>
            <div className="text-primary">{t("currency.euro")} {c.matchDayRevenue.toLocaleString()}</div>
          </div>
        </div>
      </Panel>

      {/* 支出分析 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("clubFinance.expenseAnalysis") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("clubFinance.wageBill")}</div>
            <div className="text-danger">{t("currency.euro")} {c.wageBill.toLocaleString()}</div>
          </div>
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("clubFinance.transferSpending")}</div>
            <div className="text-warning">{t("currency.euro")} {c.transferSpending.toLocaleString()}</div>
          </div>
        </div>
      </Panel>

      {/* 财务健康状况 */}
      <Panel className="p-4">
        <SectionTitle title={t("clubFinance.financialHealth") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium">{t("clubFinance.currentRatio")}</div>
            <div className={c.currentRatio >= 1.5 ? "text-success" : c.currentRatio >= 1.0 ? "text-warning" : "text-danger"}>
              {c.currentRatio.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="font-medium">{t("clubFinance.debtToValueRatio")}</div>
            <div className={debtToValue <= 40 ? "text-success" : debtToValue <= 70 ? "text-warning" : "text-danger"}>
              {debtToValue}%
            </div>
          </div>
          <div>
            <div className="font-medium">{t("clubFinance.profitLoss")}</div>
            <div className={c.profitLoss >= 0 ? "text-success" : "text-danger"}>
              {t("currency.euro")} {c.profitLoss.toLocaleString()}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t(`financialStatus.${c.profitLoss >= 0 && c.currentRatio >= 1.5 ? "healthy" : c.profitLoss >= 0 || c.currentRatio >= 1.0 ? "moderate" : "atRisk"}`)}
        </p>
      </Panel>
    </Panel>
  );
}