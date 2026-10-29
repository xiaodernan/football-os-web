import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonTransferActivity() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedView, setSelectedView] = useState<"in" | "out" | "net">("in");

  // 模拟转会数据
  const transfersIn = useMemo(() => players.filter(p => p.marketValue > 10000000), [players]).map(p => ({
    player: p.name,
    club: t(`team.${Math.floor(Math.random() * 20 + 1)}`),
    fee: Math.floor(Math.random() * 50000000) + 10000000,
    date: new Date(new Date().getFullYear(), Math.random() * 11 + 1, Math.random() * 28 + 1).toLocaleDateString(),
  }));

  const transfersOut = useMemo(() => players.filter(p => p.marketValue > 10000000), [players]).map(p => ({
    player: p.name,
    newClub: t(`team.${Math.floor(Math.random() * 20 + 1)}`),
    fee: Math.floor(Math.random() * 50000000) + 10000000,
    date: new Date(new Date().getFullYear(), Math.random() * 11 + 1, Math.random() * 28 + 1).toLocaleDateString(),
  }));

  const netSpend = useMemo(() => {
    const totalIn = transfersIn.reduce((sum, t) => sum + t.fee, 0);
    const totalOut = transfersOut.reduce((sum, t) => sum + t.fee, 0);
    return totalIn - totalOut;
  }, [transfersIn, transfersOut]);

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonTransferActivity.title") } />

      {/* 视图切换 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Button
          variant={setSelectedView === "in" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("in")}
        >
          {t("seasonTransferActivity.incoming")}
        </Button>
        <Button
          variant={setSelectedView === "out" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("out")}
        >
          {t("seasonTransferActivity.outgoing")}
        </Button>
        <Button
          variant={setSelectedView === "net" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("net")}
        >
          {t("seasonTransferActivity.netSpend", { amount: Math.abs(netSpend).toLocaleString() })}
        </Button>
      </div>

      {/* 转会统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonTransferActivity.transferStats") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("seasonTransferActivity.incomingCount")}</div>
            <div>{transfersIn.length}</div>
          </div>
          <div>
            <div className="font-medium">{t("seasonTransferActivity.outgoingCount")}</div>
            <div>{transfersOut.length}</div>
          </div>
        </div>
      </Panel>

      {/* 转会详情 */}
      {setSelectedView === "in" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonTransferActivity.incomingTransfers") } />
          <p className="text-sm text-muted-foreground mb-3">
            {t("seasonTransferActivity.totalSpend", { amount: netSpend > 0 ? netSpend : 0 })}</p>
          <ul className="list-disc list-inside space-y-1">
            {transfersIn.map(t => (
              <li key={t.date}>
                {t.player} → {t.club}: {t.currency.euro} {t.fee.toLocaleString()}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {setSelectedView === "out" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonTransferActivity.outgoingTransfers") } />
          <ul className="list-disc list-inside space-y-1">
            {transfersOut.map(t => (
              <li key={t.date}>
                {t.player} → {t.newClub}: {t.currency.euro} {t.fee.toLocaleString()}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {setSelectedView === "net" && (
        <Panel className="p-4">
          <SectionTitle title={t("seasonTransferActivity.netTransfer") } />
          <p>{t("seasonTransferActivity.netSpendDescription", { amount: Math.abs(netSpend).toLocaleString() })}</p>
          <div className={netSpend > 0 ? "bg-green-50" : netSpend < 0 ? "bg-red-50" : "bg-gray-50"} p-4 rounded>
            <p>{t("seasonTransferActivity.netSpend", { amount: Math.abs(netSpend).toLocaleString() })}</p>
          </div>
        </Panel>
      )}
    </Panel>
  );
}