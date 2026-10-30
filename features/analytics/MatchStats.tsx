import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function MatchStats() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      played: c.matchesPlayed || 38,
      wins: c.wins || 0,
      draws: c.draws || 0,
      losses: c.losses || 0,
      goalsFor: c.goalsFor || 0,
      goalsAgainst: c.goalsAgainst || 0,
      points: c.points || 0,
      cleanSheets: c.cleanSheets || 0,
      penaltiesWon: c.penaltiesWon || 0,
      penaltiesScored: c.penaltiesScored || 0,
      corners: c.corners || 0,
      offsides: c.offsides || 0,
      yellowCards: c.yellowCards || 0,
      redCards: c.redCards || 0,
    }));
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!clubData.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("matchStats.title")} />
        <p className="text-muted-foreground mb-4">
          {t("matchStats.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("matchStats.title")} />

      {/* 选中的俱乐部 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || '' : '全联盟'}</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div>{t("matchStats.selectClub")}</div>
        </div>
      </div>

      {/* 联盟-wide 关键指标 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("matchStats.leagueWide")} />
        <div className="grid grid-cols-4 gap-3">
          <StatTile
            title={t("matchStats.totalGoals")}
            value={(clubs.reduce((sum, c) => sum + (c.goalsFor || 0), 0)).toLocaleString()}
            subtitle={t("matchStats.leagueWide")}
          />
          <StatTile
            title={t("matchStats.totalCleanSheets")}
            value={(clubs.reduce((sum, c) => sum + (c.cleanSheets || 0), 0)).toLocaleString()}
            subtitle={t("matchStats.leagueWide")}
          />
          <StatTile
            title={t("matchStats.totalYellowCards")}
            value={(clubs.reduce((sum, c) => sum + (c.yellowCards || 0), 0)).toLocaleString()}
            subtitle={t("matchStats.leagueWide")}
          />
          <StatTile
            title={t("matchStats.totalRedCards")}
            value={(clubs.reduce((sum, c) => sum + (c.redCards || 0), 0)).toLocaleString()}
            subtitle={t("matchStats.leagueWide")}
          />
        </div>
      </Panel>

      {/* 俱乐部详细数据 */}
      {selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("matchStats.clubDetail")} />
          const c = clubData.find(club => club.id === selectedClub)!;
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("matchStats.name")}</div>
              <div className="text-2xl text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("matchStats.position")}</div>
              <div>{c.position}名</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatTile
              title={t("matchStats.played")}
              value={c.played}
              subtitle={t("matchStats.games")}
            />
            <StatTile
              title={t("matchStats.wins")}
              value={c.wins}
              subtitle={t("matchStats.winLoss")}
            />
            <StatTile
              title={t("matchStats.draws")}
              value={c.draws}
              subtitle={t("matchStats.winLoss")}
            />
          </div>
          
          <div className="mt-3 grid grid-cols-3 gap-3">
            <StatTile
              title={t("matchStats.losses")}
              value={c.losses}
              subtitle={t("matchStats.winLoss")}
            />
            <StatTile
              title={t("matchStats.goalsFor")}
              value={c.goalsFor}
              subtitle={t("matchStats.goals")}
            />
            <StatTile
              title={t("matchStats.goalsAgainst")}
              value={c.goalsAgainst}
              subtitle={t("matchStats.goals")}
            />
          </div>
          
          <div className="mt-3 grid grid-cols-3 gap-3">
            <StatTile
              title={t("matchStats.cleanSheets")}
              value={c.cleanSheets}
              subtitle={t("matchStats.shutouts")}
            />
            <StatTile
              title={t("matchStats.penaltiesWon")}
              value={c.penaltiesWon}
              subtitle={t("matchStats.penalties")}
            />
            <StatTile
              title={t("matchStats.penaltiesScored")}
              value={c.penaltiesScored}
              subtitle={t("matchStats.penalties")}
            />
          </div>
          
          <div className="mt-3 grid grid-cols-3 gap-3">
            <StatTile
              title={t("matchStats.corners")}
              value={c.corners}
              subtitle={t("matchStats.setPieces")}
            />
            <StatTile
              title={t("matchStats.offsides")}
              value={c.offsides}
              subtitle={t("matchStats.discipline")}
            />
            <StatTile
              title={t("matchStats.yellowCards")}
              value={c.yellowCards}
              subtitle={t("matchStats.discipline")}
            />
          </div>
        </Panel>
      )}

      {/* 联盟排名 */}
      <Panel className="p-4">
        <SectionTitle title={t("matchStats.leagueRanking")} />
        <p className="text-sm text-muted-foreground">
          {t("matchStats.keyStats")}</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
          <li>{t("matchStats.mostGoals")} - 进球王</li>
          <li>{t("matchStats.mostCleanSheets")} - 金手套</li>
          <li>{t("matchStats.fewestGoalsAgainst")} - 最稳防守</li>
          <li>{t("matchStats.mostYellowCards")} - 最多警告</li>
          <li>{t("matchStats.mostRedCards")} - 最多红牌</li>
          <li>{t("matchStats.mostCorners")} - 最多角球</li>
        </ul>
      </Panel>

      {/* 赛季概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("matchStats.seasonOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("matchStats.totalMatches", { matches: clubs.reduce((sum, c) => sum + c.played, 0) / 2 })}</p>
        <p>{t("matchStats.avgGoals", { avg: (clubs.reduce((sum, c) => sum + (c.goalsFor || 0) / (c.played || 1), 0) / clubs.length).toFixed(2) })} 每场</p>
        <p>{t("matchStats.avgYellow", { avg: (clubs.reduce((sum, c) => sum + (c.yellowCards || 0) / (c.played || 1), 0) / clubs.length).toFixed(2) })} 黄牌/场</p>
      </Panel>
    </Panel>
  );
}