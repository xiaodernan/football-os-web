import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SquadComparison() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClubs(prev => {
      if (prev.includes(clubId)) {
        return prev.filter(id => id !== clubId);
      } else {
        return [...prev, clubId].slice(0, 2); // 最多选2支球队
      }
    });
  };

  if (selectedClubs.length < 2) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("squadComparison.title")} />
        <p className="text-muted-foreground mb-4">
          {t("squadComparison.selectTwoClubs")}
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
        <p className="text-sm text-muted-foreground mt-2">
          {t("squadComparison.selectTwoClubs")}
        </p>
      </Panel>
    );
  }

  const c1 = clubData.find(club => club.id === selectedClubs[0])!;
  const c2 = clubData.find(club => club.id === selectedClubs[1])!;

  // 计算各项数据对比
  const comparison = useMemo(() => ({
    gamesPlayed: {
      home: { c1: c1.played, c2: c2.played },
      away: { c1: c1.played, c2: c2.played },
    },
    goals: {
      c1GoalsFor: c1.goalsFor,
      c2GoalsFor: c2.goalsFor,
      c1GoalsAgainst: c1.goalsAgainst,
      c2GoalsAgainst: c2.goalsAgainst,
    },
    results: {
      c1Wins: c1.wins,
      c2Wins: c2.wins,
      c1Draws: c1.draws,
      c2Draws: c2.draws,
      c1Losses: c1.losses,
      c2Losses: c2.losses,
    },
    points: { c1Points: c1.points, c2Points: c2.points },
    cleanSheets: { c1Sheets: c1.cleanSheets, c2Sheets: c2.cleanSheets },
    penalties: {
      c1Won: c1.penaltiesWon,
      c2Won: c2.penaltiesWon,
      c1Scored: c1.penaltiesScored,
      c2Scored: c2.penaltiesScored,
    },
  }), [c1, c2]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("squadComparison.title")} />

      {/* 选中的球队 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">{c1.name}</div>
          <div className="text-2xl text-primary">{c1.points}分</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-info">{c2.name}</div>
          <div className="text-2xl text-info">{c2.points}分</div>
        </div>
      </div>

      {/* 积分对比 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("squadComparison.points")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium text-primary">{t("squadComparison.{name}", { name: c1.name })}</div>
            <div className="text-2xl text-primary">{c1.points}</div>
          </div>
          <div>
            <div className="font-medium text-info">{t("squadComparison.{name}", { name: c2.name })}</div>
            <div className="text-2xl text-info">{c2.points}</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t("squadComparison.pointsGap", { gap: Math.abs(c1.points - c2.points) })}</p>
      </Panel>

      {/* 进球对比 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("squadComparison.goals")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium text-primary">{t("squadComparison.{name}进球", { name: c1.name })}</div>
            <div className="text-2xl text-primary">{c1.goalsFor}</div>
          </div>
          <div>
            <div className="font-medium text-info">{t("squadComparison.{name}进球", { name: c2.name })}</div>
            <div className="text-2xl text-info">{c2.goalsFor}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <div className="font-medium text-primary">{t("squadComparison.{name}失球", { name: c1.name })}</div>
            <div className="text-2xl text-danger">{c1.goalsAgainst}</div>
          </div>
          <div>
            <div className="font-medium text-info">{t("squadComparison.{name}失球", { name: c2.name })}</div>
            <div className="text-2xl text-danger">{c2.goalsAgainst}</div>
          </div>
        </div>
      </panel>

      {/* 战绩对比 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("squadComparison.results")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium text-primary">{t("squadComparison.{name}胜", { name: c1.name })}</div>
            <div>{c1.wins}</div>
          </div>
          <div>
            <div className="font-medium text-info">{t("squadComparison.{name}胜", { name: c2.name })}</div>
            <div>{c2.wins}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <div className="font-medium text-primary">{t("squadComparison.{name}平", { name: c1.name })}</div>
            <div>{c1.draws}</div>
          </div>
          <div>
            <div className="font-medium text-info">{t("squadComparison.{name}平", { name: c2.name })}</div>
            <div>{c2.draws}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <div className="font-medium text-primary">{t("squadComparison.{name}负", { name: c1.name })}</div>
            <div>{c1.losses}</div>
          </div>
          <div>
            <div className="font-medium text-info">{t("squadComparison.{name}负", { name: c2.name })}</div>
            <div>{c2.losses}</div>
          </div>
        </div>
      </Panel>

      {/* 防守与清白赛 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("squadComparison.defense")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium text-primary">{t("squadComparison.{name}零封", { name: c1.name })}</div>
            <div>{c1.cleanSheets}</div>
          </div>
          <div>
            <div className="font-medium text-info">{t("squadComparison.{name}零封", { name: c2.name })}</div>
            <div>{c2.cleanSheets}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <div className="font-medium text-primary">{t("squadComparison.{name}点球", { name: c1.name })}</div>
            <div>{c1.penaltiesWon}</div>
          </div>
          <div>
            <div className="font-medium text-info">{t("squadComparison.{name}点球", { name: c2.name })}</div>
            <div>{c2.penaltiesWon}</div>
          </div>
        </div>
      </Panel>

      {/* 详细数据表 */}
      <Panel className="p-4">
        <SectionTitle title={t("squadComparison.detailedStats")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("squadComparison.headToHead")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr>
                <th className="text-left p-3 border border-gray-200">{t("squadComparison.category")}</th>
                <th className="text-left p-3 border border-gray-200 text-center">{t("squadComparison.{name}", { name: c1.name })}</th>
                <th className="text-left p-3 border border-gray-200 text-center">{t("squadComparison.{name}", { name: c2.name })}</th>
                <th className="text-left p-3 border border-gray-200">{t("squadComparison.difference")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3 font-medium text-primary">进球</td>
                <td className="p-3 text-center text-primary">{c1.goalsFor}</td>
                <td className="p-3 text-center text-info">{c2.goalsFor}</td>
                <td className="p-3 text-center">{c1.goalsFor - c2.goalsFor >= 0 ? `+${c1.goalsFor - c2.goalsFor}` : c1.goalsFor - c2.goalsFor}</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium text-primary">失球</td>
                <td className="p-3 text-center text-danger">{c1.goalsAgainst}</td>
                <td className="p-3 text-center text-danger">{c2.goalsAgainst}</td>
                <td className="p-3 text-center">{c1.goalsAgainst - c2.goalsAgainst >= 0 ? `+${c1.goalsAgainst - c2.goalsAgainst}` : c1.goalsAgainst - c2.goalsAgainst}</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium text-primary">净胜球</td>
                <td className="p-3 text-center">{c1.goalsFor - c1.goalsAgainst}</td>
                <td className="p-3 text-center">{c2.goalsFor - c2.goalsAgainst}</td>
                <td className="p-3 text-center">{((c1.goalsFor - c1.goalsAgainst) - (c2.goalsFor - c2.goalsAgainst)) >= 0 ? `+${((c1.goalsFor - c1.goalsAgainst) - (c2.goalsFor - c2.goalsAgainst))}` : ((c1.goalsFor - c1.goalsAgainst) - (c2.goalsFor - c2.goalsAgainst))}</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium text-primary">积分</td>
                <td className="p-3 text-center text-primary">{c1.points}</td>
                <td className="p-3 text-center text-info">{c2.points}</td>
                <td className="p-3 text-center">{c1.points - c2.points >= 0 ? `+${c1.points - c2.points}` : c1.points - c2.points}</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium text-primary">零封</td>
                <td className="p-3 text-center">{c1.cleanSheets}</td>
                <td className="p-3 text-center">{c2.cleanSheets}</td>
                <td className="p-3 text-center">{c1.cleanSheets - c2.cleanSheets >= 0 ? `+${c1.cleanSheets - c2.cleanSheets}` : c1.cleanSheets - c2.cleanSheets}</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-primary">点球</td>
                <td className="p-3 text-center">{c1.penaltiesWon}</td>
                <td className="p-3 text-center">{c2.penaltiesWon}</td>
                <td className="p-3 text-center">{c1.penaltiesWon - c2.penaltiesWon >= 0 ? `+${c1.penaltiesWon - c2.penaltiesWon}` : c1.penaltiesWon - c2.penaltiesWon}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </Panel>
  );
}