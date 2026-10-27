import { useMemo, useState } from "react";
import { useI18n, formatDate } from "@/i18n";
import { Panel, SectionTitle, EmptyState, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/lib/hooks";
import { newId } from "@/lib/ids";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  heading: string;
  body: string;
  priority: Priority;
  /** ISO instant the note was written. */
  createdAt: string;
}

const STORE_KEY = "football-os.notebook.v1";
// The priority vocabulary is one list; the type is derived from it, so the two cannot drift.
const PRIORITIES = ["high", "medium", "low"] as const;
type Priority = (typeof PRIORITIES)[number];
const PRIORITY_TONE: Record<Priority, string> = {
  high: CHIP_CLASS.destructive,
  medium: CHIP_CLASS.warning,
  low: CHIP_CLASS.success,
};

export function TacticalNotebook() {
  const { t, locale } = useI18n();
  const [notes, setNotes] = useLocalStorage<Note[]>(STORE_KEY, []);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<"idle" | "saved" | "refused">("idle");

  // The priority words are three literal lookups, never a template key, so a renamed
  // member fails at the dictionary rather than at runtime.
  const priorityLabel = (p: Priority): string =>
    p === "high"
      ? t("tactical.notebook.priority.high")
      : p === "medium"
        ? t("tactical.notebook.priority.medium")
        : t("tactical.notebook.priority.low");

  const sorted = useMemo(
    () => [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notes],
  );

  const add = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const note: Note = {
      id: newId("note"),
      heading: trimmedTitle,
      body: body.trim(),
      priority,
      createdAt: new Date().toISOString(),
    };
    const verdict = setNotes((prev) => [note, ...prev]);
    setStatus(verdict.landed ? "saved" : "refused");
    setTitle("");
    setBody("");
    setPriority("medium");
  };

  const remove = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-5">
      <Panel className="p-5">
        <SectionTitle title={t("tactical.notebook.title")} />
        <p className="mt-1 text-sm text-muted-foreground">{t("tactical.notebook.subtitle")}</p>

        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("tactical.notebook.titlePlaceholder")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("tactical.notebook.bodyPlaceholder")}
            rows={3}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("tactical.notebook.priority")}</span>
            {PRIORITIES.map((p) => (
              <Button
                key={p}
                size="sm"
                variant={priority === p ? "default" : "outline"}
                onClick={() => setPriority(p)}
              >
                {priorityLabel(p)}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={add} disabled={!title.trim()}>
              {t("tactical.notebook.add")}
            </Button>
            {status === "saved" && (
              <span className="text-xs text-success">{t("tactical.notebook.saved")}</span>
            )}
            {status === "refused" && (
              <span className="text-xs text-destructive">{t("common.notStored")}</span>
            )}
          </div>
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title={t("tactical.notebook.recent")} />
        {sorted.length === 0 ? (
          <EmptyState
            title={t("tactical.notebook.empty")}
            hint={t("tactical.notebook.emptyHint")}
            icon="📝"
          />
        ) : (
          <ul className="mt-3 space-y-2">
            {sorted.map((n) => (
              <li key={n.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{n.heading}</span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs",
                          PRIORITY_TONE[n.priority],
                        )}
                      >
                        {priorityLabel(n.priority)}
                      </span>
                    </div>
                    {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDate(locale, n.createdAt)}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(n.id)}>
                    {t("tactical.notebook.delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
