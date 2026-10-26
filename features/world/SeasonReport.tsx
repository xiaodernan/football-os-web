import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import { getSeasonStats, SeasonStats } from "@/world/seasonStats";
import { Panel, SectionTitle, EmptyState, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SeasonReport() {
  const { t } = useI18n();
  const stats = useMemo(() => getSeasonStats(), []);
  const competitions = footballProvider.competitions();
  const seasons = useMemo(() => {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  }, []);

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <SectionTitle title={t("world.seasonReportTitle")} />
        
        {/* 赛季选择 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {seasons.map(year => (
            <Button
              key={year}
              variant={stats.season === year ? "primary" : "outline"}
              size="sm"
              onClick={() => {/* 加载该赛季数据 */}}
            >
              {t("world.season", { year })}
            </Button>
          ))}
        </div>

        {/* 赛季统计概览 */}
        {stats.goals > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile
              title={t("world.totalGoals")}
              value={stats.goals.toLocaleString()}
              subtitle={t("world.thisSeason")}
              variant="primary"
            />
            <StatTile
              title={t("world.totalAssists")}
              value={stats.assists.toLocaleString()}
              subtitle={t("world.thisSeason")}
            />
            <StatTile
              title={t("world.totalAppearances")}
              value={stats.appearances.toLocaleString()}
              subtitle={t("world.thisSeason")}
            />
            <StatTile
              title={t("world.yellowCards")}
              value={stats.yellowCards.toLocaleString()}
              subtitle={t("world.thisSeason")}
              variant="warning"
            />
            <StatTile
              title={t("world.redCards")}
              value={stats.redCards.toLocaleString()}
              subtitle={t("world.thisSeason")}
              variant="destructive"
            />
          </div>
        )}

        {/* 竞赛分解 */}
        {competitions.length > 0 && (
          <Panel className="p-4 mt-6">
            <SectionTitle title={t("world.competitions")} />
            <div className="space-y-3">
              {competitions.map(comp => (
                <div key={comp.id} className="p-3 border rounded">
                  <div className="font-medium">{comp.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {comp.teams?.length ?? 0} {t("world.teams")} ·
                    {comp.matches?.length ?? 0} {t("world.matches")}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* 导出报告 */}
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("world.exportReport")} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const data = {
                seasonStats: stats,
                generatedAt: new Date().toISOString(),
                season: new Date().getFullYear()
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `season-report-${new Date().getFullYear()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            {t("world.downloadReport")}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("world.reportFormatJson")}
          </p>
        </Panel>
      </Panel>
    </div>
  );
}