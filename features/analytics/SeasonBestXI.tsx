import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonBestXI() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

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

  const [selectedFormation, setSelectedFormation] = useState<"4-4-2" | "4-3-3" | "3-5-2">("4-4-2");

  const positionOrder = ["门将", "后卫", "中场", "前锋"];
  const positionCounts = useMemo(() => {
    const counts = { "门将": 0, "后卫": 0, "中场": 0, "前锋": 0 };
    playerData.forEach(p => {
      if (positionCounts[p.position as keyof typeof counts] !== undefined) {
        positionCounts[p.position as keyof typeof counts] += 1;
      }
    });
    return counts;
  }, [playerData]);

  const sortedByRating = useMemo(
    () => [...playerData].sort((a, b) => b.rating - a.rating),
    [playerData]
  );

  const handleSelectFormation = (formation: string) => {
    setSelectedFormation(formation);
  };

  const formationLabels: Record<string, string> = {
    "4-4-2": "4-4-2",
    "4-3-3": "4-3-3",
    "3-5-2": "3-5-2",
  };

  if (!players.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonBestXI.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonBestXI.noPlayers")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonBestXI.title")} />

      {/* 战术阵型选择 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonBestXI.formation")} />
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSelectFormation("4-4-2")}
          >
            4-4-2
          </Button>
          <Button
            variant={selectedFormation === "4-3-3" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleSelectFormation("4-3-3")}
          >
            4-3-3
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSelectFormation("3-5-2")}
          >
            3-5-2
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t("seasonBestXI.formationSelected", { formation: formationLabels[selectedFormation] })}</p>
      </Panel>

      {/* 位置统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonBestXI.positionStats")} />
        <div className="grid grid-cols-4 gap-3">
          {"门将后卫中场前锋".split("").map((pos, i) => {
            const count = positionCounts[pos as keyof typeof positionCounts];
            return (
              <div key={pos} className="border rounded p-3 text-center">
                <div className="font-medium text-primary">{pos}</div>
                <div>{count}名球员</div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* 最佳阵容 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonBestXI.bestXI")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("seasonBestXI.formation", { formation: formationLabels[selectedFormation] })}</p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-primary">
          {["GK", "RB", "CB", "CB", "LB", "RM", "CM", "CM", "LM", "ST"].map((pos, i) => {
            // Find best player for this position based on rating and games played
            const posPlayers = playerData.filter(p => {
              const posMap: Record<string, string> = {
                "GK": "门将",
                "RB": "后卫",
                "CB": "后卫",
                "LB": "后卫",
                "RM": "中场",
                "CM": "中场",
                "LM": "中场",
                "ST": "前锋",
              };
              return p.position === posMap[pos];
            });
            
            // Sort by rating, then by games played
            const best = posPlayers.sort((a, b) => {
              if (b.rating !== a.rating) return b.rating - a.rating;
              return b.gamesPlayed - a.gamesPlayed;
            })[0];

            if (!best) return null;

            return (
              <li key={pos} className="font-medium text-primary mb-1">
                {t("seasonBestXI.position", { position: pos })}:
                {t("seasonBestXI.{name}", { name: best.name })} -
                {t("seasonBestXI.overall", { overall: best.overall })}★ -
                {t("seasonBestXI.rating", { rating: best.rating })} -
                {t("seasonBestXI.games", { games: best.gamesPlayed })}场
              </li>
            );
          })}
        </ol>
      </Panel>

      {/* 备选名单 */}
      <Panel className="p-4">
        <SectionTitle title={t("seasonBestXI.substitutes")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("seasonBestXI.formation", { formation: formationLabels[selectedFormation] })} 备选</p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-secondary">
          {["RW", "LW", "RF", "LF"].map((pos, i) => {
            const posMap: Record<string, string> = {
              "RW": "右翼",
              "LW": "左翼",
              "RF": "前锋",
              "LF": "前锋",
            };
            const posPlayers = playerData.filter(p => p.position === posMap[pos]);
            const best = posPlayers.sort((a, b) => b.rating - a.rating)[0];
            if (!best) return null;
            return (
              <li key={pos} className="font-medium text-secondary mb-1">
                {t("seasonBestXI.position", { position: pos })}:
                {t("seasonBestXI.{name}", { name: best.name })} -
                {t("seasonBestXI.overall", { overall: best.overall })}★
              </li>
            );
          })}
        </ol>
      </Panel>

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonBestXI.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("seasonBestXI.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("seasonBestXI.avgRating", {
            avg: (playerData.reduce((sum, p) => sum + p.rating, 0) /
              playerData.length).toFixed(1),
          })} 平均比赛评分
        </p>
        <p>
          {t("seasonBestXI.formationDistribution", {
            formation: formationLabels[selectedFormation],
          })} 常用阵型分布
        </p>
      </Panel>
    </Panel>
  );
}