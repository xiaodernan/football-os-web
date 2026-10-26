import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import { executeTransfer, TransferOffer, TransferResult, getFreeAgents } from "@/domain/transfer";
import { Panel, SectionTitle, EmptyState, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TransferWindow() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);
  const competitions = footballProvider.competitions();
  const [selectedPlayer, setSelectedPlayer] = React.useState<string | null>(null);
  const [offerFee, setOfferFee] = React.useState(0);
  const [transferResult, setTransferResult] = React.useState<{ success: boolean; message: string } | null>(null);

  // 计算球员估值
  const playerValuation = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      age: p.age,
      contractYears: p.contractYearsRemaining,
      currentFee: calculateTransferFee(p.overall, p.age, p.contractYearsRemaining)
    }));
  }, [players]);

  // 免费转会名单
  const freeAgents = useMemo(() => getFreeAgents(competitions), [competitions]);

  const handleInitiateTransfer = () => {
    if (!selectedPlayer || offerFee <= 0) {
      setTransferResult({ success: false, message: t("world.selectPlayerAndFee") });
      return;
    }

    const offer: TransferOffer = {
      fromClub: "myClub", // 实际应从 context 获取
      toClub: "targetClub",
      playerId: selectedPlayer,
      fee: offerFee
    };

    const result = executeTransfer(offer.fromClub, offer.toClub, offer.playerId, offer.fee);
    setTransferResult({
      success: result.success,
      message: result.message
    });

    if (result.success) {
      // 转会后重新加载数据
      setSelectedPlayer(null);
      setOfferFee(0);
    }
  };

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <SectionTitle title={t("world.transferWindowTitle")} />
        
        {/* 球员估值卡片 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {playerValuation.slice(0, 8).map(p => (
            <div key={p.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
              <div className="font-medium">{p.name}</div>
              <div className="text-primary font-medium">{p.overall}⭐</div>
              <div className="text-xs text-muted-foreground">年龄: {p.age}</div>
              <div className="text-xs text-muted-foreground">合同: {p.contractYears}年</div>
              <div className="mt-2">
                <div className="text-sm font-medium">{t("world.estimatedFee")}: {p.currentFee.toLocaleString()}€</div>
                <input
                  type="number"
                  min={p.currentFee}
                  value={offerFee || p.currentFee}
                  onChange={(e) => setOfferFee(parseInt(e.target.value) || 0)}
                  className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                />
              </div>
            </div>
          ))}
        </div>

        {/* 免费转会区域 */}
        {freeAgents.length > 0 && (
          <div>
            <h3 className="text-semibold mb-3">{t("world.freeAgents")}</h3>
            <div className="grid grid-cols-2 gap-2">
              {freeAgents.slice(0, 6).map(p => (
                <div
                  key={p.playerId}
                  className="border rounded p-2 text-center cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => {
                    setSelectedPlayer(p.playerId);
                    setOfferFee(p.overall > 80 ? 800000 : 500000); // 免费转会报价
                  }}
                >
                  <div>{p.name}</div>
                  <div className="text-xs text-primary">{p.overall}⭐</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 转会结果 */}
        {transferResult && (
          <Panel className="p-4 mt-4">
            <div className={`p-3 rounded ${transferResult.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {transferResult.message}
            </div>
          </Panel>
        )}

        {/* 转会操作按钮 */}
        {selectedPlayer && offerFee > 0 && (
          <Button
            onClick={handleInitiateTransfer}
            className="w-full"
          >
            {t("world.initiateTransfer")}
          </Button>
        )}

        {/* 选择球员提示 */}
        {!selectedPlayer && (
          <p className="text-sm text-muted-foreground">{t("world.selectPlayerFirst")}</p>
        )}
      </Panel>
    </div>
  );
}