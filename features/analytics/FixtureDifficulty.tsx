import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function FixtureDifficulty() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      played: c.matchesPlayed || 38,
      remaining: 38 - (c.matchesPlayed || 0),
      avgPointsPerGame: ((c.points || 0) / (c.matchesPlayed || 1)).toFixed(2),
      goalsFor: c.goalsFor || 0,
      goalsAgainst: c.goalsAgainst || 0,
    }));
  }, [clubs]);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const [selectedView, setSelectedView] = useState<"difficulty" | "remaining">("difficulty");

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  if (!clubData.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("fixtureDifficulty.title")} />
        <p className="text-muted-foreground mb-4">
          {t("fixtureDifficulty.noData")}
        </p>
      </Panel>
    );
  }

  // 按难度排序（积分率 *  remaining games，积分率越高且剩余越多越难）
  const sortedByDifficulty = [...clubData].sort((a, b) => {
    const aScore = parseFloat(a.avgPointsPerGame) * a.remaining;
    const bScore = parseFloat(b.avgPointsPerGame) * b.remaining;
    return bScore - aScore;
  });

  return (
    <Panel className="p-6">
      <SectionTitle title={t("fixtureDifficulty.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "difficulty" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("difficulty")}
        >
          {t("fixtureDifficulty.byDifficulty")}
        </Button>
        <Button
          variant={setSelectedView === "remaining" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("remaining")}
        >
          {t("fixtureDifficulty.byRemaining")}
        </button>
      </div>

      {/* 难度排序 */}
      {setSelectedView === "difficulty" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("fixtureDifficulty.difficultyRanking")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("fixtureDifficulty.rankByProjectedPoints")}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            {sortedByDifficulty.slice(0, 10).map(c => (
              <li key={c.id} className="font-medium text-primary mb-1">
                {c.position}位 - {c.name}: {c.remaining}场剩余，场均{c.avgPointsPerGame}分
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 剩余赛程 */}
      {setSelectedView === "remaining" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("fixtureDifficulty.remainingSchedule")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("fixtureDifficulty.gamesRemaining", { games: 38 })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            {clubData.map(c => (
              <li key={c.id} className="font-medium text-primary mb-1">
                {c.name}: {c.remaining}场剩余
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 俱乐部详情 */}
      {selectedClub && (
        <Panel className="p-4">
          <SectionTitle title={t("fixtureDifficulty.clubDetail")} />
          const c = clubData.find(club => club.id === selectedClub)!;
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("fixtureDifficulty.name")}</div>
              <div className="text-2xl text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("fixtureDifficulty.position")}</div>
              <div>{c.position}名</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="font-medium">{t("fixtureDifficulty.remaining")}</div>
            <div>{c.remaining}场</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("fixtureDifficulty.avgPoints")}</div>
            <div>{c.avgPointsPerGame}分/场</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("fixtureDifficulty.goalDifference")}</div>
            <div>{c.goalsFor - c.goalsAgainst > 0 ? `+${c.goalsFor - c.goalsAgainst}` : c.goalsFor - c.goalsAgainst}</div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("fixtureDifficulty.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("fixtureDifficulty.leagueTotal", { total: clubs.length })}</p>
        <p>{t("fixtureDifficulty.avgRemaining", { avg: (clubs.reduce((sum, c) => sum + c.remaining, 0) / clubs.length).toFixed(1) })} 场平均剩余</p>
        <p>{t("fixtureDifficulty.totalGames", { games: clubs.reduce((sum, c) => sum + c.remaining, 0) })} 总剩余场次</p>
      </Panel>
    </Panel>
  );
}