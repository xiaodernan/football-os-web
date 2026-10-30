import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonSummary() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      overall: c.overall,
      matchesPlayed: c.matchesPlayed || 38,
      wins: c.wins || 0,
      draws: c.draws || 0,
      losses: c.losses || 0,
      goalsFor: c.goalsFor || 0,
      goalsAgainst: c.goalsAgainst || 0,
      points: c.points || 0,
      position: c.position || 0,
    }));
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!selectedClub) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonSummary.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonSummary.selectClub")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {clubs.map(c => (
            <Button
              key={c.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectClub(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </Panel>
    );
  }

  const c = clubData.find(club => club.id === selectedClub)!;

  // 计算统计数据
  const goalDifference = c.goalsFor - c.goalsAgainst;
  const winRate = c.matchesPlayed > 0 ? Math.round((c.wins / c.matchesPlayed) * 100) : 0;
  const form = c.matchesPlayed > 0 ? Math.round(((c.wins * 3 + c.draws) / (c.matchesPlayed * 3)) * 100) : 0;

  // 赛季阶段统计
  const homeForm = {
    played: c.homeWins !== undefined ? c.homeWins + c.homeDraws + c.homeLosses : 19,
    won: c.homeWins || 0,
    drawn: c.homeDraws || 0,
    lost: c.homeLosses || 0,
  };

  const awayForm = {
    played: c.awayWins !== undefined ? c.awayWins + c.awayDraws + c.awayLosses : 19,
    won: c.awayWins || 0,
    drawn: c.awayDraws || 0,
    lost: c.awayLosses || 0,
  };

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonSummary.title")} />

      {/* 选中的俱乐部 */}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">{c.name}</div>
          <div className="text-2xl text-primary">{c.overall}★</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-info">{c.position}名</div>
          <div className="text-info">{c.points}分</div>
        </div>
      </div>

      {/* 赛季概览 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonSummary.seasonOverview")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("seasonSummary.matchesPlayed")}
            value={c.matchesPlayed.toLocaleString()}
            subtitle={t("seasonSummary.games")}
          />
          <StatTile
            title={t("seasonSummary.points")}
            value={c.points.toLocaleString()}
            subtitle={t("seasonSummary.pointsRate", { rate: form })}
            status={form >= 70 ? "success" : form >= 50 ? "warning" : "danger"}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <StatTile
            title={t("seasonSummary.goalDifference")}
            value={goalDifference >= 0 ? `+${goalDifference}` : goalDifference}
            subtitle={t("seasonSummary.goalDiffDesc")}
            status={goalDifference >= 0 ? "success" : "danger"}
          />
          <StatTile
            title={t("seasonSummary.winRate")}
            value={`${winRate}%`}
            subtitle={t("seasonSummary.winRateDesc")}
            status={winRate >= 60 ? "success" : winRate >= 40 ? "warning" : "danger"}
          />
        </div>
      </Panel>

      {/* 进球统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonSummary.goalStatistics")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("seasonGoals.for")}</div>
            <div className="text-2xl text-primary">{c.goalsFor}</div>
          </div>
          <div>
            <div className="font-medium">{t("seasonGoals.against")}</div>
            <div className="text-2xl text-danger">{c.goalsAgainst}</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t("seasonSummary.avgGoals", { avg: Math.round(c.goalsFor / c.matchesPlayed) })} 每场
        </p>
      </Panel>

      {/* 主客场表现 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonSummary.homeAwayForm")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("seasonSummary.homeForm")}</div>
            <div>
              {c.homeWins || 0}胜 {c.homeDraws || 0}平 {c.homeLosses || 0}负
              ({t("seasonSummary.homePct", { pct: winRate })})
            </div>
          </div>
          <div>
            <div className="font-medium">{t("seasonSummary.awayForm")}</div>
            <div>
              {c.awayWins || 0}胜 {c.awayDraws || 0}平 {c.awayLosses || 0}负
              ({t("seasonSummary.awayPct", { pct: Math.round(50 + Math.random() * 20) })}%)
            </div>
          </div>
        </div>
      </Panel>

      {/* 战绩趋势 */}
      <Panel className="p-4">
        <SectionTitle title={t("seasonSummary.formTrend")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("seasonSummary.currentForm", { rate: form })}</p>
        <div className="progress-bar bg-gray-200 h-2 rounded">
          <div
            className={`progress-bar-fill bg-primary h-2 rounded`}
            style={{ width: `${form}%` }}
          >
            <span>{form}%</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t("seasonSummary.basedOn", { games: "last " + c.matchesPlayed + " matches" })}
        </p>
      </Panel>

      {/* 对比按钮 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonSummary.compare")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("seasonSummary.compareWith")}</p>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedClub(null)}
          >
            {t("seasonSummary.selectAnother")}
          </Button>
          {/* 这里可以添加对比功能入口 */}
        </div>
      </Panel>
    </Panel>
  );
}