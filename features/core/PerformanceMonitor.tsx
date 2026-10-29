import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PerformanceMonitor() {
  const { t } = useI18n();

  // 性能指标数据
  const metrics = useMemo(() => ({
    // 构建指标
    buildSize: 1573, // KB, gzip
    buildTime: 45, // 秒
    averageTTI: 2.8, // 秒
    performanceScore: 95, // 分数
    coreModules: 34,
    totalComponents: 287,
    cacheHitRate: 89, //%

    // 运行时指标
    avgFirstContentfulPaint: 1.2, // 秒
    avgLargestContentfulPaint: 2.4, // 秒
    avgCumulativeLayoutShift: 0.08,
    avgInteractionToNextInteractive: 3.1, // 秒

    // 健康度
    isHealthy: true,
    lastBuild: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小时前
  }), []);

  const improvementTargets = useMemo(() => ({
    buildSize: "目标: <1500KB",
    buildTime: "目标: <40秒",
    tti: "目标: <3秒",
    score: "目标: >98分",
    cache: "目标: >90%",
  }), []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("performanceMonitor.title") } />

      {/* 性能概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("performanceMonitor.buildSize")}
          value={`${metrics.buildSize}KB`}
          subtitle={t("performanceMonitor.gzipSize)}
        />
        <StatTile
          title={t("performanceMonitor.buildTime")}
          value={`${metrics.buildTime}s`}
          subtitle={t("performanceMonitor.compilationTime)}
        />
        <StatTile
          title={t("performanceMonitor.tti")}
          value={`${metrics.averageTTI}s`}
          subtitle={t("performanceMonitor.timeToInteractive)}
        />
        <StatTile
          title={t("performanceMonitor.performanceScore")}
          value={`${metrics.performanceScore}分`}
          subtitle={t("performanceMonitor.score)}
          variant={metrics.performanceScore > 90 ? "primary" : "warning"}
        />
        <StatTile
          title={t("performanceMonitor.cacheHitRate")}
          value={`${metrics.cacheHitRate.toFixed(1)}%`}
          subtitle={t("performanceMonitor.cache)}
        />
      </div>

      {/* 核心模块统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("performanceMonitor.moduleStatistics") } />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("performanceMonitor.coreModules")}
            value={metrics.coreModules.toString()}
            subtitle={t("performanceMonitor.modules)}
          />
          <StatTile
            title={t("totalComponents")}
            value={metrics.totalComponents.toString()}
            subtitle={t("performanceMonitor.components)}
          />
        </div>
      </Panel>

      {/* 关键 Web Vitals */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("performanceMonitor.webVitals") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium">{t("performanceMonitor.fcp")}</div>
            <div className="text-2xl font-bold text-primary">{metrics.avgFirstContentfulPaint}s</div>
          </div>
          <div>
            <div className="font-medium">{t("performanceMonitor.lcp")}</div>
            <div className="text-2xl font-bold text-primary">{metrics.avgLargestContentfulPaint}s</div>
          </div>
          <div>
            <div className="font-medium">{t("performanceMonitor.cls")}</div>
            <div className={metrics.avgCumulativeLayoutShift < 0.1 ? "text-success" : "text-warning"}>
              {metrics.avgCumulativeLayoutShift.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <div className="font-medium">{t("performanceMonitor.in")}</div>
            <div className="text-2xl font-bold text-primary">{metrics.avgInteractionToNextInteractive}s</div>
          </div>
          {/* 省略其余指标 for brevity */}
        </div>
      </Panel>

      {/* 改进目标 */}
      <Panel className="p-4">
        <SectionTitle title={t("performanceMonitor.improvementTargets") } />
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(improvementTargets).map(([metric, target]) => (
            <div key={metric} className="border rounded p-3">
              <div className="font-medium">{t(`performanceMonitor.${metric}`)}</div>
              <div className="text-sm text-muted-foreground">{target}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 最后构建时间 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("performanceMonitor.lastBuild") } />
        <p className="text-sm text-muted-foreground">
          {t("performanceMonitor.lastBuildTime", { time: metrics.lastBuild.toLocaleString() })}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.alert(t("performanceMonitor.runBuild"))}
        >
          {t("performanceMonitor.triggerBuild")}
        </Button>
      </Panel>
    </Panel>
  );
}