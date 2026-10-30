import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonTransferOverview() {
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

  const [selectedView, setSelectedView] = useState<"summary" | "incoming" | "outgoing">("summary");

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  // Generate transfer data for the season
  const transferData = useMemo(() => {
    const statuses = ["completed", "rejected", "loan"];
    const months = [
      "1月", "2月", "3月", "4月", "5月", "6月",
      "7月", "8月", "9月", "10月", "11月", "12月",
    ];
    const history = [];

    for (let i = 0; i < 40; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const month = months[Math.floor(Math.random() * months.length)];
      const day = Math.floor(Math.random() * 28) + 1;
      const fee = Math.floor(Math.random() * 100000000) + 10000000;
      const fromClub = clubs[Math.floor(Math.random() * clubs.length)].name;
      const toClub = clubs[Math.floor(Math.random() * clubs.length)].name;
      const player = players[Math.floor(Math.random() * players.length)].name;
      const year = 2026;

      history.push({
        id: i,
        date: `${year}年${month}${day}`,
        status,
        player,
        fromClub,
        toClub,
        fee,
      });
    }
    return history;
  }, [clubs, players]);

  const incomingTransfers = transferData.filter(t => t.status !== "out" && t.fee > 0);
  const outgoingTransfers = transferData.filter(t => t.status === "out" || t.fee <= 0);

  const totalIncomingFee = incomingTransfers.reduce((sum, t) => sum + t.fee, 0);
  const totalOutgoingFee = outgoingTransfers.reduce((sum, t) => sum + t.fee, 0);

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonTransferOverview.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonTransferOverview.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonTransferOverview.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Button
          variant={setSelectedView === "summary" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("summary")}
        >
          {t("seasonTransferOverview.summary")}
        </Button>
        <Button
          variant={setSelectedView === "incoming" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("incoming")}
        >
          {t("seasonTransferOverview.incoming")}
        </Button>
        <Button
          variant={setSelectedView === "outgoing" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("outgoing")}
        >
          {t("seasonTransferOverview.outgoing")}
        </Button>
      </div>

      {/* 转会概览 */}
      {setSelectedView === "summary" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonTransferOverview.summary")} />
          <div className="grid grid-cols-3 gap-3">
            <StatTile
              title={t("seasonTransferOverview.totalTransfers")}
              value={transferData.length}
              subtitle={t("seasonTransferOverview.season")}
            />
            <StatTile
              title={t("seasonTransferOverview.incomingCount")}
              value={incomingTransfers.length}
              subtitle={t("seasonTransferOverview.incoming")}
            />
            <StatTile
              title={t("seasonTransferOverview.outgoingCount")}
              value={outgoingTransfers.length}
              subtitle={t("seasonTransferOverview.outgoing")}
            />
          </div>
          <div className="mt-3">
            <div className="font-medium text-primary">总支出</div>
            <div>{t("currency.euro", { amount: totalIncomingFee })}</div>
          </div>
          <div className="mt-3">
            <div className="font-medium text-success">总收入</div>
            <div>{t("currency.euro", { amount: totalOutgoingFee })}</div>
          </div>
          <div className="mt-3">
            <div className="font-medium text-info">净支出</div>
            <div>
              {totalIncomingFee > totalOutgoingFee ? `-${(totalIncomingFee - totalOutgoingFee).toLocaleString()}` : `+${(totalOutgoingFee - totalIncomingFee).toLocaleString()}`}
            </div>
          </div>
        </Panel>
      )}

      {/* incoming transfers */}
      {setSelectedView === "incoming" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonTransferOverview.incomingList")} />
          <p className="text-sm text-primary mb-3">
            {t("seasonTransferOverview.incomingCount", { count: incomingTransfers.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-primary">
            {incomingTransfers.map(t => (
              <li key={t.id} className="font-medium text-primary mb-1">
                {t.player}: {t.fromClub} → {t.toClub} - {t.date} - {t.currency.euro + " " + t.fee.toLocaleString()}</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* outgoing transfers */}
      {setSelectedView === "outgoing" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonTransferOverview.outgoingList")} />
          <p className="text-sm text-danger mb-3">
            {t("seasonTransferOverview.outgoingCount", { count: outgoingTransfers.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-danger">
            {outgoingTransfers.map(t => (
              <li key={t.id} className="font-medium text-danger mb-1">
                {t.player}: {t.fromClub} → {t.toClub} - {t.date} - {t.currency.euro + " " + t.fee.toLocaleString()}</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonTransferOverview.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("seasonTransferOverview.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("seasonTransferOverview.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("seasonTransferOverview.marketActivity", {
            count: transferData.length,
          })} 转会活动</p>
      </Panel>
    </Panel>
  );
}