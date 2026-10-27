import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function InjuryReport() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      injuryStatus: p.injuryStatus,
      daysUntilReturn: p.daysUntilReturn,
      injuryType: p.injuryType,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("injury.injuryReportTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("injury.selectPlayerForInjuryReport")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {playerData.slice(0, 6).map(p => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectPlayer(p.id)}
            >
              {p.name}
            </Button>
          ))
        </div>
      </Panel>
    );
  }

  const p = playerData.find(pl => pl.id === selectedPlayer)!;

  // 伤病状态颜色
  const statusColor = p.injuryStatus switch {
    "fit" => "green",
    "doubtful" => "orange",
    "out" => "red",
    "questionable" => "amber",
    default => "gray",
  };

  // 返回时间格式化
  const returnText = p.daysUntilReturn switch {
    > 30 => `${Math.ceil(p.daysUntilReturn / 30)}个月后回归`,
    > 7 => `${p.daysUntilReturn}天后回归`,
    > 0 => `今天训练`,
    default => `已恢复训练`,
  };

  return (
    <Panel className="p-6">
      <SectionTitle title={t("injury.injuryReportTitle")} />

      {/* 伤病状态概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("injury.currentStatus")} />
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-${statusColor}-50 flex items-center justify-center`}
              style={{ border: `2px solid ${statusColor}` }}>
              <div className="text-xl font-bold text-${statusColor}">
                {p.injuryStatus === "fit" ? "✓" : p.injuryStatus}
              </div>
            </div>
            <div>
              <div className="font-medium">{t(`status.${p.injuryStatus}`)}</div>
              <div className="text-sm text-muted-foreground">{returnText}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("injury.injuryDetails")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("injury.injuryType")}</div>
              <div className="text-muted-foreground">{t(`injury.type.${p.injuryType}`) || p.injuryType}</div>
            </div>
            <div>
              <div className="font-medium">{t("injury.daysAway")}</div>
              <div className="text-2xl font-bold text-${statusColor}-600">{p.daysUntilReturn}天</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {t("injury.injuryDescription", { 
              days: p.daysUntilReturn,
              type: t(`injury.type.${p.injuryType}`) || p.injuryType
            })}
          </p>
        </Panel>
      </div>

      {/* 返回训练 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("injury.trainingReturn")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("injury.expectedReturn", { date: returnText })}
        </p>
        <Button variant="primary" size="sm">
          {t("injury.markAsTraining")}
        </Button>
        <Button variant="outline" size="sm">
          {t("injury.scheduleRehab")}
        </Button>
      </Panel>
    </Panel>
  );
}