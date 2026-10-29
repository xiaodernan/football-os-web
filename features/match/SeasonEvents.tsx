import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonEvents() {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();

  // 模拟赛季事件数据
  const events = useMemo(() => ([
    { id: "1", minute: 5, type: "goal", team: "主队", player: "前锋A", detail: "点球进球" },
    { id: "2", minute: 12, type: "shot", team: "客队", player: "前锋B", detail: "禁区外射门偏出" },
    { id: "3", minute: 23, type: "yellow", team: "主队", player: "中场C", detail: "战术犯规" },
    { id: "4", minute: 35, type: "save", team: "主队门将", player: "门将1", detail: "扑出必进球" },
    { id: "5", minute: 45+2, type: "goal", team: "客队", player: "前锋D", detail: "头球破门" },
    { id: "6", minute: 52, type: "substitution", team: "主队", player: "下场: 前锋E", detail: "战术调整" },
    { id: "7", minute: 67, type: "goal", team: "主队", player: "前锋F", detail: "反击得分" },
    { id: "8", minute: 75, type: "red", team: "客队", player: "后卫G", detail: "最后一人阻挡" },
    { id: "9", minute: 82, type: "shot", team: "客队", player: "前锋H", detail: "远射击中立柱" },
    { id: "10", minute: 90+3, type: "goal", team: "主队", player: "前锋I", detail: "绝杀进球" },
  ] as const));

  const [filteredEvents] = useMemo(() => ({
    goals: events.filter(e => e.type === "goal"),
    shots: events.filter(e => e.type === "shot"),
    cards: events.filter(e => e.type === "yellow" || e.type === "red"),
    saves: events.filter(e => e.type === "save"),
  }), [events]);

  const goalCount = filteredEvents.goals.length;
  const shotCount = filteredEvents.shots.length;
  const cardCount = filteredEvents.cards.length;
  const saveCount = filteredEvents.saves.length;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonEvents.title") } />

      {/* 事件统计概览 */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatTile
          title={t("seasonEvents.goals")}
          value={goalCount.toLocaleString()}
          subtitle={t("seasonEvents.totalGoals")}
          variant={goalCount > 0 ? "primary" : "default"}
        />
        <StatTile
          title={t("seasonEvents.shots")}
          value={shotCount.toLocaleString()}
          subtitle={t("seasonEvents.totalShots")}
        />
        <StatTile
          title={t("seasonEvents.cards")}
          value={cardCount.toLocaleString()}
          subtitle={t("seasonEvents.totalCards")}
          variant={cardCount > 0 ? "warning" : "default"}
        />
        <StatTile
          title={t("seasonEvents.saves")}
          value={saveCount.toLocaleString()}
          subtitle={t("seasonEvents.totalSaves")}
        />
      </div>

      {/* 事件时间线 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonEvents.eventTimeline") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("seasonEvents.minuteFormat", { minute: currentMinute }) }
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr>
                <th className="text-left p-3 border border-gray-200">{t("seasonEvents.minute")}</th>
                <th className="text-left p-3 border border-gray-200">{t("seasonEvents.type")}</th>
                <th className="text-left p-3 border border-gray-200">{t("seasonEvents.team")}</th>
                <th className="text-left p-3 border border-gray-200">{t("seasonEvents.player")}</th>
                <th className="text-left p-3 border border-gray-200">{t("seasonEvents.detail")}</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id} className="border-b">
                  <td className="p-3 font-medium text-primary">{event.minute}'</td>
                  <td className="p-3">
                    {t(`event.type.${event.type}`)}
                  </td>
                  <td className="p-3 font-medium ${event.team === "主队" ? "text-primary" : "text-info"}>
                    {event.team}
                  </td>
                  <td className="p-3 font-medium">{event.player}</td>
                  <td className="p-3 text-xs text-muted-foreground">{event.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* 事件类型分布 */}
      <Panel className="p-4">
        <SectionTitle title={t("seasonEvents.eventDistribution") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("seasonEvents.goalCount")}</div>
            <div className="text-2xl font-bold text-green-600">{goalCount}</div>
          </div>
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("seasonEvents.shotCount")}</div>
            <div className="text-2xl font-bold text-primary">{shotCount}</div>
          </div>
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("seasonEvents.cardCount")}</div>
            <div className="text-2xl font-bold text-red-600">{cardCount}</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="font-medium text-sm text-muted-foreground">{t("seasonEvents.saveCount")}</div>
          <div className="text-2xl font-bold text-blue-600">{saveCount}</div>
        </div>
      </Panel>

      {/* 关键时刻 */}
      {goalCount > 0 && (
        <Panel className="p-4 mt-6 bg-green-50">
          <SectionTitle title={t("seasonEvents.keyMoments") } />
          <p className="text-green-600 mb-2">
            {t("seasonEvents.{goalCount}Goals", { goalCount }) }
          </p>
          <ul className="list-disc list-inside space-y-1">
            {filteredEvents.goals.map((event, index) => (
              <li key={event.id} className="text-green-600">
                {t(`event.minute`, { minute: event.minute })} {t(`event.type.goal`)} - {event.player}: {event.detail}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {shotCount > 0 && (
        <Panel className="p-4 mt-6 bg-blue-50">
          <SectionTitle title={t("seasonEvents.shotAnalysis") } />
          <p className="text-blue-600 mb-2">
            {t("seasonEvents.{shotCount}Shots", { shotCount }) }
          </p>
          <ul className="list-disc list-inside space-y-1">
            {filteredEvents.shots.map((event, index) => (
              <li key={event.id} className="text-primary">
                {t(`event.minute`, { minute: event.minute })} {t(`event.type.shot`)} - {event.player}: {event.detail}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </Panel>
  );
}