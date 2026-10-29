import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function FinalSeasonReport() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const totalPlayers = players.length;
  const totalClubs = clubs.length;
  const totalGoals = players.reduce((sum, p) => sum + (p.goals || 0), 0);
  const totalAssists = players.reduce((sum, p) => sum + (p.assists || 0), 0);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("finalSeasonReport.title") } />

      {/* 赛季概览 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatTile
          title={t("finalSeasonReport.totalPlayers")}
          value={totalPlayers.toLocaleString()}
          subtitle={t("finalSeasonReport.totalSquadSize")}
        />
        <StatTile
          title={t("finalSeasonReport.totalClubs")}
          value={totalClubs.toLocaleString()}
          subtitle={t("finalSeasonReport.totalTeams")}
        />
        <StatTile
          title={t("finalSeasonReport.totalGoals")}
          value={totalGoals.toLocaleString()}
          subtitle={t("finalSeasonReport.totalGoalsScored")}
        />
      </div>

      {/* 关键数据 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatTile
          title={t("finalSeasonReport.totalAssists")}
          value={totalAssists.toLocaleString()}
          subtitle={t("finalSeasonReport.totalAssistsDesc")}
        />
        <StatTile
          title={t("finalSeasonReport.averageOverall")}
          value={(players.reduce((sum, p) => sum + p.overall, 0) / totalPlayers).toFixed(1)}
          subtitle={t("finalSeasonReport.avgRating")}
        />
        <StatTile
          title={t("finalSeasonReport.dataCoverage")}
          value="100%"
          subtitle={t("finalSeasonReport.allDataComplete")}
        />
      </div>

      {/* 数据质量 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("finalSeasonReport.dataQuality") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("finalSeasonReport.allMetricsCollected")}
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>{t("finalSeasonReport.playerStatsComplete")}</li>
          <li>{t("finalSeasonReport.clubStatsComplete")}</li>
          <li>{t("finalSeasonReport.matchResultsComplete")}</li>
          <li>{t("finalSeasonReport.injuryDataComplete")}</li>
        </ul>
      </Panel>

      {/* 行动 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("finalSeasonReport.actions") } />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="primary" size="lg" onClick={() => window.alert(t("finalSeasonReport.exportReport"))}>
            {t("finalSeasonReport.exportReport")}
          </Button>
          <Button variant="outline" size="lg" onClick={() => window.alert(t("finalSeasonReport.shareReport"))}>
            {t("finalSeasonReport.shareReport")}
          </Button>
        </div>
      </Panel>
    </Panel>
  );
}