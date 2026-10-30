import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonScheduleGenerator() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
    }));
  }, [clubs]);

  const [selectedFormat, setSelectedFormat] = useState<"roundRobin" "groupStage">("roundRobin");

  const handleSelectFormat = (format: string) => {
    setSelectedFormat(format);
  };

  const generateMatches = useMemo(() => {
    const matches = [];
    const numClubs = clubData.length;
    const numRounds = numClubs % 2 === 0 ? numClubs - 1 : numClubs;

    // Generate round-robin schedule
    if (selectedFormat === "roundRobin") {
      for (let round = 1; round <= numRounds; round++) {
        const roundMatches = [];
        for (let i = 0; i < Math.floor(numClubs / 2); i++) {
          const homeIndex = (round + i) % (numClubs - 1);
          const awayIndex = (numClubs - 1 - i + round) % (numClubs - 1);

          // Handle the last club (bye position)
          const homeClub = homeIndex === numClubs - 2 ? clubData[numClubs - 1] : clubData[homeIndex];
          const awayClub = awayIndex === numClubs - 2 ? clubData[numClubs - 1] : clubData[awayIndex];

          roundMatches.push({
            id: `${round}-${i}`,
            homeClub: homeClub.name,
            awayClub: awayClub.name,
            round,
          });
        }
        matches.push(...roundMatches);
      }
    }
    // Generate group stage schedule
    else if (selectedFormat === "groupStage") {
      const numGroups = Math.ceil(numClubs / 4);
      const teamsPerGroup = Math.ceil(numClubs / numGroups);

      for (let g = 0; g < numGroups; g++) {
        const groupClubs = clubData.slice(g * teamsPerGroup, g * teamsPerGroup + teamsPerGroup);
        // Generate round-robin within group
        for (let i = 0; i < teamsPerGroup; i++) {
          for (let j = i + 1; j < teamsPerGroup; j++) {
            matches.push({
              id: `gs-${g}-${i}-${j}`,
              homeClub: groupClubs[i].name,
              awayClub: groupClubs[j].name,
              group: `组 ${g + 1}`,
            });
          }
        }
      }
    }

    return matches;
  }, [clubData, selectedFormat]);

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonScheduleGenerator.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonScheduleGenerator.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonScheduleGenerator.title")} />

      {/* 赛制选择 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonScheduleGenerator.format")} />
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={setSelectedFormat === "roundRobin" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleSelectFormat("roundRobin")}
          >
            {t("seasonScheduleGenerator.roundRobin")}
          </Button>
          <Button
            variant={setSelectedFormat === "groupStage" ? "primary" : "outline"}
            size="sm"
            onClick={() => handleSelectFormat("groupStage")}
          >
            {t("seasonScheduleGenerator.groupStage")}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t("seasonScheduleGenerator.selectFormat")}</p>
      </Panel>

      {/* 生成的赛程 */}
      {generateMatches.length > 0 && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonScheduleGenerator.generatedMatches")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("seasonScheduleGenerator.totalMatches", { count: generateMatches.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {generateMatches.slice(0, 20).map(m => (
              <li key={m.id} className="font-medium text-primary mb-1">
                {t("seasonScheduleGenerator.round", { round: m.round })}:
                {t("seasonScheduleGenerator.{home}", { home: m.homeClub })} vs {t("seasonScheduleGenerator.{away}", { away: m.awayClub })}</li>
            ))}
            {generateMatches.length > 20 && (
              <li className="font-medium text-primary">... 共 {generateMatches.length} 场比赛</li>
            )}
          </ol>
        </Panel>
      )}

      {/* 导出选项 */}
      {generateMatches.length > 0 && (
        <Panel className="p-4">
          <SectionTitle title={t("seasonScheduleGenerator.exportOptions")} />
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="sm">
              {t("seasonScheduleGenerator.exportFixtures")}
            </Button>
            <Button variant="outline" size="sm">
              {t("seasonScheduleGenerator.exportCSV")}
            </Button>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonScheduleGenerator.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("seasonScheduleGenerator.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("seasonScheduleGenerator.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}