import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SalaryCapAnalysis() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      payroll: Math.floor(Math.random() * 200000000) + 80000000,
      salaryCap: Math.floor(Math.random() * 100000000) + 50000000,
    }));
  }, [clubs]);

  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  const handleSelectClub = (clubId: string) => {
    setSelectedClubId(clubId);
  };

  if (!selectedClubId) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("manager.salaryCapTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("manager.selectClubToAnalyze")}
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

  const club = clubData.find(c => c.id === selectedClubId)!;

  const isOverBudget = club.payroll > club.salaryCap;
  const overspendAmount = isOverBudget ? club.payroll - club.salaryCap : 0;
  const complianceRate = club.payroll > 0 ? (club.salaryCap / club.payroll) * 100 : 100;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.salaryCapTitle")} />
      
      {/* 薪资概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("manager.payroll")}
          value={`${t("currency.euro")} ${club.payroll.toLocaleString()}`}
          subtitle={t("manager.totalPayroll")}
        />
        <StatTile
          title={t("manager.salaryCap")}
          value={`${t("currency.euro")} ${club.salaryCap.toLocaleString()}`}
          subtitle={t("manager.salaryCapDesc")}
        />
      </div>

      {/* 薪资状态 */}
      <Panel className="p-4 mb-6" style={{ borderColor: isOverBudget ? "red" : "green" }}>
        <SectionTitle title={t("manager.budgetStatus")} />
        <StatTile
          title={t("manager.budgetStatus")}
          value={isOverBudget ? t("manager.overBudget") : t("manager.budgetCompliant")}
          variant={isOverBudget ? "destructive" : "primary"}
        />
        <p className="text-sm text-muted-foreground mb-3">
          {t("manager.budgetStatusDesc", { rate: complianceRate.toFixed(1) })}
        </p>
      </Panel>

      {/* 超支详情 */}
      {isOverBudget && (
        <Panel className="p-4">
          <SectionTitle title={t("manager.overspendDetails")} />
          <p className="text-warning mb-3">
            {t("manager.overspendAmount", { amount: overspendAmount.toLocaleString() })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("manager.overspendCause")}
          </p>
        </Panel>
      )}
    </Panel>
  );
}