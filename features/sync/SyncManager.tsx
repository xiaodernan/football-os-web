import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, EmptyState, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { syncData, getSyncStatus, markPendingChange, clearPendingChanges, STORAGE_KEYS } from "@/domain/sync";

export function SyncManager() {
  const { t } = useI18n();
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [status] = useMemo(() => getSyncStatus(), []);

  const handleSyncType = async (type: string) => {
    setIsSyncing(true);
    try {
      // 模拟同步数据
      const result = await syncData(type, {} as any);
      if (result.success) {
        markPendingChange(type);
      }
      return result;
    } catch (error) {
      return { success: false, message: t("sync.errorOccurred") };
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearStatus = () => {
    clearPendingChanges();
  };

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <SectionTitle title={t("sync.syncManagerTitle")} />
        
        {/* 同步状态 */}
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("sync.status")} />
          <div className="grid grid-cols-2 gap-4">
            <StatTile
              title={t("sync.lastSync")}
              value={status.lastSync ? new Date(status.lastSync).toLocaleString() : t("sync.never")}
              subtitle={t("sync.lastSyncSub")}
            />
            <StatTile
              title={t("sync.pendingChanges")}
              value={status.pendingChanges.toString()}
              subtitle={t("sync.pendingChangesSub")}
              variant={status.pendingChanges > 0 ? "destructive" : "default"}
            />
            <StatTile
              title={t("sync.conflictCount")}
              value={status.conflictCount.toString()}
              subtitle={t("sync.conflictCountSub")}
              variant={status.conflictCount > 0 ? "destructive" : "default"}
            />
          </div>
        </Panel>

        {/* 同步操作 */}
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("sync.syncNow")} />
          <div className="grid grid-cols-2 gap-3">
            {["profile", "watchlist", "goals", "history", "achievements", "community"].map(type => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => handleSyncType(type)}
                disabled={isSyncing}
              >
                {t(`sync.${type}`)}
              </Button>
            ))}
          </div>
          {isSyncing && (
            <p className="mt-2 text-sm text-primary">
              {t("sync.syncing")}
            </p>
          )}
        </Panel>

        {/* 清除状态 */}
        {status.pendingChanges > 0 && (
          <Panel className="p-4">
            <SectionTitle title={t("sync.clearStatus")} />
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearStatus}
            >
              {t("sync.clear")}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("sync.clearDesc", { count: status.pendingChanges })}
            </p>
          </Panel>
        )}
      </Panel>
    </div>
  );
}