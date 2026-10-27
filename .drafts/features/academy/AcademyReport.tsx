import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function AcademyReport() {
  const { t } = useI18n();
  const campuses = useMemo(() => footballProvider.campuses(), []);

  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);

  const campusData = useMemo(() => {
    return campuses.map(c => ({
      id: c.id,
      name: c.name,
      location: c.location,
      students: c.students,
      coaches: c.coaches,
      graduationRate: c.graduationRate,
      scholarshipRate: c.scholarshipRate,
    }));
  }, [campuses]);

  const handleSelectCampus = (campusId: string) => {
    setSelectedCampus(campusId);
  };

  if (!selectedCampus) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("academy.academyReportTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("academy.selectCampusForReport")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {campusData.slice(0, 6).map(c => (
            <Button
              key={c.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectCampus(c.id)}
            >
              {c.name}
            </Button>
          ))
        </div>
      </Panel>
    );
  }

  const c = campusData.find(pl => pl.id === selectedCampus)!;

  // 进阶报告数据
  const studentStats = useMemo(() => ({
    totalStudents: c.students,
    totalCoaches: c.coaches,
    graduationRate: c.graduationRate,
    scholarshipStudents: Math.floor(c.students * (c.scholarshipRate || 0.1)),
    averageAge: Math.floor(18 + Math.random() * 3),
  }), [c]);

  // 年龄分布
  const ageDistribution = useMemo(() => ({
    under18: Math.floor(c.students * 0.4),
    age18_20: Math.floor(c.students * 0.35),
    age21_23: Math.floor(c.students * 0.2),
    over23: Math.floor(c.students * 0.05),
  }), [c]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("academy.academyReportTitle")} />

      {/* 院系概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("academy.totalStudents")}
          value=studentStats.totalStudents.toLocaleString()
          subtitle={t("academy.students)}
        />
        <StatTile
          title={t("academy.totalCoaches")}
          value=studentStats.totalCoaches.toString()
          subtitle={t("academy.coaches)}
        />
        <StatTile
          title={t("academy.graduationRate")}
          value=`${studentStats.graduationRate}%`
          subtitle={t("academy.rate)}
          variant="primary"
        />
        <StatTile
          title={t("academy.scholarshipStudents")}
          value=studentStats.scholarshipStudents.toLocaleString()
          subtitle={t("academy.scholarships)}
        />
      </div>

      {/* 年龄分布 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("academy.ageDistribution")} />
        <div className="grid grid-cols-2 gap-3">
          <div className="border rounded p-3 text-center">
            <div className="font-medium text-primary">18岁以下</div>
            <div className="text-3xl font-bold text-primary">{ageDistribution.under18}</div>
            <div className="text-sm text-muted-foreground">40%</div>
          </div>
          <div className="border rounded p-3 text-center">
            <div className="font-medium">18-20岁</div>
            <div className="text-3xl font-bold">{ageDistribution.age18_20}</div>
            <div className="text-sm text-muted-foreground">35%</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="border rounded p-3 text-center">
            <div className="font-medium text-green-500">21-23岁</div>
            <div className="text-3xl font-bold text-green-500">{ageDistribution.age21_23}</div>
            <div className="text-sm text-green-500 mt-1">20%</div>
          </div>
          <div className="border rounded p-3 text-center">
            <div className="font-medium text-gray-500">24岁以上</div>
            <div className="text-3xl font-bold text-gray-500">{ageDistribution.over23}</div>
            <div className="text-sm text-gray-500 mt-1">5%</div>
          </div>
        </div>
      </Panel>

      {/* 学者名单 */}
      {studentStats.scholarshipStudents > 0 && (
        <Panel className="p-4">
          <SectionTitle title={t("academy.scholarshipStudents")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("academy.scholarshipCount", { count: studentStats.scholarshipStudents })}
          </p>
          <Button variant="outline" size="sm">
            {t("academy.viewDetails")}
          </Button>
        </Panel>
      )}
    </Panel>
  );
}