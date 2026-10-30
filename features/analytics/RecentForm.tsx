import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function RecentForm() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      points: c.points || 0,
      played: c.matchesPlayed || 38,
      form: Math.round(((c.wins || 0) * 3 + (c.draws || 0)) / (c.matchesPlayed || 1) * 100),
      last5: [
        Math.random() > 0.5 ? "胜" : "负",
        Math.random() > 0.5 ? "胜" : "负",
        Math.random() > 0.5 ? "胜" : "负",
        Math.random() > 0.5 ? "平" : "负",
        Math.random() > 0.5 ? "胜" : "负",
      ],
    }));
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!selectedClub) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("recentForm.title")} />
        <p className="text-muted-foreground mb-4">
          {t("recentForm.selectClub")}
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

  const formRate = c.form;
  const last5 = c.last5;
  const won5 = last5.filter(result => result === "胜").length;
  const drawn5 = last5.filter(result => result === "平").length;
  const lost5 = last5.filter(result => result === "负").length;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("recentForm.title")} />

      {/* 选中的俱乐部 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">{c.name}</div>
          <div className="text-2xl text-primary">{c.overall || 0}★</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div className="font-medium">{c.position}名</div>
          <div className="text-primary">{c.points}分</div>
        </div>
      </div>

      {/* 近期状态 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("recentForm.recentForm")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("recentForm.formRate")}
            value={`${formRate}%`}
            subtitle={t("recentForm.formPercentage")}
            status={formRate >= 70 ? "success" : formRate >= 50 ? "warning" : "danger"}
          />
          <StatTile
            title={t("recentForm.last5")}
            value={`${won5}胜 ${drawn5}平 ${lost5}负`}
            subtitle={t("recentForm.outOf5")}
          />
        </div>
      </Panel>

      {/* 胜负平趋势 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("recentForm.trend")} />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium text-primary">{t("recentForm.wins")}</div>
            <div>{won5}</div>
            <div className="text-primary text-xs">{t("recentForm.outOf5", { of: 5 })}</div>
          </div>
          <div>
            <div className="font-medium text-warning">{t("recentForm.draws")}</div>
            <div>{drawn5}</div>
            <div className="text-warning text-xs">{t("recentForm.outOf5", { of: 5 })}</div>
          </div>
          <div>
            <div className="font-medium text-danger">{t("recentForm.losses")}</div>
            <div>{lost5}</div>
            <div className="text-danger text-xs">{t("recentForm.outOf5", { of: 5 })}</div>
          </div>
        </div>
      </Panel>

      {/* 状态标签 */}
      <Panel className="p-4">
        <SectionTitle title={t("recentForm.status")} />
        <div className="grid grid-cols-3 gap-2">
          {[["胜", "primary"], ["平", "warning"], ["负", "danger"]].map(([label, color]) => {
            const count = last5.filter(item => item === label).length;
            return (
              <div key={label} className={`p-2 rounded text-sm ${color}-200 ${color}-600 text-${color}-800}`}>
                {label}: {count}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* 对手分析 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("recentForm.opponentAnalysis")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("recentForm.nextMatches", { matches: 5 })}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>{t("recentForm.upcoming1")}</li>
          <li>{t("recentForm.upcoming2")}</li>
          <li>{t("recentForm.upcoming3")}</li>
          <li>{t("recentForm.upcoming4")}</li>
          <li>{t("recentForm.upcoming5")}</li>
        </ul>
      </Panel>
    </Panel>
  );
}