import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubTransferPrediction() {
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
      points: c.points || 0,
      marketValue: c.marketValue || 0,
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
      marketValue: p.marketValue || 0,
    }));
  }, [players]);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"targets" "budget">("targets");

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("clubTransferPrediction.title")} />
        <p className="text-muted-foreground mb-4">
          {t("clubTransferPrediction.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("clubTransferPrediction.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "targets" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("targets")}
        >
          {t("clubTransferPrediction.targets")}
        </Button>
        <Button
          variant={setSelectedView === "budget" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("budget")}
        >
          {t("clubTransferPrediction.budget")}
        </Button>
      </div>

      {/* 目标球员 */}
      {setSelectedView === "targets" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubTransferPrediction.targetPlayers")} />
          <p className="text-sm text-primary">俱乐部目标球员</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {playerData
              .sort((a, b) => b.marketValue - a.marketValue)
              .slice(0, 5)
              .map(p => (
                <li key={p.id} className="font-medium text-primary mb-1">
                  {t("clubTransferPrediction.{name}", { name: p.name })} - {t("currency.euro", { amount: p.marketValue })}</li>
              ))
          </ol>
        </Panel>
      )}

      {/* 预算概览 */}
      {setSelectedView === "budget" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubTransferPrediction.budgetOverview")} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="font-medium text-primary">市值</div>
              <div>{t("currency.euro", { amount: clubData.find(c => c.id === selectedClub)?.marketValue })}</div>
            </div>
            <div>
              <div className="font-medium text-primary">薪资帽</div>
              <div>{t("currency.euro", { amount: clubData.find(c => c.id === selectedClub)?.wageBill })}</div>
            </div>
            <div>
              <div className="font-medium text-primary">剩余预算</div>
              <div>{t("currency.euro", { amount: 50000000 })}</div>
            </div>
          </div>
        </Panel>
      )}

      {/* 选中的球员 */}
      {selectedPlayer && selectedClub && (
        <Panel className="p-4">
          <SectionTitle title={t("clubTransferPrediction.playerDetail")} />
          const player = playerData.find(pl => pl.id === selectedPlayer)!;
          const club = clubs.find(c => c.id === selectedClub)!;

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("clubTransferPrediction.name")}</div>
              <div className="text-2xl text-primary">{player.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("clubTransferPrediction.club")}</div>
              <div className="text-2xl text-primary">{club.name}</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("clubTransferPrediction.overall")}</div>
            <div className="text-3xl text-primary">{player.overall}★</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("clubTransferPrediction.position")}</div>
            <div>{player.position}</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("clubTransferPrediction.marketValue")}</div>
            <div>{t("currency.euro", { amount: player.marketValue })}</div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("clubTransferPrediction.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("clubTransferPrediction.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("clubTransferPrediction.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}