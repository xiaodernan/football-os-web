import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function RelegationBattle() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      points: c.points || 0,
      played: c.matchesPlayed || 38,
      goalDifference: (c.goalsFor || 0) - (c.goalsAgainst || 0),
      goalsFor: c.goalsFor || 0,
      goalsAgainst: c.goalsAgainst || 0,
      wins: c.wins || 0,
      draws: c.draws || 0,
      losses: c.losses || 0,
    }));
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!selectedClub) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("relegationBattle.title")} />
        <p className="text-muted-foreground mb-4">
          {t("relegationBattle.selectClub")}
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
        <p className="text-sm text-muted-foreground mt-2">
          {t("relegationBattle.note")}
        </p>
      </Panel>
    );
  }

  const c = clubData.find(club => club.id === selectedClub)!;

  // 计算保级区情况（前3名降级，或根据联赛规则）
  const relegationZone = clubs
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 3);

  // 计算该队的降级风险
  const relegationRank = clubs.findIndex(club => club.id === selectedClub);
  const teamsBelow = clubs.filter(club => {
    const rank = clubs.findIndex(c => c.id === club.id);
    return rank > relegationRank;
  });

  // 安全位置计算
  const pointsToSafety = Math.max(0, (relegationZone[0].points || 0) - (c.points || 0) + 3);
  const gamesRemaining = 38 - (c.matchesPlayed || 0);

  // 场均获取需要的积分
  const neededPointsPerGame = gamesRemaining > 0 ? pointsToSafety / gamesRemaining : 0;

  // 直接降级 vs 附加赛
  const directRelegation = c.position > 18 ? "直接降级区" : c.position > 16 ? "附加赛区" : "安全区";

  return (
    <Panel className="p-6">
      <SectionTitle title={t("relegationBattle.title")} />

      {/* 选中的俱乐部 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">{c.name}</div>
          <div className="text-2xl text-primary">{c.overall || 0}★</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div className="font-medium">{c.position}名</div>
          <div className="text-primary">{c.points}分</div>
        </div>
      </div>

      {/* 降级风险评估 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("relegationBattle.riskAssessment")} />
        <div className={`p-3 rounded ${c.position > 18 ? "bg-red-50" : c.position > 16 ? "bg-orange-50" : "bg-green-50"}`}>

          <div className="font-medium text-{c.position > 18 ? "text-red-600" : c.position > 16 ? "text-orange-600" : "text-green-600"}">
            {t(`relegationBattle.${directRelegation}`)}
          </div>
          <p>{t("relegationBattle.currentPosition", { position: c.position })}</p>
          <p>{t("relegationBattle.currentPoints", { points: c.points })}</p>
        </div>
      </Panel>

      {/* 安全所需计算 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("relegationBattle.safetyNeeded")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("relegationBattle.pointsNeeded")}</div>
            <div>{pointsToSafety}分</div>
          </div>
          <div>
            <div className="font-medium">{t("relegationBattle.gamesRemaining")}</div>
            <div>{gamesRemaining}场</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t("relegationBattle.neededPerGame", { avg: neededPointsPerGame.toFixed(2) })} 每场
        </p>
      </Panel>

      {/* 对手分析 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("relegationBattle.analysis")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("relegationBattle.behindTeams", { count: teamsBelow.length })}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          {teamsBelow.slice(0, 3).map(club => (
            <li key={club.id}>
              {t("relegationBattle.behindTeam", { name: club.name, gap: club.points - c.points })} -
              {t("relegationBattle.aheadOf", { games: gamesRemaining })}</li>
          ))}
        </ul>
      </Panel>

      {/* 赛季最后阶段 */}
      <Panel className="p-4">
        <SectionTitle title={t("relegationBattle.seasonFinal")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("relegationBattle.remainingGames", { games: gamesRemaining })}</p>
        <p>{t("relegationBattle.finalGamesNote")}</p>
        <p className="text-xs text-primary">
          {t("relegationBattle.mustWin", { games: gamesRemaining })}</p>
      </Panel>
    </Panel>
  );
}