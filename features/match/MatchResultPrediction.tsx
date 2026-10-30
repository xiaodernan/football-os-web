import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function MatchResultPrediction() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const matches = useMemo(() => footballProvider.matches ? footballProvider.matches() : [], []);

  const matchData = useMemo(() => {
    return matches.map(m => ({
      id: m.id,
      homeTeam: m.homeTeam || '',
      awayTeam: m.awayTeam || '',
      status: m.status || 'schedule',
      kickoff: m.kickoff || '',
      date: m.date || '',
      homeGoals: m.homeGoals || 0,
      awayGoals: m.awayGoals || 0,
      homeShots: m.homeShots || 0,
      awayShots: m.awayShots || 0,
      homeShotsOnTarget: m.homeShotsOnTarget || 0,
      awayShotsOnTarget: m.awayShotsOnTarget || 0,
    }));
  }, [matches]);

  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"upcoming" | "played">("upcoming");

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatch(matchId);
  };

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const upcomingMatches = matchData.filter(m => m.status === 'schedule' || m.status === 'soon');
  const playedMatches = matchData.filter(m => m.status === 'finished');

  if (!matches.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("matchResultPrediction.title")} />
        <p className="text-muted-foreground mb-4">
          {t("matchResultPrediction.noMatches")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("matchResultPrediction.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "upcoming" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("upcoming")}
        >
          {t("matchResultPrediction.upcoming")}
        </Button>
        <Button
          variant={setSelectedView === "played" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("played")}
        >
          {t("matchResultPrediction.played")}
        </Button>
      </div>

      {/* 即将进行的赛事 */}
      {setSelectedView === "upcoming" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("matchResultPrediction.upcomingFixtures")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("matchResultPrediction.upcomingCount", { count: upcomingMatches.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {upcomingMatches.map(m => (
              <li key={m.id} className="font-medium text-primary mb-1 cursor-pointer hover:text-primary" onClick={() => handleSelectMatch(m.id)}>
                {t("matchResultPrediction.{date}", { date: m.date })} - {t("matchResultPrediction.{home}", { home: m.homeTeam })} vs {t("matchResultPrediction.{away}", { away: m.awayTeam })} - {t("matchResultPrediction.{status}", { status: m.status })}</li>
              ))}
          </ol>
        </Panel>
      )}

      {/* 已进行的赛事 */}
      {setSelectedView === "played" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("matchResultPrediction.playedFixtures")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("matchResultPrediction.playedCount", { count: playedMatches.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-secondary">
            {playedMatches.map(m => (
              <li key={m.id} className="font-medium text-secondary mb-1">
                {t("matchResultPrediction.{date}", { date: m.date })} - {t("matchResultPrediction.{home}", { home: m.homeTeam })} vs {t("matchResultPrediction.{away}", { away: m.awayTeam })} - {t("matchResultPrediction.result", { result: m.homeGoals > m.awayGoals ? '主胜' : m.homeGoals < m.awayGoals ? '客胜' : '平局' })} {m.homeGoals}-{m.awayGoals}</li>
              ))}
          </ol>
        </Panel>
      )}

      {/* 选中的赛事预测 */}
      {selectedMatch && (
        <Panel className="p-4">
          <SectionTitle title={t("matchResultPrediction.matchPrediction")} />
          const match = matchData.find(m => m.id === selectedMatch)!;
          const predictedResult = useMemo(() => {
            // Simple prediction based on home advantage and form
            const homeStrength = (match.homeGoals + 1) / (match.homeShots + 1);
            const awayStrength = (match.awayGoals + 1) / (match.awayShots + 1);
            const homeWinProb = Math.round((homeStrength / (homeStrength + awayStrength)) * 100);
            const awayWinProb = Math.round((awayStrength / (homeStrength + awayStrength)) * 100);
            const drawProb = 100 - homeWinProb - awayWinProb;
            
            let result = "主胜";
            let highestProb = homeWinProb;
            
            if (awayWinProb > highestProb) {
              result = "客胜";
              highestProb = awayWinProb;
            }
            if (drawProb > highestProb) {
              result = "平局";
            }
            
            return { result, homeWinProb, awayWinProb, drawProb };
          }, [match]);

          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="font-medium text-primary">预测结果</div>
              <div className="text-2xl text-primary">{predictedResult.result}</div>
            </div>
            <div>
              <div className="font-medium text-primary">主胜概率</div>
              <div>{predictedResult.homeWinProb}%</div>
            </div>
            <div>
              <div className="font-medium text-primary">客胜概率</div>
              <div>{predictedResult.awayWinProb}%</div>
            </div>
          </div>
          <div>
            <div className="font-medium text-primary">平局概率</div>
            <div>{predictedResult.drawProb}%</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">比赛详情</div>
            <div>{t("matchResultPrediction.{date}", { date: match.date })} - {t("matchResultPrediction.{home}", { home: match.homeTeam })} vs {t("matchResultPrediction.{away}", { away: match.awayTeam })}</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">实际结果</div>
            <div>{match.homeGoals}-{match.awayGoals} {t("matchResultPrediction.{result}", { result: match.homeGoals > match.awayGoals ? '主胜' : match.homeGoals < match.awayGoals ? '客胜' : '平局' })}</div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("matchResultPrediction.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("matchResultPrediction.totalMatches", { total: matches.length })} 场比赛</p>
        <p>{t("matchResultPrediction.upcoming", { count: upcomingMatches.length })} 未进行</p>
        <p>{t("matchResultPrediction.played", { count: playedMatches.length })} 已进行</p>
      </Panel>
    </Panel>
  );
}