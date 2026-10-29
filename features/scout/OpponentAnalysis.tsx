import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function OpponentAnalysis() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      formation: t(`formation.${Math.floor(Math.random() * 8 + 1)}`),
      homeRecord: {
        played: Math.floor(Math.random() * 19) + 19,
        won: Math.floor(Math.random() * 13) + 10,
        drawn: Math.floor(Math.random() * 5) + 4,
        lost: 38 - (Math.floor(Math.random() * 13) + 10) - Math.floor(Math.random() * 5) - 4,
      },
      awayRecord: {
        played: Math.floor(Math.random() * 19) + 19,
        won: Math.floor(Math.random() * 10) + 5,
        drawn: Math.floor(Math.random() * 6) + 3,
        lost: 38 - (Math.floor(Math.random() * 10) + 5) - Math.floor(Math.random() * 6) - 3,
      },
      goalsFor: Math.floor(Math.random() * 60) + 40,
      goalsAgainst: Math.floor(Math.random() * 40) + 20,
      cleanSheets: Math.floor(Math.random() * 20) + 8,
    }));
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!selectedClub) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("opponentAnalysis.title") } />
        <p className="text-muted-foreground mb-4">
          {t("opponentAnalysis.selectClub")}
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

  const c = clubData.find(club => club.id === selectedClub)!;

  // 计算总积分和胜率
  const homePoints = c.homeRecord.won * 3 + c.homeRecord.drawn;
  const awayPoints = c.awayRecord.won * 3 + c.awayRecord.drawn;
  const totalPoints = homePoints + awayPoints;
  const homeWinRate = c.homeRecord.played > 0 ? Number((c.homeRecord.won / c.homeRecord.played * 100).toFixed(1)) : 0;
  const awayWinRate = c.awayRecord.played > 0 ? Number((c.awayRecord.won / c.awayRecord.played * 100).toFixed(1)) : 0;
  const overallWinRate = totalPoints / (38 * 2) * 100;

  // 关键球员
  const keyPlayers = useMemo(() => ([
    { name: "主力前锋", goals: Math.floor(Math.random() * 20) + 15, assists: Math.floor(Math.random() * 10) + 8 },
    { name: "核心中场", goals: Math.floor(Math.random() * 10) + 5, assists: Math.floor(Math.random() * 20) + 15 },
    { name: "稳健后卫", goals: Math.floor(Math.random() * 5) + 2, assists: Math.floor(Math.random() * 5) + 3, cleanSheets: Math.floor(Math.random() * 15) + 8 },
  ] as const));

  return (
    <Panel className="p-6">
      <SectionTitle title={t("opponentAnalysis.title") } />

      {/* 俱乐部概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("opponentAnalysis.clubInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("opponentAnalysis.name")}</div>
              <div className="text-2xl font-bold text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("opponentAnalysis.formation")}</div>
              <div className="text-info">{c.formation}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("opponentAnalysis.record") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("opponentAnalysis.home")}</div>
              <div className="text-primary">
                {c.homeRecord.won}胜 {c.homeRecord.drawn}平 {c.homeRecord.lost}负
              </div>
            </div>
            <div>
              <div className="font-medium">{t("opponentAnalysis.away")}</div>
              <div className="text-info">
                {c.awayRecord.won}胜 {c.awayRecord.drawn}平 {c.awayRecord.lost}负
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 积分与战绩 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("opponentAnalysis.points") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium">{t("opponentAnalysis.totalPoints")}</div>
            <div className="text-2xl text-success">{totalPoints}</div>
          </div>
          <div>
            <div className="font-medium">{t("opponentAnalysis.homePoints")}</div>
            <div className="text-primary">{homePoints}</div>
          </div>
          <div>
            <div className="font-medium">{t("opponentAnalysis.awayPoints")}</div>
            <div className="text-info">{awayPoints}</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="font-medium">{t("opponentAnalysis.winRate")}</div>
          <div className={overallWinRate > 50 ? "text-success" : overallWinRate > 40 ? "text-warning" : "text-danger"}>
            {overallWinRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 关键球员 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("opponentAnalysis.keyPlayers") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("opponentAnalysis.threatPlayers")}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {keyPlayers.map((player, index) => (
            <div key={index} className="border rounded p-3 text-center">
              <div className="font-medium">{player.name}</div>
              <div className="text-primary">{player.goals}{/}{t("opponentAnalysis.goals")}</div>
              <div className="text-info">{player.assists}{/}{t("opponentAssists")}</div>
              {player.cleanSheets && (
                <div className="text-success mt-2">
                  {t("opponentCleanSheets", { count: player.cleanSheets })}
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* 战术分析 */}
      <Panel className="p-4">
        <SectionTitle title={t("opponentAnalysis.tacticalAnalysis") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("opponentAnalysis.possession")}</div>
            <div className="text-primary">52%</div>
          </div>
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("opponentAnalysis.shotsPerGame")}</div>
            <div className="text-primary">1.8</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="font-medium text-sm text-muted-foreground">{t("opponentAnalysis.offensiveStyle")}</div>
          <div className="text-info">
            {t(`style.${Math.floor(Math.random() * 4 + 1)`)}
          </div>
        </div>
      </Panel>
    </Panel>
  );
}