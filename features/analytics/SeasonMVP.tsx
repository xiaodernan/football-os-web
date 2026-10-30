import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonMVP() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

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
      rating: p.rating || 0,
      marketValue: p.marketValue || 0,
    }));
  }, [players]);

  const sortedByRating = useMemo(
    () => [...playerData].sort((a, b) => b.rating - a.rating),
    [playerData]
  );

  const sortedByGoals = useMemo(
    () => [...playerData].sort((a, b) => b.goals - a.goals),
    [playerData]
  );

  const sortedByValue = useMemo(
    () => [...playerData].sort((a, b) => b.marketValue - a.marketValue),
    [playerData]
  );

  const [selectedTab, setSelectedTab] = useState<"rating" "goals" "value">("rating");

  const handleSelectTab = (tab: string) => {
    setSelectedTab(tab);
  };

  if (!players.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonMVP.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonMVP.noPlayers")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonMVP.title")} />

      {/* 标签切换 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Button
          variant={setSelectedTab === "rating" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("rating")}
        >
          {t("seasonMVP.rating")}
        </Button>
        <Button
          variant={setSelectedTab === "goals" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("goals")}
        >
          {t("seasonMVP.goals")}
        </Button>
        <Button
          variant={setSelectedTab === "value" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("value")}
        >
          {t("seasonMVP.marketValue")}
        </Button>
      </div>

      {/* 评分榜 */}
      {setSelectedTab === "rating" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonMVP.ratingLeader")} />
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {sortedByRating.slice(0, 5).map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("seasonMVP.rank", { rank: sortedByRating.indexOf(p) + 1 })}:
                {t("seasonMVP.{name}", { name: p.name })} - {t("seasonMVP.rating", { rating: p.rating })}</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 进球榜 */}
      {setSelectedTab === "goals" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonMVP.topScorer")} />
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {sortedByGoals.slice(0, 5).map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("seasonMVP.rank", { rank: sortedByGoals.indexOf(p) + 1 })}:
                {t("seasonMVP.{name}", { name: p.name })} - {p.goals}球</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 身价榜 */}
      {setSelectedTab === "value" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonMVP.marketValueLeader")} />
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {sortedByValue.slice(0, 5).map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("seasonMVP.rank", { rank: sortedByValue.indexOf(p) + 1 })}:
                {t("seasonMVP.{name}", { name: p.name })} - {t("currency.euro", { amount: p.marketValue })}</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 季军详情 */}
      {selectedTab === "rating" && sortedByRating.length > 0 && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("seasonMVP.mvpDetail")} />
          const mvp = sortedByRating[0];

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("seasonMVP.name")}</div>
              <div className="text-2xl text-primary">{mvp.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("seasonMVP.position")}</div>
              <div>{mvp.position}</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonMVP.overall")}</div>
            <div className="text-3xl text-primary">{mvp.overall}★</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonMVP.potential")}</div>
            <div className="text-3xl text-success">{mvp.potential}★</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonMVP.gamesPlayed")}</div>
            <div>{mvp.gamesPlayed}场</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonMVP.goals")}</div>
            <div>{mvp.goals}球</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonMVP.assists")}</div>
            <div>{mvp.assists}助</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonMVP.marketValue")}</div>
            <div>{t("currency.euro", { amount: mvp.marketValue })}</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonMVP.rating")}</div>
            <div>{mvp.rating}/10</div>
          </div>
        </Panel>
      )}

      {/* 亚军和季军 */}
      {sortedByRating.length > 1 && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("seasonMVP.top3")} />
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            <li>
              {t("seasonMVP.first", {
                name: sortedByRating[0]?.name,
                rating: sortedByRating[0]?.rating,
              })} - 赛季最有价值球员
            </li>
            <li>
              {t("seasonMVP.second", {
                name: sortedByRating[1]?.name,
                rating: sortedByRating[1]?.rating,
              })} - 亚军</li>
            <li>
              {t("seasonMVP.third", {
                name: sortedByRating[2]?.name,
                rating: sortedByRating[2]?.rating,
              })} - 季军</li>
            </li>
          </ol>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonMVP.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("seasonMVP.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("seasonMVP.avgRating", {
            avg: (playerData.reduce((sum, p) => sum + p.rating, 0) / playerData.length).toFixed(1),
          })} 平均比赛评分</p>
        <p>
          {t("seasonMVP.topScorerGoals", {
            goals: sortedByGoals[0]?.goals,
          })} 赛季最佳射手进球数</p>
        <p>
          {t("seasonMVP.mostValuablePlayer", {
            player: sortedByValue[0]?.name,
            value: t("currency.euro", { amount: sortedByValue[0]?.marketValue }),
          })} 最有价值球员</p>
        </p>
      </Panel>
    </Panel>
  );
}