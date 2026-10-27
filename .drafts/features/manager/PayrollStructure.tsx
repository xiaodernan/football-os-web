import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PayrollStructure() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      totalPayroll: Math.floor(Math.random() * 200000000) + 80000000,
      avgWeeklyWage: Math.floor(Math.random() * 50000) + 20000,
      highEarners: Math.floor(Math.random() * 5) + 2,
    }));
  }, [clubs]);

  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  const handleSelectClub = (clubId: string) => {
    setSelectedClubId(clubId);
  };

  if (!selectedClubId) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("manager.payrollStructureTitle")} />
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

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.payrollStructureTitle")} />
      
      {/* 薪资概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("manager.totalPayroll")}
          value={`${t("currency.euro")} ${club.totalPayroll.toLocaleString()}`}
          subtitle={t("manager.totalPayrollDesc")}
        />
        <StatTile
          title={t("manager.avgWeeklyWage")}
          value={`${t("currency.euro")} ${club.avgWeeklyWage.toLocaleString()}/w`}
          subtitle={t("manager.avgWeeklyWageDesc")}
        />
      </div>

      {/* 高薪球员 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.highEarners")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("manager.highEarnersCount", { count: club.highEarners })}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("manager.highEarnersDesc")}
        </p>
      </Panel>

      {/* 薪资分布 */}
      <Panel className="p-4">
        <SectionTitle title={t("manager.salaryDistribution")} />
        <p className="text-sm text-muted-foreground">
          {t("manager.salaryDistributionDesc")}
        </p>
        <Button variant="outline" size="sm">
          {t("manager.analyzeStructure")}
        </Button>
      </Panel>
    </Panel>
  );
}