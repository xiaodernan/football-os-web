import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, EmptyState, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InjuryTracker() {
  const { t } = useI18n();
  const [activeInjury, setActiveInjury] = useState<{ type: string; startDate: string; description: string } | null>(null);
  const [recoveryHistory, setRecoveryHistory] = useState<Array<{ type: string; recoveryDate: string; daysLost: number }>>([]);

  const injuryTypes = useMemo(() => ["hamstring", "ankle", "knee", "groin", "calf", " thigh"], []);
  const recoveryPhases = useMemo(() => ["acute", "subacute", "recovery", "return-to-play"], []);

  const startNewInjury = (type: string, description: string) => {
    setActiveInjury({
      type,
      startDate: new Date().toISOString().split("T")[0],
      description
    });
    // 添加到历史记录（模拟）
    setRecoveryHistory(prev => [{
      type,
      recoveryDate: "",
      daysLost: 0
    }, ...prev]);
  };

  const completeRecovery = () => {
    if (!activeInjury) return;
    setRecoveryHistory(prev => [{
      type: activeInjury.type,
      recoveryDate: new Date().toISOString().split("T")[0],
      daysLost: 1 // 模拟1天计算
    }, ...prev.filter(h => h.type !== activeInjury.type)]);
    setActiveInjury(null);
  };

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <SectionTitle title={t("injury.injuryTrackerTitle")} />

        {/* 当前伤病 */}
        {activeInjury && (
          <Panel className="p-4 mb-6" style={{ borderColor: "red" }}>
            <SectionTitle title={t("injury.currentInjury")} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-medium">{activeInjury.type}</div>
                <div className="text-xs text-muted-foreground">{t("injury.type")}</div>
              </div>
              <div>
                <div className="font-medium">{activeInjury.description}</div>
                <div className="text-xs text-muted-foreground">{t("injury.description")}</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={completeRecovery}
            >
              {t("injury.recoveryComplete")}
            </Button>
          </Panel>
        )}

        {/* 无活动伤病提示 */}
        {!activeInjury && (
          <EmptyState
            title={t("injury.noActiveInjuries")}
            icon="🏥"
            hint={t("injury.noActiveInjuriesHint")}
          />
        )}

        {/* 伤病类型选择 */}
        {activeInjury === null && (
          <Panel className="p-4">
            <SectionTitle title={t("injury.trackNewInjury")} />
            <div className="grid grid-cols-2 gap-3 mb-4">
              {injuryTypes.map(type => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  onClick={() => startNewInjury(type, t(`injury.${type}Description`))}
                >
                  {t(`injury.${type}`)}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {t("injury.trackingInjuries")}
            </p>
          </Panel>
        )}

        {/* 康复历史 */}
        {recoveryHistory.length > 0 && (
          <Panel className="p-4 mt-6">
            <SectionTitle title={t("injury.recoveryHistory")} />
            <div className="space-y-3">
              {recoveryHistory.map((entry, i) => (
                <div
                  key={i}
                  className="border rounded p-3 flex items-start"
                >
                  <div className="flex-1">
                    <div className="font-medium">{entry.type}</div>
                    <div className="text-xs text-muted-foreground">{t(`injury.${entry.type}`)}</div>
                  </div>
                  <div className="ml-3 text-center">
                    <div className="font-medium">{entry.daysLost} {t("injury.daysLost")}</div>
                    <div className="text-xs text-muted-foreground">{entry.recoveryDate}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </Panel>
    </div>
  );
}