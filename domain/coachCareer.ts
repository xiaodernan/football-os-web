export interface CoachCareerEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  category: "training" | "match" | "workshop" | "ai" | "community";
  metadata?: Record<string, any>;
  isPublic: boolean;
}

export interface CoachCareerProfile {
  coachId: string;
  name: string;
  totalSessions: number;
  totalHours: number;
  badges: string[];
  entries: CoachCareerEntry[];
  overallRating: number;
}

// 获取教练生涯条目
export function getCoachEntries(coachId: string): CoachCareerEntry[] {
  // 从localStorage获取或返回演示数据
  const entriesStr = localStorage.getItem(`coach_entries_${coachId}`);
  if (entriesStr) {
    return JSON.parse(entriesStr);
  }
  // 演示默认数据
  return [
    {
      id: "entry-1",
      date: new Date().subtractWeeks(12).toISOString().split("T")[0],
      title: "第一次训练课程",
      description: "完成了基础训练计划的首次课程",
      category: "training",
      isPublic: true
    }
  ];
}

// 保存教练生涯条目
export function saveCoachEntry(entry: CoachCareerEntry): void {
  const entries = getCoachEntries(entry.coachId ?? "default");
  entries.push(entry);
  localStorage.setItem(`coach_entries_${entry.coachId ?? "default"}`, JSON.stringify(entries));
}

// 计算教练统计数据
export function calculateCoachStats(entries: CoachCareerEntry[]): {
  totalSessions: number;
  totalHours: number;
  categories: Record<string, number>;
  badges: string[];
} {
  const totalSessions = entries.length;
  const totalHours = entries.reduce((sum, entry) => {
    const dur = entry.metadata?.durationHours;
    return dur ? sum + dur : sum;
  }, 0);

  const categories: Record<string, number> = {};
  entries.forEach(entry => {
    categories[entry.category] = (categories[entry.category] || 0) + 1;
  });

  // 徽章逻辑：基于完成的课程和时长
  const badges: string[] = [];
  if (totalSessions >= 10) badges.push("training_beginner");
  if (totalSessions >= 25) badges.push("training_intermediate");
  if (totalSessions >= 50) badges.push("training_expert");
  if (totalHours >= 20) badges.push("committed_coach");
  if (totalHours >= 50) badges.push("master_coach");

  return { totalSessions, totalHours, categories, badges };
}