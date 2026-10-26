import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, EmptyState, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCoachEntries, saveCoachEntry, calculateCoachStats, CoachCareerEntry, CoachCareerProfile } from "@/domain/coachCareer";

export function CoachProfile() {
  const { t } = useI18n();
  const coachId = useMemo(() => localStorage.getItem("coach_id") || "default", []);
  const entries = useMemo(() => getCoachEntries(coachId), [coachId]);
  const stats = useMemo(() => calculateCoachStats(entries), [entries]);

  // 切换公开状态
  const togglePublic = (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      entry.isPublic = !entry.isPublic;
      saveCoachEntry(entry);
    }
  };

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <SectionTitle title={t("coach.coachProfileTitle")} />
        
        {/* 教练统计概览 */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile
            title={t("coach.totalSessions")}
            value={stats.totalSessions.toLocaleString()}
            subtitle={t("coach.sessions")}
          />
          <StatTile
            title={t("coach.totalHours")}
            value={stats.totalHours.toLocaleString()}
            subtitle={t("coach.hours")}
          />
          <StatTile
            title={t("coach.categories")}
            value={Object.keys(stats.categories).length > 0 ? Object.keys(stats.categories).length : "0"}
            subtitle={t("coach.categoryTypes")}
          />
          <StatTile
            title={t("coach.badges")}
            value={stats.badges.length > 0 ? stats.badges.join(", ") : t("coach.noBadges")}
            subtitle={t("coach.earnedBadges")}
            variant={stats.badges.length > 0 ? "primary" : "default"}
          />
        </div>

        {/* 生涯条目列表 */}
        {entries.length > 0 && (
          <Panel className="p-4 mt-6">
            <SectionTitle title={t("coach.careerEntries")} />
            <div className="space-y-3">
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className="border rounded p-3 flex items-start {entry.isPublic ? 'bg-green-50' : 'bg-red-50'}"
                >
                  <div className="flex-1">
                    <div className="font-medium">{entry.title}</div>
                    <div className="text-xs text-muted-foreground">{entry.description}</div>
                  </div>
                  <div className="ml-3 text-center">
                    <div className="text-sm font-medium {entry.isPublic ? 'text-green-600' : 'text-red-600'}">
                      {entry.isPublic ? t("coach.public") : t("coach.private")}
                    </div>
                  </div>
                  <Button
                    size="link"
                    className="mt-2 text-sm"
                    onClick={() => togglePublic(entry.id)}
                  >
                    {entry.isPublic ? t("coach.hide") : t("coach.show")}
                  </Button>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* 无数据提示 */}
        {entries.length === 0 && (
          <EmptyState
            title={t("coach.noEntriesTitle")}
            icon="📝"
            hint={t("coach.noEntriesHint")}
          />
        )}
      </Panel>
    </div>
  );
}