import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonAwardCeremony() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

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

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
      gamesPlayed: p.gamesPlayed || 0,
      goals: p.goals || 0,
      assists: p.assists || 0,
    }));
  }, [players]);

  const sortedClubs = useMemo(
    () => [...clubData].sort((a, b) => b.points - a.points),
    [clubData]
  );

  const sortedByGoals = useMemo(
    () => [...playerData].sort((a, b) => b.goals - a.goals),
    [playerData]
  );

  const sortedByRating = useMemo(
    () => [...playerData].sort((a, b) => b.rating - a.rating),
    [playerData]
  );

  const [selectedAward, setSelectedAward] = useState<"bestPlayer" "topScorer" "bestGoalkeeper">("bestPlayer");

  const handleSelectAward = (award: string) => {
    setSelectedAward(award);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonAwardCeremony.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonAwardCeremony.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonAwardCeremony.title")} />

      {/* 奖项选择 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Button
          variant={setSelectedAward === "bestPlayer" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectAward("bestPlayer")}
        >
          {t("seasonAwardCeremony.bestPlayer")}
        </Button>
        <Button
          variant={setSelectedAward === "topScorer" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectAward("topScorer")}
        >
          {t("seasonAwardCeremony.topScorer")}
        </Button>
        <Button
          variant={setSelectedAward === "bestGoalkeeper" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectAward("bestGoalkeeper")}
        >
          {t("seasonAwardCeremony.bestGoalkeeper")}
        </Button>
      </div>

      {/* 最佳球员 */}
      {setSelectedAward === "bestPlayer" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonAwardCeremony.bestPlayer")} />
          <p>{t("seasonAwardCeremony.awardedTo", { player: sortedByRating[0]?.name })}</p>
          <div className="mt-3">
            <div className="font-medium">Overall:</div>
            <div className="text-3xl text-primary">{sortedByRating[0]?.overall}★</div>
          </div>
          <div className="mt-3">
            <div className="font-medium">Potential:</div>
            <div className="text-3xl text-success">{sortedByRating[0]?.potential}★</div>
          </div>
        </Panel>
      )}

      {/* 射王 */}
      {setSelectedAward === "topScorer" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonAwardCeremony.topScorer")} />
          <p>{t("seasonAwardCeremony.awardedTo", { player: sortedByGoals[0]?.name })}</p>
          <div className="mt-3">
            <div className="font-medium">Goals:</div>
            <div>{sortedByGoals[0]?.goals}球</div>
          </div>
        </Panel>
      )}

      {/* 最佳门将 */}
      {setSelectedAward === "bestGoalkeeper" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonAwardCeremony.bestGoalkeeper")} />
          <p>{t("seasonAwardCeremony.awardedTo", { player: players[0]?.name })}</p>
          <div className="mt-3">
            <div className="font-medium">Save Rate:</div>
            <div>87%</div>
          </div>
        </Panel>
      )}

      {/* 颁奖典礼 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonAwardCeremony.ceremony")} />
        <p>{t("seasonAwardCeremony.ceremonyDate", { date: "2026-06-01" })}</p>
        <p>{t("seasonAwardCeremony.ceremonyLocation", { location: "球场中心圆形草地" })}</p>
        <p>{t("seasonAwardCeremony.ceremonyAttendees", { count: clubs.length })} 家俱乐部出席</p>
      </Panel>

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonAwardCeremony.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("seasonAwardCeremony.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("seasonAwardCeremony.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}