import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function FixtureSchedule() {
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
      date: m.date || '',
      homeGoals: m.homeGoals || 0,
      awayGoals: m.awayGoals || 0,
      competition: m.competition || '联赛',
    }));
  }, [matches]);

  const [selectedTab, setSelectedTab] = useState<"upcoming" | "played" | "all">("upcoming");

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatch(matchId);
  };

  const handleSelectTab = (tab: string) => {
    setSelectedTab(tab);
  };

  if (!matches.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("fixtureSchedule.title")} />
        <p className="text-muted-foreground mb-4">
          {t("fixtureSchedule.noMatches")}
        </p>
      </Panel>
    );
  }

  const upcomingMatches = matchData.filter(m => m.status === 'schedule' || m.status === 'soon');
  const playedMatches = matchData.filter(m => m.status === 'finished');

  return (
    <Panel className="p-6">
      <SectionTitle title={t("fixtureSchedule.title")} />

      {/* 标签切换 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Button
          variant={setSelectedTab === "upcoming" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("upcoming")}
        >
          {t("fixtureSchedule.upcoming")}
        </Button>
        <Button
          variant={setSelectedTab === "played" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("played")}
        >
          {t("fixtureSchedule.played")}
        </Button>
        <Button
          variant={setSelectedTab === "all" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("all")}
        >
          {t("fixtureSchedule.all")}
        </Button>
      </div>

      {/* 赛程列表 */}
      {setSelectedTab === "upcoming" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("fixtureSchedule.upcomingFixtures")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("fixtureSchedule.upcomingCount", { count: upcomingMatches.length })}</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-primary">
            {upcomingMatches.map(m => (
              <li key={m.id} className="font-medium text-primary cursor-pointer hover:text-primary" onClick={() => handleSelectMatch(m.id)}>
                {t("fixtureSchedule.{date}", { date: m.date })} - {t("fixtureSchedule.{home}", { home: m.homeTeam })} vs {t("fixtureSchedule.{away}", { away: m.awayTeam })} - {t("fixtureSchedule.{competition}", { competition: m.competition })}</li>
            ))
          )}
        </Panel>
      )}

      {/* 已进行赛事 */}
      {setSelectedTab === "played" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("fixtureSchedule.playedFixtures")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("fixtureSchedule.playedCount", { count: playedMatches.length })}</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-secondary">
            {playedMatches.map(m => (
              <li key={m.id} className="font-medium text-secondary cursor-pointer hover:text-primary" onClick={() => handleSelectMatch(m.id)}>
                {t("fixtureSchedule.{date}", { date: m.date })} - {t("fixtureSchedule.{home}", { home: m.homeTeam })} vs {t("fixtureSchedule.{away}", { away: m.awayTeam })} - {t("fixtureSchedule.result", { result: m.homeGoals > m.awayGoals ? '主胜' : m.homeGoals < m.awayGoals ? '客胜' : '平局' })} {m.homeGoals}-{m.awayGoals}</li>
            ))
          )}
        </Panel>
      )}

      {/* 选中的赛事详情 */}
      {selectedMatch && (
        <Panel className="p-4">
          <SectionTitle title={t("fixtureSchedule.matchDetails")} />
          const match = matchData.find(m => m.id === selectedMatch)!;
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("fixtureSchedule.homeTeam")}</div>
              <div className="text-2xl text-primary">{match.homeTeam}</div>
            </div>
            <div>
              <div className="font-medium text-info">{t("fixtureSchedule.awayTeam")}</div>
              <div className="text-2xl text-info">{match.awayTeam}</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("fixtureSchedule.kickoff")}</div>
            <div>{match.kickoff}</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("fixtureSchedule.date")}</div>
            <div>{match.date}</div>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("fixtureSchedule.homeGoals")}</div>
              <div className="text-primary">{match.homeGoals}</div>
            </div>
            <div>
              <div className="font-medium text-info">{t("fixtureSchedule.awayGoals")}</div>
              <div className="text-info">{match.awayGoals}</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("fixtureSchedule.competition")}</div>
            <div>{match.competition}</div>
          </div>
        </Panel>
      )}

      {/* 赛季统计 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("fixtureSchedule.seasonStats")} />
        <p className="text-sm text-muted-foreground">
          {t("fixtureSchedule.totalMatches", { matches: matches.length })}</p>
        <p>{t("fixtureSchedule.upcoming", { count: upcomingMatches.length })} 未进行</p>
        <p>{t("fixtureSchedule.played", { count: playedMatches.length })} 已进行</p>
      </Panel>
    </Panel>
  );
}