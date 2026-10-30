import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TransferContracts() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"all" | "expiring">("all");

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
      marketValue: p.marketValue || 0,
      contractYear: p.contractYear || 0,
      contractValue: p.contractValue || 0,
      weeklyWage: p.weeklyWage || 0,
    }));
  }, [players]);

  const expiringContracts = useMemo(() => {
    return playerData.filter(p => p.contractYear <= 1 && p.contractYear > 0);
  }, [playerData]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  const handleSelectTab = (tab: string) => {
    setSelectedTab(tab);
  };

  if (!players.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("transferContracts.title")} />
        <p className="text-muted-foreground mb-4">
          {t("transferContracts.noPlayers")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("transferContracts.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedTab === "all" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("all")}
        >
          {t("transferContracts.allContracts")}
        </Button>
        <Button
          variant={setSelectedTab === "expiring" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("expiring")}
        >
          {t("transferContracts.expiringContracts")}
        </Button>
      </div>

      {/* 合同列表 */}
      {setSelectedTab === "all" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("transferContracts.contractList")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("transferContracts.totalContracts", { count: playerData.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {playerData.map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("transferContracts.{name}", { name: p.name })} -
                {t("transferContracts.age", { age: p.age })}岁 -
                {t("transferContracts.position", { position: p.position })} -
                {t("transferContracts.contractYear", { year: p.contractYear })}年 -
                {t("currency.euro", { amount: p.contractValue })} -
                {t("currency.euro", { amount: p.weeklyWage })} / 周
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 即将到期合同 */}
      {setSelectedTab === "expiring" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("transferContracts.expiringList")} />
          <p className="text-sm text-danger mb-3">
            {t("transferContracts.expiringCount", { count: expiringContracts.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-danger">
            {expiringContracts.map(p => (
              <li key={p.id} className="font-medium text-danger mb-1">
                {t("transferContracts.{name}", { name: p.name })} -
                {t("transferContracts.contractYear", { year: p.contractYear })}年 -
                {t("currency.euro", { amount: p.contractValue })} -
                {t("currency.euro", { amount: p.weeklyWage })} / 周
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-3"
                  onClick={() => handleSelectPlayer(p.id)}
                >
                  {t("transferContracts.viewDetails")}
                </Button>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 球员详情 */}
      {selectedPlayer && (
        <Panel className="p-4">
          <SectionTitle title={t("transferContracts.playerDetail")} />
          const player = playerData.find(pl => pl.id === selectedPlayer)!;

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("transferContracts.name")}</div>
              <div className="text-2xl text-primary">{player.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("transferContracts.age")}</div>
              <div>{player.age}岁</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("transferContracts.position")}</div>
            <div>{player.position}</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("transferContracts.overall")}</div>
            <div className="text-3xl text-primary">{player.overall}★</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("transferContracts.potential")}</div>
            <div className="text-3xl text-success">{player.potential}★</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("transferContracts.contractYear")}</div>
            <div>{player.contractYear}年</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("transferContracts.contractValue")}</div>
            <div>{t("currency.euro")} {player.contractValue.toLocaleString()}</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("transferContracts.weeklyWage")}</div>
            <div>{t("currency.euro")} {player.weeklyWage.toLocaleString()} / 周</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("transferContracts.contractStatus")}</div>
            <span className="badge bg-primary">
              {t("transferContracts.contractValidUntil", {
                date: new Date(Date.now() + player.contractYear * 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
              })}</span>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("transferContracts.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("transferContracts.totalClubs", { total: clubs.length })} 家俱乐部
        </p>
        <p>{t("transferContracts.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("transferContracts.expiringContracts", {
            count: expiringContracts.length,
            total: players.length,
          })} 球员合同即将到期
        </p>
        <p>
          {t("transferContracts.avgWeeklyWage", {
            avg: (playerData.reduce((sum, p) => sum + p.weeklyWage, 0) /
              playerData.length).toFixed(0),
          })} 平均周薪
        </p>
      </Panel>
    </Panel>
  );
}