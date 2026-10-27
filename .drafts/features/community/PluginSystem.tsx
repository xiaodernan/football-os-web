import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PluginSystem() {
  const { t } = useI18n();

  // 模拟插件数据
  const plugins = useMemo(() => ([
    { id: "1", name: "统计增强", description: "高级数据统计图表", active: true, category: "analysis" },
    { id: "2", name: "转会助手", description: "转会市场分析工具", active: false, category: "transfer" },
    { id: "3", name: "战术分析", description: "阵型与轨迹分析", active: true, category: "tactical" },
    { id: "4", name: "伤病报告", description: "球员伤病跟踪报告", active: false, category: "injury" },
    { id: "5", name: "青训监控", description: "青训营进度监控", active: true, category: "academy" },
  ] as const));

  const activePlugins = useMemo(() => plugins.filter(p => p.active), [plugins]);
  const pluginCategories = useMemo(() => {
    const map: Record<string, number> = {};
    plugins.forEach(p => {
      map[p.category] = (map[p.category] || 0) + 1;
    });
    return map;
  }, [plugins]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("community.pluginSystemTitle")} />

      {/* 插件概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("community.totalPlugins")}
          value={plugins.length.toString()}
          subtitle={t("community.totalPluginsDesc")}
        />
        <StatTile
          title={t("community.activePlugins")}
          value={activePlugins.length.toString()}
          subtitle={t("community.activePluginsDesc")}
        />
      </div>

      {/* 插件列表 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("community.availablePlugins")} />
        <div className="space-y-2">
          {plugins.map(p => (
            <div
              key={p.id}
              className={`border rounded p-3 flex items-start ${
                p.active ? "bg-green-50" : "bg-gray-50"
              }`}
            >
              <div className="flex-1">
                <div className="font-medium">{t(`plugin.${p.name}`)}</div>
                <div className="text-xs text-muted-foreground">{t(`plugin.${p.description}`)}</div>
              </div>
              <span className={`ml-3 text-xs ${
                p.active ? "text-green-600" : "text-gray-500"
              }`}>
                {t(p.active ? "community.active" : "community.inactive")}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      {/* 分类统计 */}
      <Panel className="p-4">
        <SectionTitle title={t("community.pluginCategories")} />
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(pluginCategories).map(([category, count]) => (
            <div
              key={category}
              className="border rounded p-2"
            >
              <div className="font-medium">{t(`category.${category}`)}</div>
              <div className="text-sm text-muted-foreground">
                {t("community.pluginCount", { count })}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 操作按钮 */}
      <Panel className="p-4">
        <SectionTitle title={t("community.pluginActions")} />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="sm">
            {t("community.managePlugins")}
          </Button>
          <Button variant="primary" size="sm">
            {t("community.reloadPlugins")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {t("community.pluginTip")}
        </p>
      </Panel>
    </Panel>
  );
}