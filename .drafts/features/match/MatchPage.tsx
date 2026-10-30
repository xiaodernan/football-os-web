import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function MatchPage() {
  const { t } = useI18n();
  const matches = useMemo(() => footballProvider.matches ? footballProvider.matches() : [], []);

  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  const matchData = useMemo(() => {
    return matches.map(m => ({
      id: m.id,
      homeTeam: m.homeTeam || '',
      awayTeam: m.awayTeam || '',
      status: m.status || 'schedule',
      kickoff: m.kickoff || '',
      homeGoals: m.homeGoals || 0,
      awayGoals: m.awayGoals || 0,
      homeShots: m.homeShots || 0,
      awayShots: m.awayShots || 0,
      homeShotsOnTarget: m.homeShotsOnTarget || 0,
      awayShotsOnTarget: m.awayShotsOnTarget || 0,
      homeCorners: m.homeCorners || 0,
      awayCorners: m.awayCorners || 0,
      homeYellowCards: m.homeYellowCards || 0,
      awayYellowCards: m.awayYellowCards || 0,
      homeRedCards: m.homeRedCards || 0,
      awayRedCards: m.awayRedCards || 0,
    }));
  }, [matches]);

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatch(matchId);
  };

  if (!matches.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("matchPage.title")} />
        <p className="text-muted-foreground mb-4">
          {t("matchPage.noMatches")}
        </p>
      </Panel>
    );
  }

  const selectedMatchData = matchData.find(m => m.id === selectedMatch);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("matchPage.title")} />

      {/* 赛事选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">全部赛事</div>
          <div>{matches.length}场</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div>{t("matchPage.selectMatch")}</div>
        </div>
      </div>

      {/* 赛事列表 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("matchPage.upcomingMatches")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("matchPage.upcomingCount", { count: matches.length })}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          {matches.map(m => (
            <li key={m.id} className="font-medium text-primary cursor-pointer hover:text-primary" onClick={() => handleSelectMatch(m.id)}>
              {t("matchPage.{home}", { home: m.homeTeam })} vs {t("matchPage.{away}", { away: m.awayTeam })} - {t("matchPage.{status}", { status: m.status })}</li>
            ))
          )}
        </ul>
      </Panel>

      {/* 选中的赛事详情 */}
      {selectedMatchData && (
        <Panel className="p-4">
          <SectionTitle title={t("matchPage.matchDetails")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("matchPage.homeTeam")}</div>
              <div className="text-2xl text-primary">{selectedMatchData.homeTeam}</div>
            </div>
            <div>
              <div className="font-medium text-info">{t("matchPage.awayTeam")}</div>
              <div className="text-2xl text-info">{selectedMatchData.awayTeam}</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("matchPage.kickoff")}</div>
            <div>{selectedMatchData.kickoff}</div>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("matchPage.homeGoals")}</div>
              <div className="text-2xl text-primary">{selectedMatchData.homeGoals}</div>
            </div>
            <div>
              <div className="font-medium text-info">{t("matchPage.awayGoals")}</div>
              <div className="text-2xl text-info">{selectedMatchData.awayGoals}</div>
            </div>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("matchPage.homeShots")}</div>
              <div>{selectedMatchData.homeShots}</div>
            </div>
            <div>
              <div className="font-medium text-info">{t("matchPage.awayShots")}</div>
              <div>{selectedMatchData.awayShots}</div>
            </div>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("matchPage.homeShotsOnTarget")}</div>
              <div>{selectedMatchData.homeShotsOnTarget}</div>
            </div>
            <div>
              <div className="font-medium text-info">{t("matchPage.awayShotsOnTarget")}</div>
              <div>{selectedMatchData.awayShotsOnTarget}</div>
            </div>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("matchPage.homeCorners")}</div>
              <div>{selectedMatchData.homeCorners}</div>
            </div>
            <div>
              <div className="font-medium text-info">{t("matchPage.awayCorners")}</div>
              <div>{selectedMatchData.awayCorners}</div>
            </div>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("matchPage.homeYellowCards")}</div>
              <div>{selectedMatchData.homeYellowCards}</div>
            </div>
            <div>
              <div className="font-medium text-info">{t("matchPage.awayYellowCards")}</div>
              <div>{selectedMatchData.awayYellowCards}</div>
            </div>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("matchPage.homeRedCards")}</div>
              <div>{selectedMatchData.homeRedCards}</div>
            </div>
            <div>
              <div className="font-medium text-info">{t("matchPage.awayRedCards")}</div>
              <div>{selectedMatchData.awayRedCards}</div>
            </div>
          </div>
        </Panel>
      )}

      {/* 赛季统计 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("matchPage.seasonStats")} />
        <p className="text-sm text-muted-foreground">
          {t("matchPage.totalMatches", { matches: matches.length })}</p>
        <p>{t("matchPage.avgGoals", { avg: (matches.reduce((sum, m) => sum + (m.homeGoals + m.awayGoals), 0) / matches.length).toFixed(2) })} 平均进球</p>
      </Panel>
    </Panel>
  );
}