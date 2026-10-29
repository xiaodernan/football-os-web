import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TeamInjuryRecovery() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedView, setSelectedView] = useState<"overview" | "byPosition" | "bySeverity">("overview");

  // 模拟伤病数据
  const injuryData = useMemo(() => {
    const data = [];
    const positions = ["门将", "后卫", "中场", "前锋"];
    for (let i = 0; i < 20; i++) {
      const position = positions[Math.floor(Math.random() * positions.length)];
      const daysMissed = Math.floor(Math.random() * 45) + 1;
      const recoveryTime = Math.floor(Math.random() * 30) + 10;
      const severity = Math.random() > 0.7 ? "严重" : Math.random() > 0.5 ? "中度" : "轻度";
      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + recoveryTime);
      data.push({
        id: i,
        player: `球员${i + 1}`,
        position,
        daysMissed,
        recoveryTime,
        severity,
        returnDate: returnDate.toLocaleDateString(),
      });
    }
    return data;
  }, []);

  const totalInjuries = injuryData.length;
  const averageRecoveryTime = useMemo(() => {
    const total = injuryData.reduce((sum, d) => sum + d.recoveryTime, 0);
    return Math.round(total / totalInjuries);
  }, [injuryData]);

  const byPosition = useMemo(() => {
    const positions = ["门将", "后卫", "中场", "前锋"];
    const result = {};
    for (const pos of positions) {
      result[pos] = injuryData.filter(d => d.position === pos).length;
    }
    return result;
  }, []);

  const bySeverity = useMemo(() => {
    const severity = ["严重", "中度", "轻度"];
    const result = {};
    for (const s of severity) {
      result[s] = injuryData.filter(d => d.severity === s).length;
    }
    return result;
  }, []);

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  return (
    <Panel className="p-6">
      <SectionTitle title={t("teamInjuryRecovery.title") } />

      {/* 视图切换 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Button
          variant={setSelectedView === "overview" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("overview")}
        >
          {t("teamInjuryRecovery.overview")}
        </Button>
        <Button
          variant={setSelectedView === "byPosition" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("byPosition")}
        >
          {t("teamInjuryRecovery.byPosition")}
        </Button>
        <Button
          variant={setSelectedView === "bySeverity" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("bySeverity")}
        >
          {t("teamInjuryRecovery.bySeverity")}
        </Button>
      </div>

      {/* 总体概览 */}
      {setSelectedView === "overview" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("teamInjuryRecovery.overview") } />
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              title={t("teamInjuryRecovery.totalInjuries")}
              value={totalInjuries}
              subtitle={t("teamInjuryRecovery.totalPlayers")}
            />
            <StatTile
              title={t("teamInjuryRecovery.averageRecoveryTime")}
              value={averageRecoveryTime}天
              subtitle={t("teamInjuryRecovery.avgDays")}
            />
          </div>
        </Panel>
      )}

      {/* 按位置统计 */}
      {setSelectedView === "byPosition" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("teamInjuryRecovery.byPosition") } />
          <div className="grid grid-cols-2 gap-3">
            {["门将", "后卫", "中场", "前锋"].map(pos => (
              <div key={pos} className="border rounded p-3">
                <div className="font-medium">{pos}</div>
                <div className="text-primary">{byPosition[pos]}人</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 按严重程度统计 */}
      {setSelectedView === "bySeverity" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("teamInjuryRecovery.bySeverity") } />
          <div className="grid grid-cols-2 gap-3">
            {["严重", "中度", "轻度"].map(sev => (
              <div key={sev} className="border rounded p-3">
                <div className="font-medium text-{sev === "严重" ? "text-red-600" : sev === "中度" ? "text-orange-600" : "text-green-600"}">
                  {sev}
                </div>
                <div>{bySeverity[sev]}人</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 伤病列表 */}
      <Panel className="p-4">
        <SectionTitle title={t("teamInjuryRecovery.injuryList") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("teamInjuryRecovery.recentInjuries", { count: totalInjuries })}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          {injuryData.map(d => (
            <li key={d.id}>
              {d.player}: {d.position} - {d.severity} - {t("teamInjuryRecovery.daysMissed", { days: d.daysMissed })} - {t("teamInjuryRecovery.recoveryTime", { days: d.recoveryTime })} - 返回: {d.returnDate}</li>
            </li>
          ))}
        </ul>
      </Panel>
    </Panel>
  );
}