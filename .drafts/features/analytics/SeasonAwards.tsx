import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonAwards() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedView, setSelectedView] = useState<"top" | "goalkeeper">("top");

  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

  // 赛季统计数据
  const playerStats = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
      goals: p.goals || 0,
      assists: p.assists || 0,
      appearances: p.matchesPlayed || 0,
    }));
  }, [players]);

  const clubStats = useMemo(() => {
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
      cleanSheets: c.cleanSheets || 0,
    }));
  }, [clubs]);

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const [selectedTab, setSelectedTab] = useState<"player" | "club">("player");

  const handleSelectTab = (tab: string) => {
    setSelectedTab(tab);
  };

  if (!players.length && !clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonAwards.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonAwards.noData")}
        </p>
      </Panel>
    );
  }

  // 射手榜
  const topScorers = useMemo(() => {
    return [...playerStats]
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10)
      .map((p, i) => ({
        rank: i + 1,
        name: p.name,
        goals: p.goals,
        assists: p.assists,
        team: t(`team.${Math.floor(Math.random() * 20 + 1)}`),
      }));
  }, [playerStats]);

  const bestGoalkeeper = useMemo(() => {
    const keepers = playerStats.filter(p => p.position === "门将");
    return keepers.length > 0
      ? keepers.sort((a, b) => (b.cleanSheets || 0) - (a.cleanSheets || 0))[0]
      : null;
  }, [playerStats]);

  const clubWithMostCleanSheets = useMemo(() => {
    return clubStats.length > 0
      ? clubStats.sort((a, b) => b.cleanSheets - a.cleanSheets)[0]
      : null;
  }, [clubStats]);

  const leagueTopScorers = useMemo(() => {
    return [...playerStats]
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 5);
  }, [playerStats]);

  const handleSelectTab = (tab: string) => {
    setSelectedTab(tab);
  };

  if (selectedView === "top") {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonAwards.title")} />

        {/* 射手榜 */}
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonAwards.topScorers")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("seasonAwards.goldenBoot", { count: playerStats.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {topScorers.map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("seasonAwards.rank", { rank: p.rank })}:
                {t("seasonAwards.{name}", { name: p.name })} - {p.goals}球
              </li>
            ))}
          </ol>
        </Panel>

        {/* 最佳门将 */}
        {bestGoalkeeper && (
          <Panel className="p-4 mb-6">
            <SectionTitle title={t("seasonAwards.bestGoalkeeper")} />
            <p>{t("seasonAwards.bestGoalkeeperName", { name: bestGoalkeeper.name })}</p>
            <p>{t("seasonAwards.goalkeeperApps", { apps: bestGoalkeeper.appearances })}</p>
            <p>{t("seasonAwards.goalkeeperCS", { cs: bestGoalkeeper.cleanSheets })}</p>
          </Panel>
        )}

        {/* 俱乐部最佳门将 */}
        {clubWithMostCleanSheets && (
          <Panel className="p-4">
            <SectionTitle title={t("seasonAwards.bestClubGoalkeeper")} />
            <p>{t("seasonAwards.clubWithMostCS", { club: clubWithMostCleanSheets.name })}</p>
            <p>{t("seasonAwards.csCount", { count: clubWithMostCleanSheets.cleanSheets })}</p>
          </Panel>
        )}

        {/* 积分榜 */}
        <Panel className="p-4">
          <SectionTitle title={t("seasonAwards.leagueTitle")} />
          <p>{t("seasonAwards.champions", { club: clubs[0]?.name || '' })}</p>
          <p>{t("seasonAwards.runnerUp", { club: clubs[1]?.name || '' })}</p>
          <p>{t("seasonAwards.third", { club: clubs[2]?.name || '' })}</p>
        </Panel>
      </Panel>
    );
  }

  {selectedView === "goalkeeper" && (
    <Panel className="p-6">
      <SectionTitle title={t("seasonAwards.title")} />

      {/* 门将奖项 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonAwards.goalkeeperAwards")} />
        {bestGoalkeeper && (
          <div>
            <p>{t("seasonAwards.bestGoalkeeper", { name: bestGoalkeeper.name })}</p>
            <p>{t("seasonAwards.goalkeeperApps", { apps: bestGoalkeeper.appearances })}</p>
            <p>{t("seasonAwards.goalkeeperCS", { cs: bestGoalkeeper.cleanSheets })}</p>
          </div>
        )}
        {!bestGoalkeeper && (
          <p>{t("seasonAwards.noGoalkeepers")}</p>
        )}
      </Panel>

      {/* 俱乐部数据 */}
      <Panel className="p-4">
        <SectionTitle title={t("seasonAwards.clubStats")} />
        {clubWithMostCleanSheets && (
          <div>
            <p>{t("seasonAwards.clubWithMostCS", { club: clubWithMostCleanSheets.name })}</p>
            <p>{t("seasonAwards.csCount", { count: clubWithMostCleanSheets.cleanSheets })}</p>
          </div>
        )}
        <p>{t("seasonAwards.totalTeams", { count: clubs.length })}</p>
      </Panel>
    </Panel>
  )}

  {/* 选中的球员/俱乐部详情 */}
  {selectedEntity && (
    <Panel className="p-4 mt-6">
      <SectionTitle title={t("seasonAwards.entityDetail")} />
      const entityType = selectedTab === "player" ? "球员" : "俱乐部";
      const entity = selectedTab === "player"
        ? playerStats.find(p => p.id === selectedEntity)
        : clubStats.find(c => c.id === selectedEntity);

      if (entity) {
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium text-primary">{t("seasonAwards.name")}</div>
            <div className="text-2xl text-primary">{entity.name}</div>
          </div>
          <div>
            <div className="font-medium text-primary">{t("seasonAwards.type")}</div>
            <div>{selectedTab === "player" ? `${entity.position} ${entity.age}岁` : entity.name}</div>
          </div>
        </div>

        <div className="mt-3">
          {selectedTab === "player" ? (
            <div>
              <div className="font-medium">{t("seasonAwards.goals")}</div>
              <div>{entity?.goals || 0}球</div>
            </div>
            <div>
              <div className="font-medium">{t("seasonAwards.assists")}</div>
              <div>{entity?.assists || 0}次</div>
            </div>
            <div>
              <div className="font-medium">{t("seasonAwards.appearances")}</div>
              <div>{entity?.appearances || 0}场</div>
            </div>
          ) : (
            <div>
              <div className="font-medium">{t("seasonAwards.points")}</div>
              <div>{entity?.points || 0}分</div>
            </div>
            <div>
              <div className="font-medium">{t("seasonAwards.cleanSheets")}</div>
              <div>{entity?.cleanSheets || 0}次</div>
            </div>
          )}
        </div>
      }
    </Panel>
  )}

  {/* 控制面板 */}
  <Panel className="p-4">
    <SectionTitle title={t("seasonAwards.filter")} />
    <div className="grid grid-cols-2 gap-3">
      <Button
        variant={setSelectedView === "top" ? "primary" : "outline"}
        size="sm"
        onClick={() => setSelectedView("top")}
      >
        {t("seasonAwards.topScorersView")}
      </Button>
      <Button
        variant={setSelectedView === "goalkeeper" ? "primary" : "outline"}
        size="sm"
        onClick={() => setSelectedView("goalkeeper")}
      >
        {t("seasonAwards.goalkeeperView")}
      </Button>
    </div>
    <div className="grid grid-cols-2 gap-3 mt-3">
      <Button
        variant={setSelectedTab === "player" ? "primary" : "outline"}
        size="sm"
        onClick={() => handleSelectTab("player")}
      >
        {t("seasonAwards.playerTab")}
      </Button>
      <Button
        variant={setSelectedTab === "club" ? "primary" : "outline"}
        size="sm"
        onClick={() => handleSelectTab("club")}
      >
        {t("seasonAwards.clubTab")}
      </Button>
    </div>
  </Panel>