import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AcademyOverview() {
  const { t } = useI18n();

  // 模拟青训学院数据
  const academyData = useMemo(() => ({
    totalGraduates: 47,
    currentStudents: 23,
    graduationRate: 85,
    yearsInOperation: 5,
    alumniInFirstTeam: 12,
    popularCourses: ["goalkeeping", "defensive fundamentals", "playmaking", "finishing"]
  }), []);

  const courseProgress = useMemo(() => ({
    goalkeeping: 92,
    defensive: 78,
    playmaking: 85,
    finishing: 67
  }), []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("academy.academyOverviewTitle")} />
      
      {/* 学院概览统计 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("academy.totalGraduates")}
          value={academyData.totalGraduates.toLocaleString()}
          subtitle={t("academy.graduates")}
        />
        <StatTile
          title={t("academy.currentStudents")}
          value=academyData.currentStudents.toLocaleString()
          subtitle={t("academy.currentStudents")}
        />
        <StatTile
          title={t("academy.graduationRate")}
          value=`${academyData.graduationRate}%`
          subtitle={t("academy.rate")}
          variant="primary"
        />
        <StatTile
          title={t("academy.yearsInOperation")}
          value=`${academyData.yearsInOperation}`
          subtitle={t("academy.years")}
        />
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatTile
          title={t("academy.alumniInFirstTeam")}
          value={academyData.alumniInFirstTeam.toLocaleString()}
          subtitle={t("academy.firstTeamPlayers")}
        />
        <StatTile
          title={t("academy.courseCompletion")}
          value=`${Math.round((courseProgress.goalkeeping + courseProgress.defensive + courseProgress.playmaking + courseProgress.finishing) / 4)}%`
          subtitle={t("academy.avgCourseCompletion")}
        />
      </div>

      {/* 热门课程 */}
      <Panel className="p-4">
        <SectionTitle title={t("academy.popularCourses")} />
        <div className="grid grid-cols-2 gap-3">
          {academyData.popularCourses.map(course => (
            <Button
              key={course}
              variant="outline"
              size="sm"
            >
              {t(`academy.${course}`)}
            </Button>
          ))}
        </div>
      </Panel>
    </Panel>
  );
}