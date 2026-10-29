import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function DataBackup() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedTab, setSelectedTab] = useState<"players" | "clubs">("players");

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      marketValue: p.marketValue,
    }));
  }, [players]);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      revenue: c.revenue,
      wageBill: c.wageBill,
    }));
  }, [clubs]);

  const playerBackupStatus = useMemo(() => ({
    lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨天
    totalRecords: playerData.length,
    backupSize: "1.2 MB",
    status: "completed",
  }), [playerData.length]);

  const clubBackupStatus = useMemo(() => ({
    lastBackup: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12小时前
    totalRecords: clubData.length,
    backupSize: "850 KB",
    status: "completed",
  }), [clubData.length]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("dataBackup.title") } />

      {/* 标签切换 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button
          variant={selectedTab === "players" ? "primary" : "outline"}
          size="sm"
          onClick={() => setSelectedTab("players")}
        >
          {t("dataBackup.players")}
        </Button>
        <Button
          variant={selectedTab === "clubs" ? "primary" : "outline"}
          size="sm"
          onClick={() => setSelectedTab("clubs")}
        >
          {t("dataBackup.clubs")}
        </Button>
      </div>

      {/* 玩家数据备份 */}
      {selectedTab === "players" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("dataBackup.playerData") } />
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              title={t("dataBackup.totalRecords")}
              value={playerBackupStatus.totalRecords.toLocaleString()}
              subtitle={t("dataBackup.lastBackup", { time: playerBackupStatus.lastBackup.toLocaleDateString() })}
            />
            <StatTile
              title={t("dataBackup.backupSize")}
              value={playerBackupStatus.backupSize}
              subtitle={t("dataBackup.successRate")}
            />
            <StatTile
              title={t("dataBackup.status")}
              value={playerBackupStatus.status}
              status={playerBackupStatus.status === "completed" ? "success" : "default"}
            />
          </div>
        </Panel>
      )}

      {/* 俱乐部数据备份 */}
      {selectedTab === "clubs" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("dataBackup.clubData") } />
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              title={t("dataBackup.totalRecords")}
              value={clubBackupStatus.totalRecords.toLocaleString()}
              subtitle={t("dataBackup.lastBackup", { time: clubBackupStatus.lastBackup.toLocaleDateString() })}
            />
            <StatTile
              title={t("dataBackup.backupSize")}
              value={clubBackupStatus.backupSize}
              subtitle={t("dataBackup.successRate")}
            />
            <StatTile
              title={t("dataBackup.status")}
              value={clubBackupStatus.status}
              status={clubBackupStatus.status === "completed" ? "success" : "default"}
            />
          </div>
        </Panel>
      )}

      {/* 操作按钮 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("dataBackup.actions") } />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="primary" size="lg" onClick={() => window.alert(t("dataBackup.createBackup"))}>
            {t("dataBackup.createBackupNow")}
          </Button>
          <Button variant="outline" size="lg" onClick={() => window.alert(t("dataBackup.verifyIntegrity"))}>
            {t("dataBackup.verifyIntegrity")}
          </Button>
        </div>
      </Panel>
    </Panel>
  );
}