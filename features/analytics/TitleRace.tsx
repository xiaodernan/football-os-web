import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TitleRace() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedView, setSelectedView] = useState<"current" | "remaining">("current");

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      points: c.points || 0,
      played: c.matchesPlayed || 38,
      goalDifference: (c.goalsFor || 0) - (c.goalsAgainst || 0),
    }));
  }, [clubs]);

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  // 按积分排序
  const sortedClubs = [...clubData].sort((a, b) => (b.points || 0) - (a.points || 0));

  // 前四名争冠集团
  const titleGroup = sortedClubs.slice(0, 4);
  // 中游集团
  const middleGroup = sortedClubs.slice(4, 10);
  // 保级集团
  const relegationGroup = sortedClubs.slice(17, 20);

  // 计算领头羊
  const leader = titleGroup[0];
  // 计算积分差距
  const gaps = titleGroup.map((club, index) => ({
    club,
    gap: (leader.points || 0) - (club.points || 0),
  }));

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  if (!clubData.some(c => c.position <= 4)) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("titleRace.title")} />
        <p className="text-muted-foreground mb-4">
          {t("titleRace.noTitleContenders")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {clubs.map(c => (
            <Button
              key={c.id}
              variant="outline"
              size="sm"
              onClick={() => {}}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("titleRace.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "current" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("current")}
        >
          {t("titleRace.currentSeason")}
        </Button>
        <Button
          variant={setSelectedView === "remaining" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("remaining")}
        >
          {t("titleRace.remainingFixtures")}
        </Button>
      </div>

      {/* 争冠组 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("titleRace.titleGroup", { group: t("titleRace.titleGroup") })} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("titleRace.titleGroupDesc")}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-primary">
          {gaps.map(item => (
            <li key={item.club.id}>
              {t(`titleRace.position${item.club.position}`, {
                position: item.club.position,
              })} - {item.club.name}: {item.club.points}分
              {t("titleRace.gap", { gap: item.gap })}</li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-2">
          {t("titleRace.leader", { leader: leader.name })}</p>
      </Panel>

      {/* 中游分析 */}
      {setSelectedView === "remaining" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("titleRace.middleGroup", { group: t("titleRace.middleGroup") })} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("titleRace.middleGroupDesc")}</p>
          <ul className="list-disc list-inside space-y-2 text-sm text-warning">
            {middleGroup.map(c => (
              <li key={c.id} className="font-medium text-warning">
                {c.position}位 - {c.name} ({c.points}分)</li>
            ))}
          </ul>
        </Panel>
      )}

      {/* 保级分析 */}
      {setSelectedView === "remaining" && (
        <Panel className="p-4">
          <SectionTitle title={t("titleRace.relegationGroup", { group: t("titleRace.relegationGroup") })} />
          <p className="text-sm text-danger mb-3">
            {t("titleRace.relegationGroupDesc")}</p>
          <ul className="list-disc list-inside space-y-2 text-sm text-danger">
            {relegationGroup.map(c => (
              <li key={c.id} className="font-medium text-danger">
                {c.position}位 - {c.name} ({c.points}分)</li>
            ))}
          </ul>
        </Panel>
      )}

      {/* 积分差距可视化 */}
      <Panel className="p-4">
        <SectionTitle title={t("titleRace.gapVisualization")} />
        <div className="grid grid-cols-2 gap-3">
          {gaps.map(item => (
            <div key={item.club.id} className="border rounded p-3 text-center">
              <div className="font-medium text-primary">{item.club.name}</div>
              <div className="text-2xl font-bold text-primary">{item.club.points}分</div>
              <div className="text-sm text-muted-foreground">{t("titleRace.gapToLeader", { gap: item.gap })}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 争冠形势 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("titleRace.situation")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("titleRace.leaderStatus", { leader: leader.name })}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>{t("titleRace.hasMathematical Chance")}</li>
          <li>{t("titleRace.remainedGames", { games: 38 - (leader.played || 0) })}</li>
          <li>{t("titleRace.pointGap", { gap: gaps[1]?.gap || 0 })}</li>
        </ul>
        <p className="text-xs text-primary mt-2">
          {t("titleRace.nextRoundNote", { round: "下一轮" })}</p>
      </Panel>
    </Panel>
  );
}