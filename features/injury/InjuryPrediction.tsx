import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function InjuryPrediction() {
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
      rating: p.rating || 0,
      injuryStatus: p.injuryStatus || "fit",
    }));
  }, [players]);

  const [selectedView, setSelectedView] = useState<"current" "predicted">("current");

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const injuredPlayers = useMemo(() => {
    return playerData.filter(p => p.injuryStatus === "injured");
  }, [playerData]);

  const fitPlayers = useMemo(() => {
    return playerData.filter(p => p.injuryStatus === "fit");
  }, [playerData]);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  const handleSelectView2 = (view: string) => {
    setSelectedView(view);
  };

  if (!players.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("injuryPrediction.title")} />
        <p className="text-muted-foreground mb-4">
          {t("injuryPrediction.noPlayers")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("injuryPrediction.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "current" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView2("current")}
        >
          {t("injuryPrediction.currentInjuries")}
        </Button>
        <Button
          variant={setSelectedView === "predicted" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView2("predicted")}
        >
          {t("injuryPrediction.injuryRisks")}
        </Button>
      </div>

      {/* 当前伤病 */}
      {setSelectedView === "current" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("injuryPrediction.currentInjuries")} />
          <p className="text-sm text-danger mb-3">
            {t("injuryPrediction.totalInjured", { count: injuredPlayers.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-danger">
            {injuredPlayers.map(p => (
              <li key={p.id} className="font-medium text-danger mb-1">
                {t("injuryPrediction.{name}", { name: p.name })} - {t("injuryStatus.{status}", { status: p.injuryStatus })}</li>
              ))}
          </ol>
        </Panel>
      )}

      {/* 预测伤病风险 */}
      {setSelectedView === "predicted" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("injuryPrediction.predictionRisks")} />
          <p className="text-sm text-warning mb-3">
            {t("injuryPrediction.playersAtRisk", { count: fitPlayers.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-warning">
            {fitPlayers
              .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
              .slice(0, 10)
              .map(p => (
                <li key={p.id} className="font-medium text-warning mb-1">
                  {t("injuryPrediction.{name}", { name: p.name })} - 
                  {t("injuryPrediction.games", { games: p.gamesPlayed })}场 - 
                  {t("injuryPrediction.rating", { rating: p.rating })}评分</li>
              ))}
          </ol>
        </Panel>
      )}

      {/* 选中的球员 */}
      {selectedPlayer && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("injuryPrediction.playerDetail")} />
          const player = playerData.find(pl => pl.id === selectedPlayer)!;

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("injuryPrediction.name")}</div>
              <div className="text-2xl text-primary">{player.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("injuryPrediction.position")}</div>
              <div>{player.position}</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("injuryPrediction.overall")}</div>
            <div className="text-3xl text-primary">{player.overall}★</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("injuryPrediction.age")}</div>
            <div>{player.age}岁</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("injuryPrediction.currentStatus")}</div>
            <span className="badge bg-${player.injuryStatus === "injured" ? "danger" : "success"}">
              {t("injuryPrediction.{status}", { status: player.injuryStatus })}
            </span>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("injuryPrediction.gamesPlayed")}</div>
            <div>{player.gamesPlayed}场</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("injuryPrediction.riskLevel")}</div>
            <div>{t("injuryPrediction.lowRisk")}</div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("injuryPrediction.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("injuryPrediction.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("injuryPrediction.healthySquad", {
            count: fitPlayers.length,
          })} 健康球员</p>
        <p>
          {t("injuryPrediction.injuryRate", {
            rate: ((players.length - fitPlayers.length) / players.length * 100).toFixed(1),
          })} 受伤率</p>
      </Panel>
    </Panel>
  );
}