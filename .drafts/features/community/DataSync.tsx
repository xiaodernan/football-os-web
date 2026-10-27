import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DataSync() {
  const { t } = useI18n();

  // 模拟同步状态
  const syncStatus = useMemo(() => ({
    lastSync: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    isSyncing: false,
    successRate: 98.5,
    totalSyncedItems: 12450,
    lastError: null,
  }), []);

  const syncableItems = useMemo(() => ({
    playerData: true,
    teamData: true,
    tacticalData: false,
    communityData: true,
  }), []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("community.dataSyncTitle")} />

      {/* 同步概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("community.lastSync")}
          value={syncStatus.lastSync.toLocaleString()}
          subtitle={t("community.lastSyncTime")}
        />
        <StatTile
          title={t("community.successRate")}
          value={`${syncStatus.successRate.toFixed(1)}%`}
          subtitle={t("community.successRateDesc")}
        />
        <StatTile
          title={t("community.totalSyncedItems")}
          value={syncedCount.toLocaleString()}
          subtitle={t("community.totalItemsSynced")}
        />
        <StatTile
          title={t("community.isSyncing")}
          value={syncStatus.isSyncing ? t("community.syncing") : t("community.idle")}
          subtitle={t("community.syncStatus")}
          variant={syncStatus.isSyncing ? "destructive" : "primary}
        />
      </div>

      {/* 可同步数据类型 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("community.syncableDataTypes")} />
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(syncableItems).map(([type, available]) => (
            <div
              key={type}
              className={`border rounded p-3 ${
                available ? "bg-green-50" : "bg-red-50"
              }`}
            >
              <div className="font-medium">{t(`community.${type}`)}</div>
              <div className={`text-sm ${available ? "text-green-600" : "text-red-600"}`}>
                {t(available ? "community.available" : "community.unavailable")}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 同步操作 */}
      <Panel className="p-4">
        <SectionTitle title={t("community.syncActions")} />
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(syncableItems).map(([type, available]) => (
            <Button
              key={type}
              variant={available ? "outline" : "default"}
              size="sm"
              onClick={() => {
                if (available) {
                  // Trigger sync for this type
                  window.alert(t("community.syncing", { type }));
                }
              }}
            >
              {t(available ? "community.syncNow" : "community.syncDisabled")}
            </Button>
          ))}
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            // Force full sync
            window.alert(t("community.forceSyncConfirm"));
          }}
        >
          {t("community.forceFullSync")}
        </Button>
      </Panel>
    </Panel>
  );
}