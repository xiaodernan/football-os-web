import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TeamNews() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const [selectedView, setSelectedView] = useState<"latest" | "byClub">("latest");

  const newsData = useMemo(() => {
    const statuses = ["胜利", "平局", "失利", "转会", "伤病", "庆典"];
    const titles = [];
    const contents = [];
    const clubNames = clubs.map(c => c.name);
    const date = new Date();
    
    for (let i = 0; i < 30; i++) {
      const day = date.getDate() - Math.floor(Math.random() * 30);
      const month = date.getMonth() + 1;
      const content = `新闻内容 ${i + 1}: ${clubs[Math.floor(Math.random() * clubs.length)].name} ${statuses[Math.floor(Math.random() * statuses.length)]}`;
      titles.push(`新闻标题 ${i + 1}`);
      contents.push(content);
    }
    return { titles, contents };
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("teamNews.title")} />
        <p className="text-muted-foreground mb-4">
          {t("teamNews.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("teamNews.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "latest" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("latest")}
        >
          {t("teamNews.latest")}
        </Button>
        <Button
          variant={setSelectedView === "byClub" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("byClub")}
        >
          {t("teamNews.byClub")}
        </Button>
      </div>

      {/* 最新新闻 */}
      {setSelectedView === "latest" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("teamNews.latestNews")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("teamNews.totalNews", { count: newsData.titles.length })}</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {newsData.titles.map((title, i) => (
              <li key={i} className="font-medium text-primary cursor-pointer hover:text-primary">
                {title}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* 按俱乐部新闻 */}
      {setSelectedView === "byClub" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("teamNews.clubNews")} />
          const club = clubs.find(c => c.id === selectedClub)!;
          <p className="text-sm text-muted-foreground mb-3">
            {t("teamNews.{name}News", { name: club.name })}</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {newsData.titles.map((title, i) => (
              <li key={i} className="font-medium text-primary cursor-pointer hover:text-primary">
                {title}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* 所有俱乐部新闻 */}
      {setSelectedView === "byClub" && !selectedClub && (
        <Panel className="p-4">
          <SectionTitle title={t("teamNews.allClubsNews")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("teamNews.selectClub")}</p>
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
      )}

      {/* 新闻详情 */}
      {/* 这里可以展开新闻详情面板 */

      {/* 俱乐部详情 */}
      {selectedClub && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("teamNews.clubDetail")} />
          const club = clubs.find(c => c.id === selectedClub)!;
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("teamNews.name")}</div>
              <div className="text-2xl text-primary">{club.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("teamNews.position")}</div>
              <div>{club.position}位</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("teamNews.recentNewsCount")}</div>
            <div>{newsData.titles.length} 条近期新闻</div>
          </div>
        </Panel>
      )}

      {/* 统计 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("teamNews.stats")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("teamNews.totalNews")}
            value={newsData.titles.length}
            subtitle={t("teamNews.allClubs")}
          />
          <StatTile
            title={t("teamNews.lastUpdate")}
            value={new Date().toLocaleDateString()}
            subtitle={t("teamNews.today")}
          />
        </div>
      </Panel>
    </Panel>
  );
}