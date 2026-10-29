import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TeamSeasonReport() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      finalPosition: Math.floor(Math.random() * 20) + 1,
      played: 38,
      won: Math.floor(Math.random() * 20) + 10,
      drawn: Math.floor(Math.random() * 10) + 8,
      lost: 38 - (Math.floor(Math.random() * 20) + 10) - Math.floor(Math.random() * 10) - 8,
      goalsFor: Math.floor(Math.random() * 60) + 30,
      goalsAgainst: Math.floor(Math.random() * 50) + 20,
      points: 0,
      cleanSheets: Math.floor(Math.random() * 20) + 8,
      homeRecord: {
        played: 19,
        won: Math.floor(Math.random() * 13) + 10,
        drawn: Math.floor(Math.random() * 5) + 4,
        lost: 19 - (Math.floor(Math.random() * 13) + 10) - Math.floor(Math.random() * 5) - 4,
      },
      awayRecord: {
        played: 19,
        won: Math.floor(Math.random() * 10) + 5,
        drawn: Math.floor(Math.random() * 6) + 3,
        lost: 19 - (Math.floor(Math.random() * 10) + 5) - Math.floor(Math.random() * 6) - 3,
      },
    }));
  }, [clubs]);

  // 计算积分
  clubData.forEach(c => {
    c.points = c.won * 3 + c.drawn;
  });

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!selectedClub) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("teamSeasonReport.title") } />
        <p className="text-muted-foreground mb-4">
          {t("teamSeasonReport.selectClub")}
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
          ))
        </div>
      </Panel>
    );
  }

  const c = clubData.find(club => club.id === selectedClub)!;

  // 计算最终积分和统计
  c.points = c.won * 3 + c.drawn;
  const goalDifference = c.goalsFor - c.goalsAgainst;
  const winRate = c.played > 0 ? Number((c.won / c.played * 100).toFixed(1)) : 0;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("teamSeasonReport.title") } />

      {/* 俱乐部画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("teamSeasonReport.clubInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("teamSeasonReport.name")}</div>
              <div className="text-2xl font-bold text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("teamSeasonReport.finalPosition")}</div>
              <div className={c.finalPosition <= 3 ? "text-primary" : c.finalPosition <= 6 ? "text-warning" : "text-danger"}>
                {t(`position.${c.finalPosition}`)}
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("teamSeasonReport.seasonStats") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("teamSeasonReport.played")}</div>
              <div className="text-2xl text-primary">{c.played}场</div>
            </div>
            <div>
              <div className="font-medium">{t("teamSeasonReport.points")}</div>
              <div className="text-success">{c.points}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <div className="font-medium">{t("teamSeasonReport.won")}</div>
              <div className="text-primary">{c.won}</div>
            </div>
            <div>
              <div className="font-medium">{t("teamSeasonReport.lost")}</div>
              <div className="text-danger">{c.lost}</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 战绩分析 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("teamSeasonReport.recordAnalysis") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("teamSeasonReport.home")}</div>
            <div className="text-primary">
              {c.homeRecord.won}胜 {c.homeRecord.drawn}平 {c.homeRecord.lost}负
            </div>
          </div>
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("teamSeasonReport.away")}</div>
            <div className="text-info">
              {c.awayRecord.won}胜 {c.awayRecord.drawn}平 {c.awayRecord.lost}负
            </div>
          </div>
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("teamSeasonReport.goalDifference")}</div>
            <div className={goalDifference >= 0 ? "text-success" : "text-danger"}>
              {goalDifference}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="font-medium">{t("teamSeasonReport.winRate")}</div>
          <div className={winRate >= 50 ? "text-success" : winRate >= 40 ? "text-warning" : "text-danger"}>
            {winRate}%
          </div>
        </div>
      </Panel>

      {/* 净胜球与进球分析 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("teamSeasonReport.goalAnalysis") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("teamSeasonReport.goalsFor")}</div>
            <div className="text-primary">{c.goalsFor}</div>
          </div>
          <div>
            <div className="font-medium">{t("teamSeasonReport.goalsAgainst")}</div>
            <div className={goalDifference >= 0 ? "text-success" : "text-danger"}>
              {c.goalsAgainst}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="font-medium">{t("teamSeasonReport.cleanSheets")}</div>
          <div className="text-warning">{c.cleanSheets}场零封</div>
        </div>
      </Panel>

      {/* 赛季评价 */}
      <Panel className="p-4">
        <SectionTitle title={t("teamSeasonReport.seasonEvaluation") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t(`seasonEvaluation.${winRate >= 50 ? "success" : winRate >= 40 ? "moderate" : "poor"}`)}
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>{t("teamSeasonReport.attackAnalysis", { goals: c.goalsFor })}</li>
          <li>{t("teamSeasonReport.defenseAnalysis", { goals: c.goalsAgainst })}</li>
          <li>{t("teamSeasonReport.midfieldControl", { winRate })}</li>
        </ul>
      </Panel>
    </Panel>
  );
}