import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function FanEngagement() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      played: c.matchesPlayed || 38,
      won: c.wins || 0,
      drawn: c.draws || 0,
      lost: c.losses || 0,
      goalsFor: c.goalsFor || 0,
      goalsAgainst: c.goalsAgainst || 0,
      points: c.points || 0,
    }));
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!clubData.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("fanEngagement.title")} />
        <p className="text-muted-foreground mb-4">
          {t("fanEngagement.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("fanEngagement.title")} />

      {/* 选中的俱乐部 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || '' : '全联盟'}</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div>{t("fanEngagement.selectClub")}</div>
        </div>
      </div>

      {/* 联盟-wide 球迷指标 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("fanEngagement.leagueMetrics")} />
        <div className="grid grid-cols-4 gap-3">
          <StatTile
            title={t("fanEngagement.totalClubs")}
            value={clubs.length}
            subtitle={t("fanEngagement.clubs")}
          />
          <StatTile
            title={t("fanEngagement.totalFansEstimate")}
            value={clubs.length * 10000}
            subtitle={t("fanEngagement.estimate", { base: 10000 })}
          />
          <StatTile
            title={t("fanEngagement.totalWins")}
            value={(clubs.reduce((sum, c) => sum + (c.wins || 0), 0)).toLocaleString()}
            subtitle={t("fanEngagement.wins")}
          />
          <StatTile
            title={t("fanEngagement.totalGoals")}
            value={(clubs.reduce((sum, c) => sum + (c.goalsFor || 0), 0)).toLocaleString()}
            subtitle={t("fanEngagement.goals")}
          />
        </div>
      </Panel>

      {/* 俱乐部详情 */}
      {selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("fanEngagement.clubDetail")} />
          const c = clubData.find(club => club.id === selectedClub)!;
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("fanEngagement.name")}</div>
              <div className="text-2xl text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("fanEngagement.position")}</div>
              <div>{c.position}名</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("fanEngagement.fanBase")}</div>
            <div>{t("fanEngagement.estimatedFans", { base: clubs.length * 10000 })}</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("fanEngagement.matchAttendance")}</div>
            <div>{t("fanEngagement.avgAttendance", { avg: Math.round(c.played / 2) })}</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("fanEngagement.seasonTickets")}</div>
            <div>{t("fanEngagement.estimatedTickets", { tickets: c.played * 500 })}</div>
          </div>
        </Panel>
      )}

      {/* 赛季数据 */}
      <Panel className="p-4">
        <SectionTitle title={t("fanEngagement.seasonData")} />
        <p className="text-sm text-muted-foreground">
          {t("fanEngagement.totalSeasonWins", { wins: clubs.reduce((sum, c) => sum + (c.wins || 0), 0) })}</p>
        <p>{t("fanEngagement.totalSeasonGoals", { goals: clubs.reduce((sum, c) => sum + (c.goalsFor || 0), 0) })}</p>
        <p>{t("fanEngagement.totalSeasonPoints", { points: clubs.reduce((sum, c) => sum + (c.points || 0), 0) })}</p>
      </Panel>

      {/* 球迷互动 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("fanEngagement.interaction")} />
        <p className="text-sm text-muted-foreground">
          {t("fanEngagement.engagementActivities")}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>{t("fanEngagement.matchDayExperience")}</li>
          <li>{t("fanEngagement.socialMedia")}</li>
          <li>{t("fanEngagement.merchandiseSales")}</li>
          <li>{t("fanEngagement.stadiumAtmosphere")}</li>
        </ul>
        <p className="text-xs text-primary mt-2">
          {t("fanEngagement.engagementGrowth")}</p>
      </Panel>
    </Panel>
  );
}