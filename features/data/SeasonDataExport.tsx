import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonDataExport() {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();

  // 模拟赛季数据
  const leagues = useMemo(() => ([
    { id: "1", name: "英超", country: "England", matches: 380, goals: 1056 },
    { id: "2", name: "西甲", country: "Spain", matches: 380, goals: 1023 },
    { id: "3", name: "德甲", country: "Germany", matches: 306, goals: 850 },
    { id: "4", name: "意甲", country: "Italy", matches: 380, goals: 890 },
    { id: "5", name: "法甲", country: "France", matches: 380, goals: 910 },
  ] as const));

  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonDataExport.title") } />

      {/* 联赛选择 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonDataExport.selectLeague") } />
        <p className="text-muted-foreground mb-3">
          {t("seasonDataExport.selectLeagueToExport")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {leagues.map(league => (
            <Button
              key={league.id}
              variant={selectedLeague === league.id ? "primary" : "outline"}
              size="sm"
              onClick={() => setSelectedLeague(league.id)}
            >
              {league.name} ({league.country})
            </Button>
          ))
        </div>
      </Panel>

      {/* 俱乐部选择 */}
      {selectedLeague && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonDataExport.selectClub") } />
          <p className="text-muted-foreground mb-3">
            {t("seasonDataExport.selectClubToExport", { league: leagues.find(l => l.id === selectedLeague)?.name })}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {clubs.map(club => (
              <Button
                key={club.id}
                variant={selectedClub === club.id ? "primary" : "outline"}
                size="sm"
                onClick={() => setSelectedClub(club.id)}
              >
                {club.name}
              </Button>
            ))
          </div>
        </Panel>
      )}

      {/* 导出选项 */}
      {selectedLeague && !selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonDataExport.exportOptions") } />
          <p className="text-sm text-muted-foreground mb-3">
            {t("seasonDataExport.exportLeagueData")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="sm" onClick={() => window.alert(t("seasonDataExport.exportJson"))}>
              {t("seasonDataExport.jsonFormat")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.alert(t("seasonDataExport.exportCsv"))}>
              {t("seasonDataExport.csvFormat")}
            </Button>
          </div>
        </Panel>
      )}

      {/* 导出预览 */}
      {selectedLeague && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonDataExport.exportPreview") } />
          <p className="text-sm text-muted-foreground mb-3">
            {t("seasonDataExport.exporting", { league: leagues.find(l => l.id === selectedLeague)?.name, club: clubs.find(c => c.id === selectedClub)?.name })}
          </p>
          <div className="bg-gray-100 p-4 rounded">
            <p className="text-xs text-muted-foreground">数据摘要将包括：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t("seasonDataExport.matchResults")}</li>
              <li>{t("seasonDataExport.goalStatistics")}</li>
              <li>{t("seasonDataExport.playerPerformance")}</li>
              <li>{t("seasonDataExport.injuryReport")}</li>
            </ul>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => window.alert(t("seasonDataExport.exportCompleted"))}
          >
            {t("seasonDataExport.exportNow")}
          </Button>
        </Panel>
      )}
    </Panel>
  );
}