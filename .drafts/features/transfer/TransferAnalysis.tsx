import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TransferAnalysis() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedView, setSelectedView] = useState<"in" | "out" | "net">("in");

  // 模拟转会数据
  const transferData = useMemo(() => {
    const data = [];
    const positions = ["门将", "后卫", "中场", "前锋"];
    const clubs = ["曼联", "曼城", "利物浦", "切尔西", "阿森纳", "托特纳姆热刺"];

    for (let i = 0; i < 20; i++) {
      const fromClub = clubs[Math.floor(Math.random() * clubs.length)];
      const toClub = clubs[Math.floor(Math.random() * clubs.length)];
      const position = positions[Math.floor(Math.random() * positions.length)];
      const fee = Math.floor(Math.random() * 100000000) + 10000000;
      const month = Math.floor(Math.random() * 11 + 1);
      const day = Math.floor(Math.random() * 28) + 1;
      const date = new Date(new Date().getFullYear(), month - 1, day).toLocaleDateString();

      data.push({
        id: i,
        player: `球员${i + 1}`,
        fromClub,
        toClub,
        position,
        fee,
        date,
        isRealistic: fee < 50000000 || Math.random() > 0.7,
      });
    }
    return data;
  }, []);

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const totalIn = transferData.filter(t => t.toClub !== transferData[0]?.fromClub).length;
  const totalOut = transferData.filter(t => t.fromClub !== transferData[0]?.toClub).length;
  const netSpend = transferData.reduce((sum, t) => sum + t.fee, 0);

  if (!transferData.some(t => t.isRealistic)) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("transferAnalysis.title")} />
        <p className="text-muted-foreground mb-4">
          {t("transferAnalysis.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("transferAnalysis.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Button
          variant={setSelectedView === "in" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("in")}
        >
          {t("transferAnalysis.incoming")}
        </Button>
        <Button
          variant={setSelectedView === "out" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("out")}
        >
          {t("transferAnalysis.outgoing")}
        </Button>
        <Button
          variant={setSelectedView === "net" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("net")}
        >
          {t("transferAnalysis.netSpend", { amount: Math.abs(netSpend).toLocaleString() })}
        </Button>
      </div>

      {/* 转会统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("transferAnalysis.transferStats")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("transferAnalysis.incomingCount")}</div>
            <div>{transferData.filter(t => t.isRealistic).length}</div>
          </div>
          <div>
            <div className="font-medium">{t("transferAnalysis.outgoingCount")}</div>
            <div>{transferData.length}</div>
          </div>
        </div>
      </Panel>

      {/* 转会详情 */}
      {setSelectedView === "in" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("transferAnalysis.incomingTransfers")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("transferAnalysis.totalSpend", { amount: (netSpend > 0 ? netSpend : 0).toLocaleString() })}</p>
          <ul className="list-disc list-inside space-y-1">
            {transferData.filter(t => t.isRealistic).map(t => (
              <li key={t.id}>
                {t.player}: {t.fromClub} → {t.toClub}: {t.currency.euro} {t.fee.toLocaleString()}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {setSelectedView === "out" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("transferAnalysis.outgoingTransfers")} />
          <ul className="list-disc list-inside space-y-1">
            {transferData.map(t => (
              <li key={t.id}>
                {t.player}: {t.fromClub} → {t.toClub}: {t.currency.euro} {t.fee.toLocaleString()}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {setSelectedView === "net" && (
        <Panel className="p-4">
          <SectionTitle title={t("transferAnalysis.netTransfer")} />
          <p>{t("transferAnalysis.netSpendDescription", { amount: Math.abs(netSpend).toLocaleString() })}</p>
          <div className={netSpend > 0 ? "bg-green-50" : netSpend < 0 ? "bg-red-50" : "bg-gray-50"} p-4 rounded>
            <p>{t("transferAnalysis.netSpend", { amount: Math.abs(netSpend).toLocaleString() })}</p>
          </div>
        </Panel>
      )}
    </Panel>
  );
}