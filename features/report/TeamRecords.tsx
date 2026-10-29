import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TeamRecords() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      mostGoalsGame: Math.floor(Math.random() * 10) + 7,
      longestWinStreak: Math.floor(Math.random() * 15) + 5,
      unbeatenRun: Math.floor(Math.random() * 20) + 10,
      biggestWin: Math.random() > 0.5 ? "5-0" : "4-0",
      biggestLoss: Math.random() > 0.5 ? "0-5" : "0-4",
      yearsInTopFlight: Math.floor(Math.random() * 100) + 100,
    }));
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!selectedClub) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("teamRecords.title") } />
        <p className="text-muted-foreground mb-4">
          {t("teamRecords.selectClub")}
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
      </Panel>
    );
  }

  const c = clubData.find(club => club.id === selectedClub)!;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("teamRecords.title") } />

      {/* 俱乐部画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("teamRecords.clubInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("teamRecords.name")}</div>
              <div className="text-2xl font-bold text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("teamRecords.yearsInTopFlight")}</div>
              <div>{c.yearsInTopFlight}年</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("teamRecords.keyRecords") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("teamRecords.mostGoalsGame")}</div>
              <div>{c.mostGoalsGame}球</div>
            </div>
            <div>
              <div className="font-medium">{t("teamRecords.longestWinStreak")}</div>
              <div>{c.longestWinStreak}场不败</div>
            </div>
          </div>
          <div>
            <div className="font-medium">{t("teamRecords.unbeatenRun")}</div>
            <div>{c.unbeatenRun}场不败</div>
          </div>
        </div>
      </div>

      {/* 纪录详情 */}
      <Panel className="p-4">
        <SectionTitle title={t("teamRecords.recordDetails") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("teamRecords.biggestWin")}</div>
            <div>{c.biggestWin}</div>
          </div>
          <div>
            <div className="font-medium">{t("teamRecords.biggestLoss")}</div>
            <div>{c.biggestLoss}</div>
          </div>
        </div>
      </Panel>
    </Panel>
  );
}