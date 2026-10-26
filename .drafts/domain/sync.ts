export interface SyncStatus {
  isSyncing: boolean;
  lastSync: string | null;
  pendingChanges: number;
  conflictCount: number;
}

export interface SyncableData {
  type: "profile" | "watchlist" | "goals" | "history" | "achievements" | "community";
  version: number;
  data: any;
}

// 本地存储键
export const STORAGE_KEYS = {
  PROFILE: "sync:profile",
  WATCHLIST: "sync:watchlist",
  GOALS: "sync:goals",
  HISTORY: "sync:history",
  ACHIEVEMENTS: "sync:achievements",
  COMMUNITY: "sync:community",
  METADATA: "sync:metadata",
};

// 检查同步状态
export function getSyncStatus(): SyncStatus {
  try {
    const metadata = window.localStorage.getItem(STORAGE_KEYS.METADATA);
    if (metadata) {
      return JSON.parse(metadata);
    }
  } catch {
    // 静默失败，返回默认状态
  }
  return {
    isSyncing: false,
    lastSync: null,
    pendingChanges: 0,
    conflictCount: 0
  };
}

// 标记有待同步的变更
export function markPendingChange(changeType: string): void {
  try {
    const status = getSyncStatus();
    status.pendingChanges++;
    window.localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(status));
  } catch {
    // 静默失败
  }
}

// 清除 pending changes
export function clearPendingChanges(): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify({
      isSyncing: false,
      lastSync: new Date().toISOString(),
      pendingChanges: 0,
      conflictCount: 0
    }));
  } catch {
    // 静默失败
  }
}

// 执行数据同步
export async function syncData(type: SyncableData["type"], data: SyncableData["data"]): Promise<{ success: boolean; message: string }> {
  markPendingChange(type);

  try {
    // 这里 would typically call a sync endpoint
    // 对于演示，我们模拟同步成功
    const status = getSyncStatus();
    status.isSyncing = true;
    status.pendingChanges = Math.max(0, status.pendingChanges - 1);
    status.lastSync = new Date().toISOString();
    window.localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(status));

    return {
      success: true,
      message: t ? t("sync.success") : "Sync successful"
    };
  } catch (error) {
    const status = getSyncStatus();
    status.conflictCount++;
    window.localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(status));

    return {
      success: false,
      message: t ? t("sync.failed") : "Sync failed"
    };
  }
}

// 模拟 i18n 导入（实际项目中会 import t from "@/i18n")
const t = (key: string) => key;