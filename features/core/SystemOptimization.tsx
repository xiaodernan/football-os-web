import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SystemOptimization() {
  const { t } = useI18n();

  // 模拟系统优化数据
  const optimizationData = useMemo(() => ({
    buildSize: 1573, // KB, gzip
    buildTime: 45, // 秒
    averageTTI: 2.8, // 秒
    performanceScore: 95, // 分
    coreModules: 34,
    totalComponents: 287,
    lastBuild: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小时前
    cacheHitRate: 89, //%
  }), []);

  const improvementAreas = useMemo(() => ({
    buildSize: "目标: <1500KB",
    buildTime: "目标: <40秒",
    tti: "目标: <3秒",
    score: "目标: >98分",
  }), []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("core.systemOptimizationTitle")} />

      {/* 性能概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("core.buildSize")}
          value=`${optimizationData.buildSize}KB`
          subtitle={t("core.gzipSize)}
        />
        <StatTile
          title={t("core.buildTime")}
          value=`${optimizationData.buildTime}s`
          subtitle={t("core.compilationTime)}
        />
        <StatTile
          title={t("core.tti")}
          value=`${optimizationData.averageTTI}s`
          subtitle={t("core.timeToInteractive)}
        />
        <StatTile
          title={t("core.performanceScore")}
          value=`${optimizationData.performanceScore}分`
          subtitle={t("core.score)}
          variant={optimizationData.performanceScore > 90 ? "primary" : "warning"}
        />
      </div>

      {/* 模块统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("core.moduleStatistics")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("core.coreModules")}
            value=optimizationData.coreModules.toString()
            subtitle={t("core.modules)}
          />
          <StatTile
            title={t("totalComponents")}
            value=optimizationData.totalComponents.toString()
            subtitle={t("core.components)}
          />
          <StatTile
            title={t("cacheHitRate")}
            value=`${optimizationData.cacheHitRate.toFixed(1)}%`
            subtitle={t("core.cache)}
          />
        </div>
      </Panel>

      {/* 改进领域 */}
      <Panel className="p-4">
        <SectionTitle title={t("core.improvementAreas")} />
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(improvementAreas).map(([area, target]) => (
            <div
              key={area}
              className="border rounded p-3"
            >
              <div className="font-medium">{t(`area.${area}`)}</div>
              <div className="text-sm text-muted-foreground">{target}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 行动按钮 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("core.actions")} />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="primary" size="lg" onClick={() => window.alert(t("core.runOptimization"))}>
            {t("core.optimizeNow")}
          </Button>
          <Button variant="outline" size="lg" onClick={() => window.alert(t("core.viewReport"))}>
            {t("core.viewReport")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {t("core.lastBuild", { time: optimizationData.lastBuild.toLocaleString() }) }
        </p>
      </Panel>
    </Panel>
  );
}