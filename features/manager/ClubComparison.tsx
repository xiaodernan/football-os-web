import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubComparison() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      squadValue: Math.floor(Math.random() * 300000000) + 100000000,
      wageBill: Math.floor(Math.random() * 100000000) + 30000000,
      leaguePosition: Math.floor(Math.random() * 20) + 1,
      matchesPlayed: 38,
      wins: Math.floor(Math.random() * 20) + 10,
      draws: Math.floor(Math.random() * 10) + 8,
      losses: 38 - (Math.floor(Math.random() * 20) + 10) - Math.floor(Math.random() * 10) - 8,
      goalsFor: Math.floor(Math.random() * 60) + 30,
      goalsAgainst: Math.floor(Math.random() * 50) + 20,
      points: 0,
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

  const handleToggleClub = (clubId: string) => {
    setSelectedClubs(prev => {
      if (prev.includes(clubId)) {
        return prev.filter(id => id !== clubId);
      } else {
        return [...prev, clubId].slice(0, 4); // 最多选4支球队进行比较
      }
    });
  };

  if (selectedClubs.length < 2) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("manager.clubComparisonTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("manager.selectAtLeastTwoClubs")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {clubs.map(c => (
            <Button
              key={c.id}
              variant="outline"
              size="sm"
              onClick={() => handleToggleClub(c.id)}
            >
              {c.name}
            </Button>
          ))
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t("manager.maxFourClubs")}
        </p>
      </Panel>
    );
  }

  const selectedClubData = useMemo(() => {
    return sortedClubs.filter(c => selectedClubs.includes(c.id));
  }, [selectedClubs, sortedClubs]);

  // 比较数据
  const comparison = useMemo(() => {
    return selectedClubData.map(c => ({
      name: c.name,
      position: c.leaguePosition,
      played: c.matchesPlayed,
      wins: c.wins,
      draws: c.draws,
      losses: c.losses,
      points: c.points,
      goalDifference: c.goalsFor - c.goalsAgainst,
      squadValue: c.squadValue,
      wageBill: c.wageBill,
    }));
  }, [selectedClubs, sortedClubs]);

  // 性价比计算
  const valueEfficiency = useMemo(() => {
    return comparison.map(c => ({
      ...c,
      efficiency: c.squadValue / (c.points + 1),
    }));
  }, [comparison]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.clubComparisonTitle")} />

      {/* 选中俱乐部 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {selectedClubs.map(id => {
          const c = comparison.find(c => c.name === clubs.find(club => club.id === id)?.name) || comparison[0];
          return (
            <div key={id} className="border rounded p-2 text-center ${
              selectedClubs.length > 0 ? "bg-primary-100" : "bg-gray-50"
            }"}
            >
              <div className="text-2xl font-bold text-primary">{c.name.split(" ")[0]}</div>
              <div className="text-xs text-muted-foreground">{c.name}</div>
            </div>
          );
        })}
      </div>

      {/* 比较表格 */}
      <Panel className="p-4">
        <SectionTitle title={t("manager.comparisonTable")} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr>
                <th className="text-left p-3 border border-gray-200">{t("manager.name")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.position")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.played")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.wins")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.draws")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.losses")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.points")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.goalDifference")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.squadValue")}</th>
                <th className="text-left p-3 border border-gray-200">{t("manager.wageBill")}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map(c => (
                <tr key={c.name} className="border-b">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">{c.position}位</td>
                  <td className="p-3">{c.played}</td>
                  <td className="p-3">{c.wins}</td>
                  <td className="p-3">{c.draws}</td>
                  <td className="p-3">{c.losses}</td>
                  <td className="p-3">{c.points}</td>
                  <td className="p-3">{c.goalDifference}</td>
                  <td className="p-3">
                    {t("currency.euro")} {c.squadValue.toLocaleString()}
                  </td>
                  <td className="p-3">
                    {t("currency.euro")} {c.wageBill.toLocaleString()}/w
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* 性价比分析 */}
      {selectedClubs.length > 0 && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("manager.valueEfficiency")} />
          <div className="grid grid-cols-2 gap-3">
            {valueEfficiency.map((c, index) => (
              <div key={c.name} className={`border rounded p-3 text-center ${
                index === 0 ? "bg-primary-100 text-primary" : "bg-gray-50"
              }`}
              >
                <div className="font-small">{c.name}</div>
                <div className="text-xs text-primary">€{c.efficiency.toLocaleString()}/M</div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </Panel>
  );
}