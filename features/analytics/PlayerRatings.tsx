import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerRatings() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!players.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("playerRatings.title")} />
        <p className="text-muted-foreground mb-4">
          {t("playerRatings.noPlayers")}
        </p>
      </Panel>
    );
  }

  const [selectedView, setSelectedView] = useState<"rating" >("rating");

  const sortedByOverall = [...playerData].sort((a, b) => b.overall - a.overall);
  const sortedByPotential = [...playerData].sort((a, b) => b.potential - a.potential);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("playerRatings.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "overall" ? "primary" : "outline"}
          size="sm"
          onClick={() => setSelectedView("overall")}
        >
          {t("playerRatings.overallRating")}
        </Button>
        <Button
          variant={setSelectedView === "potential" ? "primary" : "outline"}
          size="sm"
          onClick={() => setSelectedView("potential")}
        >
          {t("playerRatings.potentialRating")}
        </Button>
      </div>

      {/* 当前实力榜 */}
      {setSelectedView === "overall" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("playerRatings.currentAbility")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("playerRatings.players", { count: players.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {sortedByOverall.slice(0, 10).map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("playerRatings.rank", { rank: sortedByOverall.indexOf(p) + 1 })}:
                {t("playerRatings.{name}", { name: p.name })} - {t("playerRatings.overall", { overall: p.overall })}★
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 潜力榜 */}
      {setSelectedView === "potential" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("playerRatings.potentialAbility")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("playerRatings.players", { count: players.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-success">
            {sortedByPotential.slice(0, 10).map(p => (
              <li key={p.id} className="font-medium text-success mb-1">
                {t("playerRatings.rank", { rank: sortedByPotential.indexOf(p) + 1 })}:
                {t("playerRatings.{name}", { name: p.name })} - {t("playerRatings.potential", { potential: p.potential })}★
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 俱乐部详情 */}
      {selectedPlayer && (
        <Panel className="p-4">
          <SectionTitle title={t("playerRatings.playerDetail")} />
          const p = playerData.find(pl => pl.id === selectedPlayer)!;
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("playerRatings.name")}</div>
              <div className="text-2xl text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("playerRatings.age")}</div>
              <div>{p.age}岁</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("playerRatings.overall")}</div>
            <div className="text-3xl text-primary">{p.overall}★</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("playerRatings.potential")}</div>
            <div className="text-3xl text-success">{p.potential}★</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("playerRatings.position")}</div>
            <div>{p.position}</div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("playerRatings.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("playerRatings.totalPlayers", { count: players.length })} 名球员</p>
        <p>{t("playerRatings.avgOverall", { avg: (players.reduce((sum, p) => sum + p.overall, 0) / players.length).toFixed(1) })} 平均实力</p>
        <p>{t("playerRatings.avgPotential", { avg: (players.reduce((sum, p) => sum + p.potential, 0) / players.length).toFixed(1) })} 平均潜力</p>
      </Panel>
    </Panel>
  );
}