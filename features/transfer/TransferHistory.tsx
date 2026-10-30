import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TransferHistory() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"in" | "out" | "all">("all");

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

  const transferHistory = useMemo(() => {
    const history = [];
    const statuses = ["completed", "rejected", "loan"];
    const months = [
      "1月", "2月", "3月", "4月", "5月", "6月",
      "7月", "8月", "9月", "10月", "11月", "12月",
    ];

    // Generate historical transfers based on current data
    for (let i = 0; i < 50; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const month = months[Math.floor(Math.random() * months.length)];
      const day = Math.floor(Math.random() * 28) + 1;
      const fee = Math.floor(Math.random() * 100000000) + 10000000;
      const fromClub = clubs[Math.floor(Math.random() * clubs.length)].name;
      const toClub = clubs[Math.floor(Math.random() * clubs.length)].name;
      const player = players[Math.floor(Math.random() * players.length)].name;
      const year = 2024 + Math.floor(Math.random() * 3);

      history.push({
        id: i,
        date: `${year}年${month}${day}日`,
        status,
        player,
        fromClub,
        toClub,
        fee,
      });
    }
    return history;
  }, [clubs, players]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const incomingTransfers = transferHistory.filter(t => t.status !== "out");
  const outgoingTransfers = transferHistory.filter(t => t.status === "out" || !t.status);

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("transferHistory.title")} />
        <p className="text-muted-foreground mb-4">
          {t("transferHistory.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("transferHistory.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Button
          variant={setSelectedView === "all" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("all")}
        >
          {t("transferHistory.all")}
        </Button>
        <Button
          variant={setSelectedView === "in" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("in")}
        >
          {t("transferHistory.incoming")}
        </Button>
        <Button
          variant={setSelectedView === "out" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("out")}
        >
          {t("transferHistory.outgoing")}
        </Button>
      </div>

      {/* 转会统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("transferHistory.statistics")} />
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            title={t("transferHistory.totalTransfers")}
            value={transferHistory.length}
            subtitle={t("transferHistory.marketActivity")}
          />
          <StatTile
            title={t("transferHistory.incoming")}
            value={incomingTransfers.length}
            subtitle={t("transferHistory.netSpending")}
          />
          <StatTile
            title={t("transferHistory.outgoing")}
            value={outgoingTransfers.length}
            subtitle={t("transferHistory.revenue")}
          />
        </div>
      </Panel>

      {/* 转会列表 */}
      {setSelectedView === "all" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("transferHistory.transferList")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("transferHistory.totalTransfers", { count: transferHistory.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {transferHistory.map(t => (
              <li key={t.id} className="font-medium text-primary mb-1">
                {t.player}: {t.fromClub} → {t.toClub} -
                {t.date} - {t.fee > 0 ? t.currency.euro + " " + t.fee.toLocaleString() : "自由转会"}</li>
            ))}
          </ol>
        </Panel>
      )}

      {/*  incoming transfers */}
      {setSelectedView === "in" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("transferHistory.incomingList")} />
          <p className="text-sm text-primary mb-3">
            {t("transferHistory.incomingCount", { count: incomingTransfers.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-primary">
            {incomingTransfers.map(t => (
              <li key={t.id} className="font-medium text-primary mb-1">
                {t.player}: {t.fromClub} → {t.toClub} -
                {t.date} - {t.fee > 0 ? t.currency.euro + " " + t.fee.toLocaleString() : "自由转会"}
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* outgoing transfers */}
      {setSelectedView === "out" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("transferHistory.outgoingList")} />
          <p className="text-sm text-danger mb-3">
            {t("transferHistory.outgoingCount", { count: outgoingTransfers.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-danger">
            {outgoingTransfers.map(t => (
              <li key={t.id} className="font-medium text-danger mb-1">
                {t.player}: {t.fromClub} → {t.toClub} -
                {t.date} - {t.fee > 0 ? t.currency.euro + " " + t.fee.toLocaleString() : "自由转会"}
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 选中的俱乐部 */}
      {selectedClub && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("transferHistory.clubDetail")} />
          const club = clubs.find(c => c.id === selectedClub)!;

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("transferHistory.name")}</div>
              <div className="text-2xl text-primary">{club.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("transferHistory.position")}</div>
              <div>{club.position}位</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("transferHistory.netSpending")}</div>
            <div>{t("currency.euro", { amount: Math.floor(Math.random() * 100000000) })}</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("transferHistory.spending")}</div>
            <div>{t("currency.euro", { amount: Math.floor(Math.random() * 80000000) })}</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("transferHistory.revenue")}</div>
            <div>{t("currency.euro", { amount: Math.floor(Math.random() * 30000000) })}</div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("transferHistory.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("transferHistory.totalClubs", { total: clubs.length })} 家俱乐部
        </p>
        <p>{t("transferHistory.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("transferHistory.seasonSpending", {
            amount: Math.floor(Math.random() * 200000000),
          })} 本赛季转会支出
        </p>
      </Panel>
    </Panel>
  );
}