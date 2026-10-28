import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TrainingProgress() {
  const { t } = useI18n();

  // 模拟训练数据
  const progressData = useMemo(() => {
    const weeks = 12;
    const data = [];
    for (let i = 0; i <= weeks; i++) {
      data.push({
        week: i,
        overall: Math.round(60 + (i / weeks) * 25 + Math.sin(i * 0.3) * 3),
        speed: Math.round(50 + (i / weeks) * 30 + Math.cos(i * 0.2) * 2),
        stamina: Math.round(45 + (i / weeks) * 35 + Math.sin(i * 0.4) * 4),
      });
    }
    return data;
  }, []);

  const initialOverall = progressData[0]?.overall ?? 60;
  const finalOverall = progressData[progressData.length - 1]?.overall ?? 85;
  const gain = finalOverall - initialOverall;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("training.progressTitle")} />

      {/* 总体进度概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("training.initialOverall")}
          value={initialOverall.toLocaleString()}
          subtitle={t("training.overallRating")}
        />
        <StatTile
          title={t("training.finalOverall")}
          value={finalOverall.toLocaleString()}
          subtitle={t("training.overallRating")}
          variant="primary"
        />
        <StatTile
          title={t("training.totalGain")}
          value={`+${gain.toLocaleString()}`}
          subtitle={t("training.overallRating")}
          variant={gain > 0 ? "primary" : "default"}
        />
      </div>

      {/* 训练周期数据 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("training.trainingWeeks")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("training.12WeekProgram")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-md">
            <thead>
              <tr>
                <th className="text-left p-3 border-b">{t("training.week")}</th>
                <th className="text-left p-3 border-b">{t("training.overall")}</th>
                <th className="text-left p-3 border-b">{t("training.speed")}</th>
                <th className="text-left p-3 border-b">{t("training.stamina")}</th>
              </tr>
            </thead>
            <tbody>
              {progressData.map((point, i) => (
                <tr key={i} className="border-b hover:bg-primary/5 transition-colors">
                  <td className="text-center p-3 font-medium">{point.week}</td>
                  <td className="text-center p-3">{point.overall}</td>
                  <td className="text-center p-3">{point.speed}</td>
                  <td className="text-center p-3">{point.stamina}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* 趋势说明 */}
      <Panel className="p-4">
        <SectionTitle title={t("training.trendAnalysis")} />
        <p className="text-sm text-muted-foreground">
          {t("training.trendDescr", { gain })}
        </p>
      </Panel>
    </Panel>
  );
}