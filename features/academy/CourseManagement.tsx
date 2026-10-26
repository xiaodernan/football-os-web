import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CourseManagement() {
  const { t } = useI18n();

  // 模拟课程数据
  const courses = useMemo(() => [
    { id: "course-1", name: t("course.basicTraining"), duration: "8 weeks", students: 25, progress: 85 },
    { id: "course-2", name: t("course.goalkeeping"), duration: "6 weeks", students: 12, progress: 92 },
    { id: "course-3", name: t("course.defensive"), duration: "10 weeks", students: 30, progress: 67 },
    { id: "course-4", name: t("course.playmaking"), duration: "8 weeks", students: 18, progress: 75 },
    { id: "course-5", name: t("course.finishing"), duration: "4 weeks", students: 22, progress: 58 },
  ], []);

  const totalStudents = useMemo(() => courses.reduce((sum, c) => sum + c.students, 0), []);
  const avgProgress = useMemo(() => Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / courses.length), []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("academy.courseManagementTitle")} />
      
      {/* 课程概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("academy.totalCourses")}
          value=courses.length.toString()
          subtitle={t("academy.courses")}
        />
        <StatTile
          title={t("academy.totalStudents")}
          value=totalStudents.toLocaleString()
          subtitle={t("academy.students")}
        />
        <StatTile
          title={t("academy.avgProgress")}
          value=`${avgProgress}%`
          subtitle={t("academy.progress")}
          variant="primary"
        />
      </div>

      {/* 课程列表 */}
      <Panel className="p-4">
        <SectionTitle title={t("academy.courseList")} />
        <div className="space-y-3">
          {courses.map(course => (
            <div
              key=course.id
              className="border rounded p-3 flex items-start"
            >
              <div className="flex-1">
                <div className="font-medium">{course.name}</div>
                <div className="text-xs text-muted-foreground">{course.duration}</div>
              </div>
              <div className="ml-3 text-right">
                <div className="text-primary font-medium">{course.progress}%</div>
                <div className="text-xs text-muted-foreground">进度</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </Panel>
  );
}