import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TeamDataExport() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      finalPosition: Math.floor(Math.random() * 20) + 1,
      played: 38,
      won: Math.floor(Math.random() * 20) + 10,
      drawn: Math.floor(Math.random() * 10) + 8,
      lost: 38 - (Math.floor(Math.random() * 20) + 10) - Math.floor(Math.random() * 10) - 8,
      goalsFor: Math.floor(Math.random() * 60) + 30,
      goalsAgainst: Math.floor(Math.random() * 50) + 20,
      points: 0,
      cleanSheets: Math.floor(Math.random() * 20) + 8,
    }));
  }, [clubs]);

  // 计算积分
  clubData.forEach(c => {
    c.points = c.won * 3 + c.drawn;
  });

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!selectedClub) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("teamDataExport.title") } />
        <p className="text-muted-foreground mb-4">
          {t("teamDataExport.selectClub")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {clubs.map(c => (
            <Button
              key={c.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectClub(c.id)}
            >
              {c.name}
            </Button>
          ))
        </div>
      </Panel>
    );
  }

  const c = clubData.find(club => club.id === selectedClub)!;
  c.points = c.won * 3 + c.drawn;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("teamDataExport.title") } />

      {/* 球队画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("teamDataExport.clubInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("teamDataExport.name")}</div>
              <div className="text-2xl font-bold text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("teamDataExport.finalPosition")}</div>
              <div className={c.finalPosition <= 3 ? "text-primary" : c.finalPosition <= 6 ? "text-warning" : "text-danger"}>
                {t(`position.${c.finalPosition}`)}
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("teamDataExport.seasonStats") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("teamDataExport.played")}</div>
              <div className="text-2xl text-primary">{c.played}场</div>
            </div>
            <div>
              <div className="font-medium">{t("teamDataExport.points")}</div>
              <div className="text-success">{c.points}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <div className="font-medium">{t("teamDataExport.won")}</div>
              <div className="text-primary">{c.won}</div>
            </div>
            <div>
              <div className="font-medium">{t("teamDataExport.lost")}</div>
              <div className="text-danger">{c.lost}</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 导出选项 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("teamDataExport.exportOptions") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("teamDataExport.exportTeamData")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="sm" onClick={() => window.alert(t("teamDataExport.exportJson"))}>
            {t("teamDataExport.jsonFormat")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.alert(t("teamDataExport.exportCsv"))}>
            {t("teamDataExport.csvFormat")}
          </Button>
        </div>
      </Panel>

      {/* 导出预览 */}
      <Panel className="p-4">
        <SectionTitle title={t("teamDataExport.exportPreview") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("teamDataExport.exporting", { club: c.name })}
        </p>
        <div className="bg-gray-100 p-4 rounded">
          <p className="text-xs text-muted-foreground">数据摘要将包括：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{t("teamDataExport.finalPosition")}: {t(`position.${c.finalPosition}`)}</li>
            <li>{t("teamDataExport.played")}: {c.played}场</li>
            <li>{t("teamDataExport.won")}: {c.won}胜</li>
            <li>{t("teamDataExport.lost")}: {c.lost}负</li>
            <li>{t("teamDataExport.points")}: {c.points}分</li>
            <li>{t("teamDataExport.goalDifference")}: {c.goalsFor - c.goalsAgainst}</li>
            <li>{t("teamDataexport.cleanSheets")}: {c.cleanSheets}场零封</li>
          </ul>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => window.alert(t("teamDataExport.exportCompleted"))}
        >
          {t("teamDataExport.exportNow")}
        </Button>
      </Panel>
    </Panel>
  );
}