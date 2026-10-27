import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function BudgetPlanning() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      totalBudget: Math.floor(Math.random() * 300000000) + 100000000,
      spentBudget: Math.floor(Math.random() * 150000000) + 50000000,
      remainingBudget: Math.floor(Math.random() * 100000000) + 20000000,
    }));
  }, [clubs]);

  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  const handleSelectClub = (clubId: string) => {
    setSelectedClubId(clubId);
  };

  if (!selectedClubId) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("manager.budgetPlanningTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("manager.selectClubToPlan")}
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
      <SectionTitle title={t("manager.budgetPlanningTitle")} />
      
      {/* 预算概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("manager.totalBudget")}
          value={`${t("currency.euro")} ${club.totalBudget.toLocaleString()}`}
          subtitle={t("manager.totalBudgetDesc")}
        />
        <StatTile
          title={t("manager.spentBudget")}
          value={`-${t("currency.euro")} ${club.spentBudget.toLocaleString()}`}
          subtitle={t("manager.spentBudgetDesc")}
          variant="destructive"
        />
        <StatTile
          title={t("manager.remainingBudget")}
          value={`${t("currency.euro")} ${club.remainingBudget.toLocaleString()}`}
          subtitle={t("manager.remainingBudgetDesc")}
        />
      </div>

      {/* 预算使用率 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.budgetUsage")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("manager.usageRate")}
            value={`${Math.round((club.spentBudget / club.totalBudget) * 100)}%`}
            subtitle={t("manager.usageRateDesc")}
          />
        </div>
      </Panel>

      {/* 预算警报 */}
      {club.remainingBudget < club.totalBudget * 0.2 && (
        <Panel className="p-4 mb-6" style={{ borderColor: "red" }}>
          <SectionTitle title={t("manager.budgetAlert")} />
          <p className="text-red-600 mb-3">
            {t("manager.budgetLowAlert", { remaining: club.remainingBudget.toLocaleString() })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("manager.budgetLowSuggestion")}
          </p>
        </Panel>
      )}
    </Panel>
  );
}