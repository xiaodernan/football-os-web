import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TacticalNotebook() {
  const { t } = useI18n();

  // 模拟战术备忘录数据
  const notes = useMemo(() => ([
    { id: "1", title: "下一场对手分析", content: "对手主打4-2-3-1阵型，中场控制力强", date: "2024-05-20", priority: "high" },
    { id: "2", title: "阵型调整建议", content: "考虑改用3-5-2以加强边路进攻", date: "2024-05-18", priority: "medium" },
    { id: "3", title: "定位球训练", content: "角球和任意球需要加强练习", date: "2024-05-15", priority: "low" },
    { id: "4", title: "球员状态提醒", content: "主力前锋本周需要轮休", date: "2024-05-12", priority: "high" },
    { id: "5", title: "青训生首发", content: "U19球员本轮联赛首发，表现良好", date: "2024-05-10", priority: "medium" },
  ] as const));

  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const priorityCounts = useMemo(() => {
    const map: Record<string, number> = {};
    notes.forEach(n => {
      map[n.priority] = (map[n.priority] || 0) + 1;
    });
    return map;
  }, [notes]);

  const handleSelectNote = (noteId: string) => {
    setSelectedNote(noteId);
  };

  return (
    <Panel className="p-6">
      <SectionTitle title={t("tactical.tacticalNotebookTitle")} />

      {/* 备忘录概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("tactical.totalNotes")}
          value=notes.length.toString()
          subtitle={t("tactical.notes)}
        />
        <div>
          <SectionTitle title={t("tactical.priorityDistribution")} />
          <div className="grid grid-cols-3 gap-2">
          {["high", "medium", "low"].map(pri => (
            <div key={pri} className="border rounded p-2 text-center">
              <div className="font-medium">{t(`priority.${pri}`)}</div>
              <div className="text-2xl font-bold ${pri === "high" ? "text-red-600" : pri === "medium" ? "text-yellow-600" : "text-green-600"}">
                {priorityCounts[pri] || 0}
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* 备忘录列表 */}
      <Panel className="p-4">
        <SectionTitle title={t("tactical.recentNotes")} />
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {notes.map(note => (
            <div
              key={note.id}
              className={`border rounded p-3 flex items-start ${
                note.priority === "high" ? "bg-red-50" :
                note.priority === "medium" ? "bg-yellow-50" :
                "bg-green-50"
              }`}
            >
              <div className="flex-1">
                <div className="font-medium truncate">{note.title}</div>
                <div className="text-xs text-muted-foreground">{t("tactical.on", { date: note.date })}</div>
              </div>
              <div className="ml-3 text-sm ${
                note.priority === "high" ? "text-red-600" :
                note.priority === "medium" ? "text-yellow-600" :
                "text-green-600"
              }">
                {t(`priority.${note.priority}`)}
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.alert(t("tactical.addNewNote"))}
        >
          {t("tactical.addNote")}
        </Button>
      </Panel>
    </Panel>
  );
}