import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdvancedAcademyManagement() {
  const { t } = useI18n();

  // 模拟进阶青训营数据
  const academyData = useMemo(() => ({
    totalCampuses: 8,
    totalStudents: 200,
    activeCoaches: 25,
    graduationRate: 88,
    scholarshipStudents: 35,
    alumniInProfessionalTeams: 28,
    ageGroups: ["U-9", "U-11", "U-13", "U-15", "U-17", "U-19"],
  }), []);

  const ageGroupCounts = useMemo(() => {
    const map: Record<string, number> = {};
    academyData.ageGroups.forEach(group => {
      map[group] = Math.floor(Math.random() * 40) + 15;
    });
    return map;
  }, []);

  const courseProgress = useMemo(() => ({
    technical: 82,
    tactical: 71,
    physical: 78,
    psychological: 65,
  }), []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("academy.advancedAcademyTitle")} />
      
      {/* 学院概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("academy.totalCampuses")}
          value=academyData.totalCampuses.toString()
          subtitle={t("academy.campuses")}
        />
        <StatTile
          title={t("academy.totalStudents")}
          value=academyData.totalStudents.toLocaleString()
          subtitle={t("academy.students")}
        />
        <StatTile
          title={t("academy.graduationRate")}
          value=`${academyData.graduationRate}%`
          subtitle={t("academy.rate")}
          variant="primary"
        />
        <StatTile
          title={t("academy.scholarshipStudents")}
          value=academyData.scholarshipStudents.toString()
          subtitle={t("academy.scholarships")}
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
          ))
        </div>
      </Panel>

      {/* 课程进度 */}
      <Panel className="p-4">
        <SectionTitle title={t("academy.courseProgress")} />
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(courseProgress).map(([course, progress]) => (
            <div
              key={course}
              className="border rounded p-3"
            >
              <div className="font-medium">{t(`academy.${course}`)}</div>
              <div className="text-primary text-xl mt-1">{progress}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary rounded-full h-2 rounded-full" style={{ width: progress + '%' }}></div>
                </div>
              </div>
            </div>
          ))
        </div>
      </Panel>
    </Panel>
  );
}