import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import { calculateClubFinance, checkWageCompliance, ClubFinanceReport, ClubBudget } from "@/domain/finance";
import { Panel, SectionTitle, EmptyState, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ClubFinance() {
  const { t } = useI18n();
  const clubs = footballProvider.clubs();
  const [selectedClub, setSelectedClub] = React.useState<string | null>(null);
  const [season, setSeason] = React.useState<number>(new Date().getFullYear());

  // 状态
  const [budget, setBudget] = React.useState<ClubBudget | null>(null);
  const [financeReport, setFinanceReport] = React.useState<ClubFinanceReport | null>(null);
  const [wagesInput, setWagesInput] = React.useState(0);
  const [transferFeesIn, setTransferFeesIn] = React.useState(0);
  const [transferFeesOut, setTransferFeesOut] = React.useState(0);

  // 计算财务报表
  const handleCalculate = () => {
    if (!selectedClub || !budget) return;

    const revenues = {
      ticket: budget.actualRevenue || 0,
      broadcast: 0, // 可从联赛数据获取
      commercial: 0 // 可从赞助数据获取
    };

    const transferTransactions = [
      { fee: transferFeesIn, direction: "in" },
      { fee: transferFeesOut, direction: "out" }
    ];

    const report = calculateClubFinance(
      selectedClub,
      season,
      revenues,
      wagesInput,
      transferTransactions
    );

    setFinanceReport(report);
  };

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <SectionTitle title={t("finance.clubFinanceTitle")} />

        {/* 俱乐部选择 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm text-muted-foreground mb-1">{t("finance.selectClub")}</label>
            <select
              value={selectedClub || ""}
              onChange={(e) => setSelectedClub(e.target.value || null)}
              className="w-full rounded border px-2 py-1 text-sm"
            >
              <option value="">选择俱乐部</option>
              {clubs.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1">{t("finance.season")}</label>
            <select
              value={season}
              onChange={(e) => setSeason(parseInt(e.target.value))}
              className="w-full rounded border px-2 py-1 text-sm"
            >
              <option value={new Date().getFullYear() - 1}>上赛季</option>
              <option value={new Date().getFullYear()}>本赛季</option>
              <option value={new Date().getFullYear() + 1}>下赛季</option>
            </select>
          </div>
        </div>

        {/* 预算设置 */}
        {selectedClub && budget && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm text-muted-foreground mb-1">{t("finance.budgetedRevenue")}</label>
              <input
                value={budget.budgetedRevenue.toLocaleString()}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setBudget(prev => ({ ...prev, budgetedRevenue: val }));
                }}
                type="number"
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1">{t("finance.actualRevenue")}</label>
              <input
                value={budget.actualRevenue?.toLocaleString() || "0"}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setBudget(prev => ({ ...prev, actualRevenue: val }));
                }}
                type="number"
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm text-muted-foreground mb-1">{t("finance.budgetedWages")}</label>
              <input
                value={budget.budgetedWages.toLocaleString()}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setBudget(prev => ({ ...prev, budgetedWages: val }));
                  setWagesInput(val);
                }}
                type="number"
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1">{t("finance.actualWages")}</label>
              <input
                value={budget.actualWages?.toLocaleString() || "0"}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setBudget(prev => ({ ...prev, actualWages: val }));
                  setWagesInput(val);
                }}
                type="number"
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
          </div>
        )}

        {/* 转会交易 */}
        {selectedClub && (
          <Panel className="p-4 mb-6">
            <SectionTitle title={t("finance.transferTransactions")} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1">{t("finance.transferIn")}</label>
                <input
                  value={transferFeesIn.toLocaleString()}
                  onChange={(e) => setTransferFeesIn(parseInt(e.target.value) || 0)}
                  type="number"
                  className="w-full rounded border px-2 py-1 text-sm"
                  min={0}
                  placeholder={t("finance.enterTransferFee")}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1">{t("finance.transferOut")}</label>
                <input
                  value={transferFeesOut.toLocaleString()}
                  onChange={(e) => setTransferFeesOut(parseInt(e.target.value) || 0)}
                  type="number"
                  className="w-full rounded border px-2 py-1 text-sm"
                  min={0}
                  placeholder={t("finance.enterTransferFee")}
                />
              </div>
            </div>
          </Panel>
        )}

        {/* 计算按钮 */}
        <Button
          onClick={handleCalculate}
          disabled={!selectedClub || !budget}
          className="w-full mt-3"
        >
          {t("finance.calculateReport")}
        </Button>
      </Panel>

      {/* 财务报表结果 */}
      {financeReport && (
        <Panel className="p-6">
          <SectionTitle title={t("finance.financeReport")} />
          
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {/* 票房收入 */}
            <StatTile
              title={t("finance.ticketRevenue")}
              value={financeReport.ticketRevenue.toLocaleString()}
              subtitle={t("finance.season")}
            />
            
            {/* 电视转播收入 */}
            <StatTile
              title={t("finance.broadcastRevenue")}
              value={financeReport.broadcastRevenue.toLocaleString()}
              subtitle={t("finance.season")}
            />
            
            {/* 商业收入 */}
            <StatTile
              title={t("finance.commercialRevenue")}
              value={financeReport.commercialRevenue.toLocaleString()}
              subtitle={t("finance.season")}
            />
            
            {/* 转会净收 */}
            <StatTile
              title={t("finance.transferNetIncome")}
              value={financeReport.transferNetIncome >= 0 ? `+${financeReport.transferNetIncome.toLocaleString()}` : financeReport.transferNetIncome.toLocaleString()}
              subtitle={t("finance.season")}
              variant={financeReport.transferNetIncome >= 0 ? "primary" : "destructive"}
            />
            
            {/* 薪资帽 */}
            <StatTile
              title={t("finance.salaryCap")}
              value={financeReport.salaryCap.toLocaleString()}
              subtitle={t("finance.compliance")}
            />
            
            {/* 总工资 */}
            <StatTile
              title={t("finance.totalWages")}
              value={financeReport.totalWages.toLocaleString()}
              subtitle={t("finance.season")}
            />
            
            {/* 薪资帽状态 */}
            <StatTile
              title={t("finance.wageOverspend")}
              value={financeReport.wageOverspend >= 0 ? `+${financeReport.wageOverspend.toLocaleString()}` : "0"}
              subtitle={financeReport.isWageCompliant ? t("finance.compliant") : t("finance.overspend")}
              variant={financeReport.isWageCompliant ? "primary" : "destructive"}
            />
            
            {/* 总净利润 */}
            <StatTile
              title={t("finance.profitLoss")}
              value={financeReport.profitLoss.toLocaleString()}
              subtitle={t("finance.season")}
              variant={financeReport.profitLoss >= 0 ? "primary" : "destructive"}
            />
          </div>
        </Panel>
      )}
    </div>
  );
}