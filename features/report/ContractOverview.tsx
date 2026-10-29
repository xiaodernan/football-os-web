import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ContractOverview() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedView, setSelectedView] = useState<"expiring" | "byClause">("expiring");

  // 按合同状态分类
  const contractStatus = useMemo(() => ({
    expiring: players.filter(p => {
      const expiry = p.contractExpiry;
      if (!expiry) return false;
      const yearsUntilExpiry = new Date(expiry).getFullYear() - new Date().getFullYear();
      return yearsUntilExpiry <= 2;
    }),
    expiringSoon: players.filter(p => {
      const expiry = p.contractExpiry;
      if (!expiry) return false;
      const yearsUntilExpiry = new Date(expiry).getFullYear() - new Date().getFullYear();
      return yearsUntilExpiry <= 1 && yearsUntilExpiry > 0;
    }),
    longTerm: players.filter(p => {
      const expiry = p.contractExpiry;
      if (!expiry) return true; // No expiry date = long term
      const yearsUntilExpiry = new Date(expiry).getFullYear() - new Date().getFullYear();
      return yearsUntilExpiry > 2;
    }),
    noExpiry: players.filter(p => !p.contractExpiry),
  }), [players]);

  const totalPlayers = players.length;
  const expiringCount = contractStatus.expiring.length;
  const soonCount = contractStatus.expiringSoon.length;

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  return (
    <Panel className="p-6">
      <SectionTitle title={t("contractOverview.title") } />

      {/* 视图切换 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Button
          variant={setSelectedView === "expiring" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("expiring")}
        >
          {t("contractOverview.expiring")}
        </Button>
        <Button
          variant={setSelectedView === "byClause" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("byClause")}
        >
          {t("contractOverview.byClause")}
        </Button>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("contractOverview.totalPlayers")}
          value={totalPlayers.toLocaleString()}
          subtitle={t("contractOverview.totalSquad")}
        />
        <StatTile
          title={t("contractOverview.expiringContracts")}
          value={expiringCount}
          subtitle={t("contractOverview.expiringSoon", { count: soonCount })}
          status={expiringCount > 0 ? "warning" : "success"}
        />
      </div>

      {/* 过期合同 */}
      {setSelectedView === "expiring" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("contractOverview.expiringContracts") } />
          <p className="text-warning mb-3">
            {t("contractOverview.playersWithExpiringContracts", { count: expiringCount })}
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-warning">
            {contractStatus.expiring.map(p => (
              <li key={p.id}>
                {t("contractOverview.player", { name: p.name })} - {t("contractOverview.expires", { year: new Date(p.contractExpiry).getFullYear() })}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* 即将过期 */}
      {setSelectedView === "expiringSoon" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("contractOverview.expiringSoon") } />
          <p className="text-danger mb-3">
            {t("contractOverview.playersExpiringWithinYear", { count: soonCount })}</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-danger">
            {contractStatus.expiringSoon.map(p => (
              <li key={p.id}>
                {t("contractOverview.player", { name: p.name })} - {t("contractOverview.expires", { year: new Date(p.contractExpiry).getFullYear() })}</li>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* 长期合同 */}
      {setSelectedView === "longTerm" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("contractOverview.longTermContracts") } />
          <p className="text-success mb-3">
            {t("contractOverview.playersLongTerm", { count: contractStatus.longTerm.length })}</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-success">
            {contractStatus.longTerm.map(p => (
              <li key={p.id}>
                {t("contractOverview.player", { name: p.name })} - 永久/长期合同</li>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* 无固定期限 */}
      {setSelectedView === "noExpiry" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("contractOverview.noExpiryContract") } />
          <p className="text-info mb-3">
            {t("contractOverview.playersNoFixedExpiry", { count: contractStatus.noExpiry.length })}</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-info">
            {contractStatus.noExpiry.map(p => (
              <li key={p.id}>
                {t("contractOverview.player", { name: p.name })} - {t("contractOverview.noExpiry")}</li>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </Panel>
  );
}