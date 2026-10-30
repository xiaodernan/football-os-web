import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function MatchAnalysis() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      played: c.matchesPlayed || 38,
      goalsFor: c.goalsFor || 0,
      goalsAgainst: c.goalsAgainst || 0,
      wins: c.wins || 0,
      draws: c.draws || 0,
      losses: c.losses || 0,
      cleanSheets: c.cleanSheets || 0,
      penaltiesWon: c.penaltiesWon || 0,
      penaltiesScored: c.penaltiesScored || 0,
    }));
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!clubData.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("matchAnalysis.title")} />
        <p className="text-muted-foreground mb-4">
          {t("matchAnalysis.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("matchAnalysis.title")} />

      {/* 选中的俱乐部 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || '' : '全联盟'}</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div>{t("matchAnalysis.selectClub")}</div>
        </div>
      </div>

      {/* 联盟-wide 关键指标 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("matchAnalysis.leagueMetrics")} />
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            title={t("matchAnalysis.totalGoals")}
            value={(clubs.reduce((sum, c) => sum + (c.goalsFor || 0), 0)).toLocaleString()}
            subtitle={t("matchAnalysis.leagueWide")}
          />
          <StatTile
            title={t("matchAnalysis.totalCleanSheets")}
            value={(clubs.reduce((sum, c) => sum + (c.cleanSheets || 0), 0)).toLocaleString()}
            subtitle={t("matchAnalysis.leagueWide")}
          />
          <StatTile
            title={t("matchAnalysis.totalPenalties")}
            value={(clubs.reduce((sum, c) => sum + (c.penaltiesWon || 0), 0)).toLocaleString()}
            subtitle={t("matchAnalysis.leagueWide")}
          />
        </div>
      </Panel>

      {/* 俱乐部详细数据 */}
      {selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("matchAnalysis.clubDetail")} />
          const c = clubData.find(club => club.id === selectedClub)!;
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("matchAnalysis.name")}</div>
              <div className="text-2xl text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("matchAnalysis.position")}</div>
              <div>{c.position}名</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("matchAnalysis.goalsFor")}</div>
              <div className="text-2xl text-primary">{c.goalsFor}</div>
            </div>
            <div>
              <div className="font-medium">{t("matchAnalysis.goalsAgainst")}</div>
              <div className="text-2xl text-danger">{c.goalsAgainst}</div>
            </div>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("matchAnalysis.wins")}</div>
              <div>{c.wins}</div>
            </div>
            <div>
              <div className="font-medium">{t("matchAnalysis.draws")}</div>
              <div>{c.draws}</div>
            </div>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("matchAnalysis.losses")}</div>
              <div>{c.losses}</div>
            </div>
            <div>
              <div className="font-medium">{t("matchAnalysis.cleanSheets")}</div>
              <div>{c.cleanSheets}</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("matchAnalysis.penalties")}</div>
            <div>
              获得点球: {c.penaltiesWon}, 转换进球: {c.penaltiesScored}
            </div>
          </div>
        </Panel>
      )}

      {/* 联盟排名统计 */}
      <Panel className="p-4">
        <SectionTitle title={t("matchAnalysis.leagueRanking")} />
        <p className="text-sm text-muted-foreground">
          {t("matchAnalysis.leagueStatsRanking")}</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
          <li>{t("matchAnalysis.mostGoals")} - 联盟最多进球</li>
          <li>{t("matchAnalysis.mostCleanSheets")} - 联盟最多零封</li>
          <li>{t("matchAnalysis.fewestGoalsAgainst")} - 联盟最少失球</li>
          <li>{t("matchAnalysis.mostPenalties")} - 联盟最多点球</li>
        </ul>
      </Panel>

      {/* 赛季概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("matchAnalysis.seasonOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("matchAnalysis.totalMatches", { matches: clubs.reduce((sum, c) => sum + c.played, 0) / 2 })}</p>
        <p>{t("matchAnalysis.averageGoals", { avg: (clubs.reduce((sum, c) => sum + (c.goalsFor || 0) / (c.played || 1), 0) / clubs.length).toFixed(2) })} 每场</p>
      </Panel>
    </Panel>
  );
}