import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function HomeAwayAnalysis() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      played: c.matchesPlayed || 38,
      homeWon: c.homeWins || 0,
      homeDrawn: c.homeDraws || 0,
      homeLost: c.homeLosses || 0,
      awayWon: c.awayWins || 0,
      awayDrawn: c.awayDraws || 0,
      awayLost: c.awayLosses || 0,
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
        <SectionTitle title={t("homeAwayAnalysis.title")} />
        <p className="text-muted-foreground mb-4">
          {t("homeAwayAnalysis.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("homeAwayAnalysis.title")} />

      {/* 选中的俱乐部 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || '' : '全联盟'}</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div>{t("homeAwayAnalysis.selectClub")}</div>
        </div>
      </div>

      {/* 联盟-wide 主客场统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("homeAwayAnalysis.leagueSummary")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("homeAwayAnalysis.leagueTotal", { total: clubs.length })}</p>
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("homeAwayAnalysis.totalHomeGames")}
            value={(clubs.reduce((sum, c) => sum + (c.homeWins + c.homeDrawn + c.homeLost), 0)).toLocaleString()}
            subtitle={t("homeAwayAnalysis.matches")}
          />
          <StatTile
            title={t("homeAwayAnalysis.totalAwayGames")}
            value={(clubs.reduce((sum, c) => sum + (c.awayWins + c.awayDrawn + c.awayLost), 0)).toLocaleString()}
            subtitle={t("homeAwayAnalysis.matches")}
          />
        </div>
      </Panel>

      {/* 主客场积分对比 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("homeAwayAnalysis.pointsComparison")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("homeAwayAnalysis.homeAwayPoints")}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          {clubs.map(c => (
            <li key={c.id} className="font-medium text-primary mb-1">
              {t("homeAwayAnalysis.{name}", { name: c.name })}:
              <div className="text-sm">
                {t("homeAwayAnalysis.home", { points: c.points })} -
                {t("homeAwayAnalysis.away", { points: 0 })}</div>
            </li>
          ))}
        </ul>
      </Panel>

      {/* 俱乐部详情 */}
      {selectedClub && (
        <Panel className="p-4">
          <SectionTitle title={t("homeAwayAnalysis.clubDetail")} />
          const c = clubData.find(club => club.id === selectedClub)!;
          const homeRate = c.played > 0 ? Math.round((c.homeWon / c.played) * 100) : 0;
          const awayRate = c.played > 0 ? Math.round((c.awayWon / c.played) * 100) : 0;
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("homeAwayAnalysis.name")}</div>
              <div className="text-2xl text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("homeAwayAnalysis.position")}</div>
              <div>{c.position}名</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="font-medium">{t("homeAwayAnalysis.homeForm")}</div>
            <div>
              {c.homeWins}胜 {c.homeDrawn}平 {c.homeLost}负
              ({t("homeAwayAnalysis.rate", { rate: homeRate })}%)
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("homeAwayAnalysis.awayForm")}</div>
            <div>
              {c.awayWins}胜 {c.awayDrawn}平 {c.awayLost}负
              ({t("homeAwayAnalysis.rate", { rate: awayRate })}%)
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("homeAwayAnalysis.goalDifference")}</div>
            <div>
              主场: {c.goalsFor > 0 ? `${c.goalsFor}球` : '0球'} -
              客场: {c.goalsAgainst > 0 ? `${c.goalsAgainst}球` : '0球'}
            </div>
          </div>
        </Panel>
      )}

      {/* 联盟排名 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("homeAwayAnalysis.leagueRanking")} />
        <p className="text-sm text-muted-foreground">
          {t("homeAwayAnalysis.leagueHomeAwayRanking")}</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
          <li>{t("homeAwayanalysis.mostHomeWins")}</li>
          <li>{t("homeAwayanalysis.mostAwayWins")}</li>
          <li>{t("homeAwayanalysis.bestHomeRate")}</li>
          <li>{t("homeAwayanalysis.bestAwayRate")}</li>
        </ul>
      </Panel>
    </Panel>
  );
}