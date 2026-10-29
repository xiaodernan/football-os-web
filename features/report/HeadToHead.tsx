import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function HeadToHead() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClubs(prev => {
      if (prev.includes(clubId)) {
        return prev.filter(id => id !== clubId);
      } else {
        return [...prev, clubId].slice(0, 2); // 最多选2支球队
      }
    });
  };

  if (selectedClubs.length < 2) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("headToHead.title") } />
        <p className="text-muted-foreground mb-4">
          {t("headToHead.selectTwoClubs")}
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
          ))
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t("headToHead.selectTwoClubs")}
        </p>
      </Panel>
    );
  }

  const c1 = clubData.find(club => club.id === selectedClubs[0])!;
  const c2 = clubData.find(club => club.id === selectedClubs[1])!;

  // 交锋历史数据
  const headToHead = useMemo(() => ({
    totalMatches: Math.floor(Math.random() * 30) + 20,
    homeWins: Math.floor(Math.random() * 15) + 5,
    awayWins: Math.floor(Math.random() * 15) + 5,
    draws: Math.floor(Math.random() * 10) + 5,
    c1Goals: Math.floor(Math.random() * 40) + 30,
    c2Goals: Math.floor(Math.random() * 40) + 30,
  }), []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("headToHead.title") } />

      {/* 选中的球队 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">{c1.name}</div>
          <div className="text-2xl text-primary">{c1.overall}★</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-info">{c2.name}</div>
          <div className="text-2xl text-info">{c2.overall}★</div>
        </div>
      </div>

      {/* 交锋统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("headToHead.statistics") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("headToHead.matches")}</div>
            <div>{headToHead.totalMatches}</div>
          </div>
          <div>
            <div className="font-medium">{t("headToHead.homeWins")}</div>
            <div>{headToHead.homeWins}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("headToHead.awayWins")}</div>
            <div>{headToHead.awayWins}</div>
          </div>
          <div>
            <div className="font-medium">{t("headToHead.draws")}</div>
            <div>{headToHead.draws}</div>
          </div>
        </div>
      </Panel>

      {/* 进球统计 */}
      <Panel className="p-4">
        <SectionTitle title={t("headToHead.goals") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("headToHead.c1Goals")}</div>
            <div>{headToHead.c1Goals}</div>
          </div>
          <div>
            <div className="font-medium">{t("headToHead.c2Goals")}</div>
            <div>{headToHead.c2Goals}</div>
          </div>
        </div>
      </Panel>

      {/* 历史交锋结果 */}
      <Panel className="p-4">
        <SectionTitle title={t("headToHead.history") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("headToHead.totalMatches", { matches: headToHead.totalMatches })}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>{t("headToHead.c1Wins", { wins: headToHead.homeWins })}</li>
          <li>{t("headToHead.c2Wins", { wins: headToHead.awayWins })}</li>
          <li>{t("headToHead.draws", { draws: headToHead.draws })}</li>
        </ul>
      </Panel>
    </Panel>
  );
}