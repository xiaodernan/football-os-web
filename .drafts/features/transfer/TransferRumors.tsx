import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TransferRumors() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedView, setSelectedView] = useState<"active" | "completed">("active");

  const [selectedRumor, setSelectedRumor] = useState<string | null>(null);

  const rumors = useMemo(() => {
    const data = [];
    const statuses = ["active", "completed", "rejected"];
    const positions = ["门将", "后卫", "中场", "前锋"];
    const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

    for (let i = 0; i < 20; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const position = positions[Math.floor(Math.random() * positions.length)];
      const month = months[Math.floor(Math.random() * months.length)];
      const day = Math.floor(Math.random() * 28) + 1;
      const date = `${month} ${day}`;
      const fee = Math.floor(Math.random() * 100000000) + 10000000;
      const clubs = clubs.map(c => c.name);

      data.push({
        id: i,
        rumor: `传闻: ${position} ${t(`player.${i}`)}`,
        status,
        date,
        fee,
        fromClub: clubs[Math.floor(Math.random() * clubs.length)],
        toClub: clubs[Math.floor(Math.random() * clubs.length)],
      });
    }
    return data;
  }, [clubs]);

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const activeRumors = rumors.filter(r => r.status === "active");
  const completedRumors = rumors.filter(r => r.status === "completed");

  if (!rumors.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("transferRumors.title")} />
        <p className="text-muted-foreground mb-4">
          {t("transferRumors.noRumors")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("transferRumors.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "active" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("active")}
        >
          {t("transferRumors.active")}
        </Button>
        <Button
          variant={setSelectedView === "completed" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("completed")}
        >
          {t("transferRumors.completed")}
        </Button>
      </div>

      {/* 活跃传闻 */}
      {setSelectedView === "active" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("transferRumors.activeRumors")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("transferRumors.activeCount", { count: activeRumors.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {activeRumors.map(r => (
              <li key={r.id} className="font-medium text-primary mb-1">
                {t("transferRumors.{date}", { date: r.date })} - {t("transferRumors.{status}", { status: r.status })}:
                {t("transferRumors.from", { club: r.fromClub }}) → {t("transferRumors.to", { club: r.toClub })} - {t("transferRumors.fee", { fee: r.fee })}</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 已完成传闻 */}
      {setSelectedView === "completed" && (
        <Panel className="p-4">
          <SectionTitle title={t("transferRumors.completedRumors")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("transferRumors.completedCount", { count: completedRumors.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {completedRumors.map(r => (
              <li key={r.id} className="font-medium text-primary mb-1">
                {t("transferRumors.{date}", { date: r.date })} - {t("transferRumors.{status}", { status: r.status })}:
                {t("transferRumors.from", { club: r.fromClub }}) → {t("transferRumors.to", { club: r.toClub })} - {t("transferRumors.fee", { fee: r.fee })}</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 传闻详情 */}
      {selectedRumor && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("transferRumors.rumorDetail")} />
          const rumor = rumors.find(r => r.id === selectedRumor)!;
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("transferRumors.rumor")}</div>
              <div>{t("transferRumors.{rumor}", { rumor: rumored.rumor })}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("transferRumors.status")}</div>
              <div>{t("transferRumors.{status}", { status: rumor.status })}</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("transferRumors.date")}</div>
            <div>{t("transferRumors.{date}", { date: rumor.date })}</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("transferRumors.fromClub")}</div>
            <div>{t("transferRumors.{club}", { club: rumor.fromClub })}</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("transferRumors.toClub")}</div>
            <div>{t("transferRumors.{club}", { club: rumor.toClub })}</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("transferRumors.fee")}</div>
            <div>{t("transferRumors.fee", { fee: rumor.fee })}</div>
          </div>
        </Panel>
      )}

      {/* 传闻统计 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("transferRumors.statistics")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("transferRumors.totalRumors")}
            value={rumors.length}
            subtitle={t("transferRumors.marketActivity")}
          />
          <StatTile
            title={t("transferRumors.activeRumors")}
            value={activeRumors.length}
            subtitle={t("transferRumors.marketActive")}
            status={activeRumors.length > 0 ? "warning" : "success"}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t("transferRumors.marketSpeculation")}</p>
      </Panel>
    </Panel>
  );
}