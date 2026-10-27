import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ContractManagement() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      contractStart: p.contractStart || new Date().getFullYear(),
      contractEnd: p.contractEnd || new Date().getFullYear() + 2,
      weeklyWage: p.weeklyWage || 0,
      contractStatus: p.contractStatus || "有效",
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
          {t("player.selectPlayerToViewContract")}
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
  const yearsRemaining = p.contractEnd - new Date().getFullYear();
  const isContractExpiring = yearsRemaining <= 1 && yearsRemaining > 0;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("player.contractTitle")} />
      
      {/* 合同概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("player.contractPeriod")}
          value={`${p.contractStart}-${p.contractEnd}`}
          subtitle={t("player.contractPeriodDesc")}
        />
        <StatTile
          title={t("player.yearsRemaining")}
          value={yearsRemaining > 0 ? `${yearsRemaining}` + t("player.years") : t("player.expired")}
          variant={isContractExpiring ? "destructive" : "default"}
        />
        <StatTile
          title={t("player.weeklyWage")}
          value={`${t("currency.euro")} ${p.weeklyWage.toLocaleString()}/w`}
          subtitle={t("player.wage")}
        />
        <StatTile
          title={t("player.contractStatus")}
          value={p.contractStatus}
          subtitle={t("player.status")}
        />
      </div>

      {/* 合同状态 */}
      {isContractExpiring && (
        <Panel className="p-4 mb-6" style={{ borderColor: "warning" }}>
          <SectionTitle title={t("player.contractExpiring")} />
          <p className="text-warning mb-3">
            {t("player.renewContractUrgent")}
          </p>
          <Button variant="primary" size="sm">
            {t("player.renewContract")}
          </Button>
          <Button variant="outline" size="sm">
            {t("player.viewDetails")}
          </Button>
        </Panel>
      )}

      {/* 合同详情 */}
      <Panel className="p-4">
        <SectionTitle title={t("player.contractDetails")} />
        <p className="text-sm text-muted-foreground">
          {t("player.contractDetailsDesc", { yearsRemaining })}
        </p>
      </Panel>

      {/* 选换球员 */}
      <Panel className="p-4">
        <SectionTitle title={t("player.selectAnotherPlayer")} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedPlayer(null)}
        >
          {t("player.selectAnotherPlayer")}
        </Button>
      </Panel>
    </Panel>
  );
}