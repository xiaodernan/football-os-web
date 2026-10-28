import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TeamDataScreen() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      squadValue: Math.floor(Math.random() * 300000000) + 100000000,
      wageBill: Math.floor(Math.random() * 100000000) + 30000000,
      stadiumCapacity: 50000,
      attendanceRate: 85 + Math.random() * 10,
      leaguePosition: Math.floor(Math.random() * 20) + 1,
      matchesPlayed: 38,
      wins: Math.floor(Math.random() * 20) + 10,
      draws: Math.floor(Math.random() * 10) + 8,
      losses: 38 - (Math.floor(Math.random() * 20) + 10) - Math.floor(Math.random() * 10) - 8,
      goalsFor: Math.floor(Math.random() * 60) + 30,
      goalsAgainst: Math.floor(Math.random() * 50) + 20,
      points: 0, // calculated
    }));
  }, [clubs]);

  // 计算积分
  clubData.forEach(c => {
    c.points = c.wins * 3 + c.draws;
  });

  // 排序：按积分倒序
  const sortedClubs = useMemo(() => {
    return [...clubData].sort((a, b) => b.points - a.points);
  }, [clubData]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.teamDataScreenTitle")} />

      {/* 选择俱乐部 */}
      {selectedClub ? (
        <Panel className="p-6">
          <SectionTitle title={t("manager.clubDetails")} />
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="font-medium">{t("manager.squadValue")}</div>
              <div className="text-2xl text-primary">{t("currency.euro")} {selectedClub.squadValue.toLocaleString()}</div>
            </div>
            <div>
              <div className="font-medium">{t("manager.wageBill")}</div>
              <div className="text-primary">{t("currency.euro")} {selectedClub.wageBill.toLocaleString()}/w</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <div className="font-medium">{t("manager.stadiumCapacity")}</div>
              <div className="text-muted-foreground">{selectedClub.stadiumCapacity.toLocaleString()}</div>
            </div>
            <div>
              <div className="font-medium">{t("manager.attendanceRate")}</div>
              <div className="text-success">{(selectedClub.attendanceRate || 0).toFixed(1)}%</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="font-medium">{t("manager.leaguePosition")}</div>
            <div className={selectedClub.leaguePosition <= 3 ? "text-primary" : selectedClub.leaguePosition <= 6 ? "text-warning" : "text-danger"}>
              {t(`position.${selectedClub.leaguePosition}`)}
            </div>
          </div>
        </Panel>
      ) : (
        <Panel className="p-6">
          <SectionTitle title={t("manager.selectClub")} />
          <p className="text-muted-foreground mb-4">
            {t("manager.selectClubToViewDetails")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {clubs.map(c => (
              <Button
                key={c.id}
                variant="outline"
                size="sm"
                onClick={() => setSelectedClub(c)}
              >
                {c.name}
              </Button>
            ))
          </div>
        </Panel>
      )}

      {/* 联赛积分榜 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("manager.leagueTable")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("manager.pointsSystem", { system: "3分制" })}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr>
                <th className="text-left p-3 border border-gray-200">{t("manager.position")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.team")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.played")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.wins")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.draws")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.losses")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.points")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.goalDifference")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedClubs.map((c, index) => (
                <tr key={c.id} className="border-b">
                  <td className="p-3 font-medium text-primary">{index + 1}</td>
                  <td className="p-3 font-medium truncate">{t(`team.${c.name}`)}</td>
                  <td className="p-3">{c.matchesPlayed}</td>
                  <td className="p-3">{c.wins}</td>
                  <td className="p-3">{c.draws}</td>
                  <td className="p-3">{c.losses}</td>
                  <td className="p-3">{c.points}</td>
                  <td className="p-3">{c.goalsFor - c.goalsAgainst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedClub(null)}
        >
          {t("manager.backToClubs")}
        </Button>
      </Panel>
    </Panel>
  );
}