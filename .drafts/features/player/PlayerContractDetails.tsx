import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerContractDetails() {
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

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("player.contractTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("player.selectPlayerForContract")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {playerData.slice(0, 6).map(p => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectPlayer(p.id)}
            >
              {p.name}
            </Button>
          ))}
        </div>
      </Panel>
    );
  }

  const p = playerData.find(pl => pl.id === selectedPlayer)!;

  // 合同数据
  const contractStart = useMemo(() => new Date("2023-07-01"), []);
  const contractEnd = useMemo(() => new Date("2026-06-30"), []);
  const yearsLeft = useMemo(() => {
    const diff = contractEnd.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (365.25 * 24 * 60 * 60 * 1000)));
  }, []);

  // 合同状态
  const contractStatus = yearsLeft switch {
    > 2 => "长期合同",
    > 1 => "中期合同",
    > 0 => "最后赛季",
    default => "已自由身",
  };

  // 年薪
  const weeklyWage = useMemo(() => Math.floor(p.marketValue * 0.001), [p.marketValue]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("player.contractTitle")} />

      {/* 合同概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("player.contractDetails")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("player.contractStart")}</div>
              <div className="text-muted-foreground">{contractStart.toLocaleDateString()}</div>
            </div>
            <div>
              <div className="font-medium">{t("player.contractEnd")}</div>
              <div className="text-danger">{contractEnd.toLocaleDateString()}</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="font-medium">{t("player.contractStatus")}</div>
            <div className={`text-${contractStatus === "已自由身" ? "danger" : "primary"} font-medium`}>
              {t(`status.${contractStatus}`)}
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("player.wageInfo")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("player.weeklyWage")}</div>
              <div className="text-primary">{t("currency.euro")} ${weeklyWage.toLocaleString()}/w</div>
            </div>
            <div>
              <div className="font-medium">{t("player.annualEstimate")}</div>
              <div className="text-success">${(weeklyWage * 52).toLocaleString()}/年</div>
            </div>
          </div>
          <div className="mt-3 p-3 bg-primary/10 rounded">
            <div className="font-medium">{t("player.releaseClause")}</div>
            <div className="text-primary">€1亿 release clause</div>
          </div>
        </Panel>
      </div>

      {/* 续约选项 */}
      {yearsLeft <= 2 && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("player.renewalOptions")} />
          <div className="grid grid-cols-2 gap-3">
            <Button variant="primary" size="sm">
              {t("player.initiateRenewal")}
            </Button>
            <Button variant="outline" size="sm">
              {t("player.marketValuation")}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {t("player.renewalUrgency", { years: yearsLeft }) }
          </p>
        </Panel>
      )}

      {/* 离队选项 */}
      {yearsLeft <= 1 && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("player.transferOptions")} />
          <Button variant="destructive" size="sm">
            {t("player.listForTransfer")}
          </Button>
          <Button variant="outline" size="sm">
            {t("player.negotiateTransfer")}
          </Button>
        </Panel>
      )}
    </Panel>
  );
}