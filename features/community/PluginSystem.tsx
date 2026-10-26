import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, EmptyState, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PluginSystem() {
  const { t } = useI18n();

  const availablePlugins = useMemo(() => [
    { id: "form-analysis", name: t("plugin.formAnalysis"), description: t("plugin.formAnalysisDesc"), category: t("plugin.analysis") },
    { id: "performance-tracking", name: t("plugin.performanceTracking"), description: t("plugin.performanceTrackingDesc"), category: t("plugin.performance") },
    { id: "scouting-export", name: t("plugin.scoutingExport"), description: t("plugin.scoutingExportDesc"), category: t("plugin.scouting") },
    { id: "tactical-insights", name: t("plugin.tacticalInsights"), description: t("plugin.tacticalInsightsDesc"), category: t("plugin.tactical") },
  ], []);

  const [enabledPlugins, setEnabledPlugins] = React.useState<string[]>([]);

  const handleTogglePlugin = (pluginId: string) => {
    setEnabledPlugins(prev => {
      if (prev.includes(pluginId)) return prev.filter(id => id !== pluginId);
      return [...prev, pluginId];
    });
  };

  const isPluginEnabled = (pluginId: string) => enabledPlugins.includes(pluginId);

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <SectionTitle title={t("plugin.systemTitle")} />
        
        <p className="text-muted-foreground mb-4">
          {t("plugin.systemDescription")}
        </p>

        {/* 已启用的插件 */}
        {enabledPlugins.length > 0 && (
          <Panel className="p-4 mb-6">
            <SectionTitle title={t("plugin.enabledPlugins")} />
            <div className="grid grid-cols-2 gap-2">
              {enabledPlugins.map(pluginId => {
                const plugin = availablePlugins.find(p => p.id === pluginId);
                if (!plugin) return null;
                return (
                  <div
                    key={pluginId}
                    className="border rounded p-2 {isPluginEnabled(pluginId) ? 'bg-primary/10 text-primary' : 'bg-muted/20'}"
                  >
                    <div className="font-medium">{plugin.name}</div>
                    <div className="text-xs text-muted-foreground">{plugin.description}</div>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {/* 插件列表 */}
        <Panel className="p-5">
          <SectionTitle title={t("plugin.availablePlugins")} />
          <div className="grid grid-cols-2 gap-3">
            {availablePlugins.map(plugin => (
              <div
                key={plugin.id}
                className="border rounded p-3 cursor-pointer hover:bg-primary/5 transition-colors {isPluginEnabled(plugin.id) ? 'bg-primary/20 text-primary' : ''}"
                onClick={() => handleTogglePlugin(plugin.id)}
              >
                <div className="font-medium">{plugin.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{plugin.description}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* 操作按钮 */}
        <div className="mt-6 pt-6 border-t">
          <Button
            variant="primary"
            disabled={enabledPlugins.length === 0}
            className="w-full"
          >
            {t("plugin.activateSelected")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEnabledPlugins([])}
          >
            {t("plugin.clearAll")}
          </Button>
        </div>
      </Panel>
    </div>
  );
}