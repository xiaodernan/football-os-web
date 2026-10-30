import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TeamPerformanceChart() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      played: c.matchesPlayed || 38,
      won: c.wins || 0,
      drawn: c.draws || 0,
      lost: c.losses || 0,
      goalsFor: c.goalsFor || 0,
      goalsAgainst: c.goalsAgainst || 0,
      points: c.points || 0,
    }));
  }, [clubs]);

  const [selectedMetric, setSelectedMetric] = useState<"points" | "goals">("points");

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  const handleSelectMetric = (metric: string) => {
    setSelectedMetric(metric);
  };

  if (!clubData.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("performanceChart.title")} />
        <p className="text-muted-foreground mb-4">
          {t("performanceChart.noData")}
        </p>
      </Panel>
    );
  }

  const sortedClubs = [...clubData].sort((a, b) => b.points - a.points);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("performanceChart.title")} />

      {/* 选中的俱乐部 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || '' : '全联盟'}</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div>{t("performanceChart.selectClub")}</div>
        </div>
      </div>

      {/* 指标选择 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("performanceChart.metrics")} />
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={setSelectedMetric === "points" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleSelectMetric("points")}
          >
            {t("performanceChart.points")}
          </Button>
          <Button
            variant={setSelectedMetric === "goals" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleSelectMetric("goals")}
          >
            {t("performanceChart.goals")}
          </Button>
        </div>
      </Panel>

      {/* 联盟排名 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("performanceChart.leagueRanking")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("performanceChart.leagueTable")}</p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
          {sortedClubs.map((c, i) => (
            <li key={c.id} className="font-medium text-primary mb-1">
              {t("performanceChart.position", { position: i + 1 })}:
              {t("performanceChart.{name}", { name: c.name })} - {t("performanceChart.points", { points: c.points })}分
            </li>
          ))}
        </ol>
      </Panel>

      {/* 俱乐部详细数据 */}
      {selectedClub && (
        <Panel className="p-4">
          <SectionTitle title={t("performanceChart.clubDetail")} />
          const c = clubData.find(club => club.id === selectedClub)!;
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("performanceChart.name")}</div>
              <div className="text-2xl text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("performanceChart.position")}</div>
              <div>{c.position}位</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("performanceChart.points")}</div>
            <div className="text-3xl text-primary">{c.points}分</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("performanceChart.goalDifference")}</div>
            <div>{c.goalsFor - c.goalsAgainst >= 0 ? `+${c.goalsFor - c.goalsAgainst}` : c.goalsFor - c.goalsAgainst}</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("performanceChart.goalsFor")}</div>
            <div className="text-primary">{c.goalsFor}球</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("performanceChart.goalsAgainst")}</div>
            <div className="text-danger">{c.goalsAgainst}球</div>
          </div>
        </Panel>
      )}

      {/* 联盟统计 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("performanceChart.leagueStats")} />
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            title={t("performanceChart.totalTeams")}
            value={clubData.length}
            subtitle={t("performanceChart.teams")}
          />
          <StatTile
            title={t("performanceChart.totalPoints")}
            value={(clubData.reduce((sum, c) => sum + c.points, 0) / clubData.length).toFixed(1)}
            subtitle={t("performanceChart.avgPoints")}
          />
          <StatTile
            title={t("performanceChart.totalGoals")}
            value={(clubData.reduce((sum, c) => sum + c.goalsFor, 0) / clubData.length).toFixed(1)}
            subtitle={t("performanceChart.avgGoals")}
          />
        </div>
      </Panel>
    </Panel>
  );
}