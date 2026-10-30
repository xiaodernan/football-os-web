import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonPlayerReview() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

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

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
      gamesPlayed: p.gamesPlayed || 0,
      goals: p.goals || 0,
      assists: p.assists || 0,
      rating: p.rating || 0,
    }));
  }, [players]);

  const [selectedView, setSelectedView] = useState<"byClub" | "byPosition">("byClub");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const sortedByOverall = useMemo(
    () => [...playerData].sort((a, b) => b.overall - a.overall),
    [playerData]
  );

  const sortedByRating = useMemo(
    () => [...playerData].sort((a, b) => b.rating - a.rating),
    [playerData]
  );

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!players.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonPlayerReview.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonPlayerReview.noPlayers")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonPlayerReview.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "byClub" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("byClub")}
        >
          {t("seasonPlayerReview.byClub")}
        </Button>
        <Button
          variant={setSelectedView === "byPosition" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("byPosition")}
        >
          {t("seasonPlayerReview.byPosition")}
        </Button>
      </div>

      {/* 按俱乐部评分 */}
      {setSelectedView === "byClub" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonPlayerReview.byClubTitle")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("seasonPlayerReview.allClubs", { total: clubs.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {clubs.map(club => {
              const clubPlayers = playerData.filter(p => /* filter by club */ true);
              const avgRating = clubPlayers.reduce(
                (sum, p) => sum + p.rating,
                0
              ) / clubPlayers.length;
              return (
                <li key={club.id} className="font-medium text-primary mb-1">
                  {t("seasonPlayerReview.{name}", { name: club.name })} - 
                  平均评分: {avgRating.toFixed(1)}/10 - 
                  {t("seasonPlayerReview.players", { count: clubPlayers.length })}名球员</li>
              );
            })}
          </ol>
        </Panel>
      )}

      {/* 按位置评分 */}
      {setSelectedView === "byPosition" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonPlayerReview.byPositionTitle")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("seasonPlayerReview.positions")}</p>
          <div className="grid grid-cols-4 gap-3">
            ["门将", "后卫", "中场", "前锋"].map(pos => {
              const posPlayers = playerData.filter(p => p.position === pos);
              const avgRating = posPlayers.length > 0
                ? posPlayers.reduce((sum, p) => sum + p.rating, 0) / posPlayers.length
                : 0;
              return (
                <div key={pos} className="border rounded p-3 text-center">
                  <div className="font-medium text-primary">{pos}</div>
                  <div>{avgRating.toFixed(1)}/10</div>
                  <div>{posPlayers.length}名球员</div>
                </div>
              );
            })
          </div>
        </Panel>
      )}

      {/* 球员详情 */}
      {selectedPlayer && (
        <Panel className="p-4">
          <SectionTitle title={t("seasonPlayerReview.playerDetail")} />
          const player = playerData.find(pl => pl.id === selectedPlayer)!;

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("seasonPlayerReview.name")}</div>
              <div className="text-2xl text-primary">{player.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("seasonPlayerReview.position")}</div>
              <div>{player.position}</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonPlayerReview.overall")}</div>
            <div className="text-3xl text-primary">{player.overall}★</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonPlayerReview.potential")}</div>
            <div className="text-3xl text-success">{player.potential}★</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonPlayerReview.gamesPlayed")}</div>
            <div>{player.gamesPlayed}场</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonPlayerReview.goals")}</div>
            <div>{player.goals}球</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonPlayerReview.assists")}</div>
            <div>{player.assists}助</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonPlayerReview.rating")}</div>
            <div className="text-3xl text-primary">{player.rating}/10</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonPlayerReview.overallScore")}</div>
            <div className="bg-gray-200 rounded p-3">
              <div
                className={`bar bg-primary h-4 rounded w-${Math.min(player.rating * 10, 100)}%`}
                style={{ height: "4px", borderRadius: "4px" }}
                aria-label={`${player.name} 的评分 ${player.rating}/10`}
              >
                <span>{player.rating}/10</span>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonPlayerReview.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("seasonPlayerReview.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("seasonPlayerReview.avgOverall", {
            avg: (playerData.reduce((sum, p) => sum + p.overall, 0) /
              playerData.length).toFixed(1),
          })} 平均总体评分
        </p>
        <p>
          {t("seasonPlayerReview.avgRating", {
            avg: (playerData.reduce((sum, p) => sum + p.rating, 0) /
              playerData.length).toFixed(1),
          })} 平均比赛评分
        </p>
        <p>
          {t("seasonPlayerReview.topRated", {
            player: sortedByRating[0]?.name || "",
            rating: sortedByRating[0]?.rating || 0,
          })} 赛季最佳球员
        </p>
      </Panel>
    </Panel>
  );
}