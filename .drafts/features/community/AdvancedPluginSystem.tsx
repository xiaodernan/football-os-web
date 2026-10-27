import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdvancedPluginSystem() {
  const { t } = useI18n();

  // 模拟进阶插件数据
  const plugins = useMemo(() => [
    { id: "plugin-1", name: t("plugin.advancedAnalysis"), description: t("plugin.advancedAnalysisDesc"), category: t("plugin.analysis"), active: true, rating: 4.5, downloads: 1250 },
    { id: "plugin-2", name: t("plugin.tacticalAnalysis"), description: t("plugin.tacticalAnalysisDesc"), category: t("plugin.tactical"), active: false, rating: 4.2, downloads: 980 },
    { id: "plugin-3", name: t("player.statTracking"), description: t("player.statTrackingDesc"), category: t("player.stats"), active: true, rating: 4.7, downloads: 2100 },
    { id: "plugin-4", name: t("community.integration"), description: t("community.integrationDesc"), category: t("community"), active: true, rating: 4.8, downloads: 3200 },
  ], []);

  const activePlugins = useMemo(() => plugins.filter(p => p.active), []);
  const totalDownloads = useMemo(() => plugins.reduce((sum, p) => sum + p.downloads, 0), []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("plugin.advancedSystemTitle")} />
      
      {/* 插件统计 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("plugin.totalPlugins")}
          value={plugins.length.toString()}
          subtitle={t("plugin.totalCount")}
        />
        <StatTile
          title={t("plugin.activePlugins")}
          value={activePlugins.length.toString()}
          subtitle={t("plugin.activeCount")}
          variant="primary"
        />
        <StatTile
          title={t("plugin.totalDownloads")}
          value={totalDownloads.toLocaleString()}
          subtitle={t("plugin.totalDownloads")}
        />
      </div>

      {/* 插件列表 */}
      <Panel className="p-4">
        <SectionTitle title={t("plugin.installedPlugins")} />
        <div className="space-y-3">
          {activePlugins.map(plugin => (
            <div
              key={plugin.id}
              className="border rounded p-3 flex items-start {plugin.active ? 'bg-green-50' : 'bg-red-50'}"
            >
              <div className="flex-1">
                <div className="font-medium">{plugin.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{plugin.description}</div>
              </div>
              <div className="ml-3 text-right">
                <div className="text-primary">{plugin.rating}⭐</div>
                <div className="text-xs text-muted-foreground">{plugin.downloads} {t("plugin.downloads")}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 所有插件 */}
      <Panel className="p-4">
        <SectionTitle title={t("plugin.availablePlugins")} />
        <div className="grid grid-cols-2 gap-3">
          {plugins.map(plugin => (
            <div
              key={plugin.id}
              className="border rounded p-2 cursor-pointer hover:bg-primary/5 transition-colors {plugin.active ? 'bg-primary/20 text-primary' : ''}"
              onClick={() => /* toggle plugin */}
            >
              <div>{t(`plugin.${plugin.id}`)}</div>
              <div className="text-xs text-muted-foreground">{plugin.description}</div>
            </div>
          ))}
        </div>
      </Panel>
    </Panel>
  );
}