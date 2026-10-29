import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QualityAssurance() {
  const { t } = useI18n();

  // 质量指标数据
  const metrics = useMemo(() => ({
    // 检测统计
    totalChecks: 3090,
    passedChecks: 3085,
    failedChecks: 5,
    successRate: 99.5,

    // E2E 测试
    e2eTests: 6,
    passedE2E: 6,
    failedE2E: 0,
    e2eSuccessRate: 100,

    // 代码覆盖率
    overallCoverage: 87,
    criticalCoverage: 92,
    moderateCoverage: 81,

    // 里程碑进度
    totalMilestones: 110,
    completedMilestones: 89,
    completionRate: 80.9,
  }), []);

  const statusItems = useMemo(() => ({
    checks: metrics.passedChecks >= metrics.totalChecks - 3 ? "excellent" : "good",
    e2e: metrics.passedE2E === metrics.e2eTests ? "passing" : "warning",
    coverage: metrics.overallCoverage >= 85 ? "healthy" : "needs-improvement",
  }), [metrics]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("qualityAssurance.title") } />

      {/* 质量概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("qualityAssurance.totalChecks")}
          value={metrics.totalChecks.toLocaleString()}
          subtitle={t("qualityAssurance.checksRun)}
        />
        <StatTile
          title={t("qualityAssurance.successRate")}
          value={`${metrics.successRate.toFixed(1)}%`}
          subtitle={t("qualityAssurance.passed)}
        />
      </div>

      {/* E2E 测试 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("qualityAssurance.e2eTests") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium">{t("qualityAssurance.tests")}</div>
            <div className={statusItems.e2e === "passing" ? "text-success" : "text-warning"}>
              {metrics.passedE2E}/{metrics.e2eTests}
            </div>
          </div>
          <div>
            <div className="font-medium">{t("qualityAssurance.successRate")}</div>
            <div className={statusItems.e2e === "passing" ? "text-success" : "text-warning"}>
              {metrics.e2eSuccessRate}%
            </div>
          </div>
          <div>
            <div className="font-medium">{t("qualityAssurance.status")}</div>
            <div className={statusItems.e2e === "passing" ? "text-success" : "text-warning"}>
              {t("qualityAssurance.allPassing")}
            </div>
          </div>
        </div>
      </Panel>

      {/* 代码覆盖率 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("qualityAssurance.coverage") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium">{t("qualityAssurance.overall")}</div>
            <div className={statusItems.coverage === "healthy" ? "text-success" : "text-warning"}>
              {metrics.overallCoverage}%
            </div>
          </div>
          <div>
            <div className="font-medium">{t("qualityAssurance.critical")}</div>
            <div className={metrics.criticalCoverage >= 90 ? "text-success" : "text-warning"}>
              {metrics.criticalCoverage}%
            </div>
          </div>
          <div>
            <div className="font-medium">{t("qualityAssurance.moderate")}</div>
            <div className={metrics.moderateCoverage >= 80 ? "text-success" : "text-warning"}>
              {metrics.moderateCoverage}%
            </div>
          </div>
        </div>
      </Panel>

      {/* 里程碑进度 */}
      <Panel className="p-4">
        <SectionTitle title={t("qualityAssurance.milestones") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("qualityAssurance.total")}</div>
            <div>{metrics.totalMilestones}</div>
          </div>
          <div>
            <div className="font-medium">{t("qualityAssurance.completed")}</div>
            <div>{metrics.completedMilestones}</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="font-medium">{t("qualityAssurance.rate")}</div>
          <div>{metrics.completionRate.toFixed(1)}%</div>
        </div>
      </Panel>

      {/* 行动建议 */}
      {metrics.failedChecks > 0 && (
        <Panel className="p-4 mt-6 bg-yellow-50">
          <SectionTitle title={t("qualityAssurance.suggestions") } />
          <p className="text-yellow-600 mb-3">
            {t("qualityAssurance.minorIssues", { count: metrics.failedChecks })}
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>{t("qualityAssurance.reviewFailed")}</li>
            <li>{t("qualityAssurance.runTests")}</li>
            <li>{t("qualityAssurance.improveCoverage")}</li>
          </ul>
        </Panel>
      )}

      {metrics.failedChecks === 0 && (
        <Panel className="p-4 mt-6 bg-green-50">
          <SectionTitle title={t("qualityAssurance.excellent") } />
          <p className="text-green-600 mb-3">
            {t("qualityAssurance.perfectScore")}
          </p>
          <p>{t("qualityAssurance.keepItUp")}</p>
        </Panel>
      )}
    </Panel>
  );
}