import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TeamTransferHistory() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      transfersIn: Math.floor(Math.random() * 50) + 10,
      transfersOut: Math.floor(Math.random() * 40) + 5,
      totalSpend: Math.floor(Math.random() * 200000000) + 50000000,
      totalIncome: Math.floor(Math.random() * 150000000) + 20000000,
    }));
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!selectedClub) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("teamTransferHistory.title") } />
        <p className="text-muted-foreground mb-4">
          {t("teamTransferHistory.selectClub")}
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
          ))
        </div>
      </Panel>
    );
  }

  const c = clubData.find(club => club.id === selectedClub)!;

  // 计算净支出
  const netSpend = c.totalSpend - c.totalIncome;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("teamTransferHistory.title") } />

      {/* 俱乐部画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("teamTransferHistory.clubInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("teamTransferHistory.name")}</div>
              <div className="text-2xl font-bold text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("teamTransferHistory.totalSpend")}</div>
              <div>{t("currency.euro")} {c.totalSpend.toLocaleString()}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("teamTransferHistory.transferSummary") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("teamTransferHistory.transfersIn")}</div>
              <div>{c.transfersIn}</div>
            </div>
            <div>
              <div className="font-medium">{t("teamTransferHistory.transfersOut")}</div>
              <div>{c.transfersOut}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 转会财务 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("teamTransferHistory.financialSummary") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("teamTransferHistory.totalSpend")}</div>
            <div>{t("currency.euro")} {c.totalSpend.toLocaleString()}</div>
          </div>
          <div>
            <div className="font-medium">{t("teamTransferHistory.totalIncome")}</div>
            <div>{t("currency.euro")} {c.totalIncome.toLocaleString()}</div>
          </div>
        </div>
        <div>
          <div className="font-medium text-{netSpend >= 0 ? "text-success" : "text-danger"}">
            {t("teamTransferHistory.netSpend", { amount: t("currency.euro")} {Math.abs(netSpend).toLocaleString() })}</div>
          <p>{t("teamTransferHistory.netSpendDescription", { direction: netSpend >= 0 ? "净投资" : "净收益" })}</p>
        </div>
      </Panel>

      {/* 近期转会概览 */}
      <Panel className="p-4">
        <SectionTitle title={t("teamTransferHistory.recentActivity") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("teamTransferHistory.lastSeasonActivity")}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>{t("teamTransferHistory.mostExpensiveIn", { amount: t("currency.euro")} {Math.floor(Math.random() * 100000000) + 10000000 })}</li>
          <li>{t("teamTransferHistory.mostExpensiveOut", { amount: t("currency.euro")} {Math.floor(Math.random() * 80000000) + 5000000 })}</li>
          <li>{t("teamTransferHistory.balance", { direction: netSpend >= 0 ? "投资" : "收益" })}</li>
        </ul>
      </Panel>
    </Panel>
  );
}