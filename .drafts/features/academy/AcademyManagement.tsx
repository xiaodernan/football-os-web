import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AcademyManagement() {
  const { t } = useI18n();

  // 模拟青训营数据
  const academyData = useMemo(() => ({
    totalCampuses: 5,
    totalStudents: 120,
    activeCoaches: 15,
    completionRate: 78,
    graduationThisYear: 12,
    ageGroups: ["U-9", "U-11", "U-13", "U-15", "U-17"]
  }), []);

  const ageGroupCounts = useMemo(() => {
    const map: Record<string, number> = {};
    academyData.ageGroups.forEach(group => {
      map[group] = Math.floor(Math.random() * 30) + 10;
    });
    return map;
  }, []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("academy.academyManagementTitle")} />
      
      {/* 学院概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("academy.totalCampuses")}
          value={academyData.totalCampuses.toString()}
          subtitle={t("academy.campuses")}
        />
        <StatTile
          title={t("academy.totalStudents")}
          value={academyData.totalStudents.toLocaleString()}
          subtitle={t("academy.students")}
        />
        <StatTile
          title={t("academy.activeCoaches")}
          value={academyData.activeCoaches.toString()}
          subtitle={t("academy.coaches")}
        />
        <StatTile
          title={t("academy.completionRate")}
          value={`${academyData.completionRate}%`}
          subtitle={t("academy.rate")}
          variant="primary"
        />
      </div>

      {/* 年龄组分布 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("academy.ageGroups")} />
        <div className="grid grid-cols-2 gap-3">
          {academyData.ageGroups.map(group => (
            <Button
              key={group}
              variant="outline"
              size="sm"
            >
              {t(`academy.${group}`)} {ageGroupCounts[group].toLocaleString()}
            </Button>
          ))}
        </div>
      </Panel>

      {/* 关键指标 */}
      <Panel className="p-4">
        <SectionTitle title={t("academy.keyMetrics")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("academy.graduationThisYear")}
            value={academyData.graduationThisYear.toLocaleString()}
            subtitle={t("academy.graduates")}
          />
        </div>
      </Panel>
    </Panel>
  );
}