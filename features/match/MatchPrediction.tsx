import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function MatchPrediction() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      overall: Math.floor(Math.random() * 100) + 60,
      form: Math.round(30 + Math.random() * 50),
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
      goalsFor: Math.floor(Math.random() * 30) + 20,
      goalsAgainst: Math.floor(Math.random() * 25) + 10,
    }));
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!selectedClub) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("matchPrediction.title") } />
        <p className="text-muted-foreground mb-4">
          {t("matchPrediction.selectClub")}
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

  // 计算统计数据
  const homePoints = c.homeRecord.won * 3 + c.homeRecord.drawn;
  const awayPoints = c.awayRecord.won * 3 + c.awayRecord.drawn;
  const totalHomeGoals = c.homeRecord.won * 2 + c.homeRecord.drawn;
  const totalAwayGoals = c.awayRecord.won * 2 + c.awayRecord.drawn;

  // 预测模型
  const prediction = useMemo(() => ({
    homeWinProbability: Math.round((homePoints / (homePoints + awayPoints)) * 100),
    drawProbability: Math.round(20 + Math.random() * 20),
    awayWinProbability: Math.round(100 - (homeWinProbability + drawProbability)),
    expectedHomeGoals: Math.round((c.goalsFor / 38) * 1.5),
    expectedAwayGoals: Math.round((c.goalsAgainst / 38) * 0.8),
    confidence: Math.round(70 + Math.random() * 25),
  }), [homePoints, awayPoints, c.goalsFor, c.goalsAgainst]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("matchPrediction.title") } />

      {/* 球队画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("matchPrediction.clubInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("matchPrediction.name")}</div>
              <div className="text-2xl font-bold text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("matchPrediction.formation")}</div>
              <div className="text-info">4-2-3-1</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("matchPrediction.stats") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("matchPrediction.homeForm")}</div>
              <div className="text-primary">{c.homeRecord.won}胜 {c.homeRecord.drawn}平 {c.homeRecord.lost}负</div>
            </div>
            <div>
              <div className="font-medium">{t("matchPrediction.awayForm")}</div>
              <div className="text-info">{c.awayRecord.won}胜 {c.awayRecord.drawn}平 {c.awayRecord.lost}负</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 预测结果 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("matchPrediction.prediction") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium text-primary">{t("matchPrediction.homeWin")}</div>
            <div className="text-3xl font-bold text-primary">{prediction.homeWinProbability}%</div>
          </div>
          <div>
            <div className="font-medium">{t("matchPrediction.draw")}</div>
            <div className="text-warning text-3xl">{prediction.drawProbability}%</div>
          </div>
          <div>
            <div className="font-medium text-danger">{t("matchPrediction.awayWin")}</div>
            <div className="text-3xl text-danger">{prediction.awayWinProbability}%</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t("matchPrediction.confidence", { confidence: prediction.confidence })}%
        </p>
      </Panel>

      {/* 进球预测 */}
      <Panel className="p-4">
        <SectionTitle title={t("matchPrediction.goalPrediction") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("matchPrediction.homeGoals")}</div>
            <div className="text-2xl text-primary">{prediction.expectedHomeGoals}</div>
          </div>
          <div>
            <div className="font-medium">{t("matchPrediction.awayGoals")}</div>
            <div className="text-2xl text-danger">{prediction.expectedAwayGoals}</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("matchPrediction.totalGoals", { total: prediction.expectedHomeGoals + prediction.expectedAwayGoals })}
        </p>
      </Panel>

      {/* 预测依据 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("matchPrediction.factors") } />
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>{t("matchPrediction.homeAdvantage")}</li>
          <li>{t("matchPrediction.currentForm")}</li>
          <li>{t("matchPrediction.headToHead")}</li>
          <li>{t("matchPrediction.injuriesSuspensions")}</li>
        </ul>
        <p className="text-xs text-primary mt-3">
          {t("matchPrediction.modelBasedOn", { games: "last 5 matches" })}</p>
      </Panel>
    </Panel>
  );
}