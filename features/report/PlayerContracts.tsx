import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerContracts() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      age: p.age,
      position: p.position,
      contractExpiry: p.contractExpiry,
      currentClause: p.currentClause || 0,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("playerContracts.title") } />
        <p className="text-muted-foreground mb-4">
          {t("playerContracts.selectPlayer")}
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
          ))
        </div>
      </Panel>
    );
  }

  const p = playerData.find(pl => pl.id === selectedPlayer)!;

  // 合同状态计算
  const contractStatus = useMemo(() => {
    if (!p.contractExpiry) return { status: "无固定期限", yearsRemaining: "永久" };
    const expiryDate = new Date(p.contractExpiry);
    const today = new Date();
    const yearsRemaining = expiryDate.getFullYear() - today.getFullYear();
    const monthsRemaining = expiryDate.getMonth() - today.getMonth();
    const daysRemaining = expiryDate.getDate() - today.getDate();
    
    let status;
    if (yearsRemaining <= 0) status = "已过期";
    else if (yearsRemaining <= 1) status = "临期";
    else if (yearsRemaining <= 2) status = "即将过期";
    else status = "长期";

    return { status, yearsRemaining: `${yearsRemaining}年${monthsRemaining}月${daysRemaining}天` };
  }, [p.contractExpiry]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("playerContracts.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("playerContracts.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("playerContracts.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("playerContracts.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("playerContracts.position")}</div>
              <div className="text-info">{p.position}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("playerContracts.contractStatus") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("playerContracts.contractStatus")}</div>
              <div>{contractStatus.status}</div>
            </div>
            <div>
              <div className="font-medium">{t("playerContracts.yearsRemaining")}</div>
              <div>{contractStatus.yearsRemaining}</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 合同详情 */}
      <Panel className="p-4">
        <SectionTitle title={t("playerContracts.contractDetails") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("playerContracts.contractExpiry")}</div>
            <div>{p.contractExpiry ? new Date(p.contractExpiry).toLocaleDateString() : t("playerContracts.noExpiryDate")}</div>
          </div>
          <div>
            <div className="font-medium">{t("playerContracts.currentClause")}</div>
            <div>{t("currency.euro")} {p.currentClause}</div>
          </div>
        </div>
      </Panel>

      {/* 合同概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("playerContracts.contractOverview") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("playerContracts.contractSummary")}
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>{t("playerContracts.totalPlayers")}: {players.length}</li>
          <li>{t("playerContracts.expiredContracts")}: {players.filter(p => {
            if (!p.contractExpiry) return false;
            const expiryDate = new Date(p.contractExpiry);
            const today = new Date();
            return expiryDate.getFullYear() <= today.getFullYear();
          }).length}</li>
          <li>{t("playerContracts.expiringSoon")}: {players.filter(p => {
            if (!p.contractExpiry) return false;
            const expiryDate = new Date(p.contractExpiry);
            const today = new Date();
            return expiryDate.getFullYear() - today.getFullYear() <= 1 && expiryDate.getFullYear() > today.getFullYear();
          }).length}</li>
          <li>{t("playerContracts.longTerm")}: {players.filter(p => {
            if (!p.contractExpiry) return true;
            const expiryDate = new Date(p.contractExpiry);
            const today = new Date();
            return expiryDate.getFullYear() - today.getFullYear() > 2;
          }).length}</li>
        </ul>
      </Panel>
    </Panel>
  );
}