import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonSchedule() {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();

  // 模拟赛季赛程数据
  const matches = useMemo(() => ([
    { id: "1", homeTeam: "队伍A", awayTeam: "队伍B", date: `${currentYear}-08-08`, time: "19:30", status: "completed" },
    { id: "2", homeTeam: "队伍C", awayTeam: "队伍D", date: `${currentYear}-08-10`, time: "14:00", status: "scheduled" },
    { id: "3", homeTeam: "队伍E", awayTeam: "队伍F", date: `${currentYear}-08-12`, time: "20:00", status: "scheduled" },
    { id: "4", homeTeam: "队伍G", awayTeam: "队伍H", date: `${currentYear}-08-15`, time: "18:00", status: "upcoming" },
    { id: "5", homeTeam: "队伍I", awayTeam: "队伍J", date: `${currentYear}-08-18`, time: "16:00", status: "upcoming" },
  ] as const));

  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  const matchStatus = match => {
    if (match.status === "completed") return t("match.completed");
    if (match.status === "scheduled") return t("match.scheduled");
    return t("match.upcoming");
  };

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatch(matchId);
  };

  if (!selectedMatch) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("match.scheduleTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("match.selectMatchForDetails")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {matches.map(m => (
            <Button
              key={m.id}
              variant={m.status === "completed" ? "outline" : "text"}
              size="sm"
              onClick={() => handleSelectMatch(m.id)}
            >
              {t(`team.${m.homeTeam}`)} vs {t(`team.${m.awayTeam}`)} - {t(`date.${m.date.split("-")[1]}`)}
            </Button>
          ))}
        </div>
      </Panel>
    );
  }

  const match = matches.find(m => m.id === selectedMatch)!;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("match.scheduleTitle")} />

      {/* 赛事详情 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("match.teams")} />
          <div className="text-2xl font-bold mb-2">
            {t(`team.${match.homeTeam}`)} vs {t(`team.${match.awayTeam}`)}
          </div>
          <div className="text-muted-foreground">
            {t(`date.${match.date.split("-")[1] + "月" + match.date.split("-")[2] + "日"}`)}
          </div>
          <div className="text-muted-foreground">
            {t(`time.${match.time.split(":")[1] + ":00"}`)}
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("match.status")} />
          <div className={`p-3 rounded ${
            match.status === "completed" ? "bg-green-100 text-green-600" :
            match.status === "scheduled" ? "bg-blue-100 text-blue-600" :
            "bg-yellow-100 text-yellow-600"
          }`}>
            {t(`status.${match.status}`)}
          </div>
        </Panel>
      </div>

      {/* 比赛详情 */}
      <Panel className="p-4">
        <SectionTitle title={t("match.matchDetails")} />
        <p className="text-sm text-muted-foreground">
          {t("match.matchInfo", { 
            home: t(`team.${match.homeTeam}`),
            away: t(`team.${match.awayTeam}`),
            date: match.date,
            time: match.time
          })}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedMatch(null)}
        >
          {t("match.backToSchedule")}
        </Button>
      </Panel>
    </Panel>
  );
}