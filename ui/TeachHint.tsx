// The teaching hint (M1229): a "?" that opens a one-line lesson about the control it sits on.
// The dashboard's module grid wears one per tile; the lesson itself is a dictionary key resolved
// through the catalogue in domain/teachHint.ts, so the screen never hardcodes a sentence and the
// ledger survives a rename. Reading a hint marks it on the device (TEACH_SEEN_KEY); an unread
// hint carries a quiet pulse so a first-time reader can see what they have not opened yet.
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { useLocalStorage } from "@/lib/hooks";
import { TEACH_SEEN_KEY, isSeen, markSeen, teachHintKey, unseenIds } from "@/domain/teachHint";
import { cn } from "@/lib/utils";
import { CHIP_CLASS } from "@/ui/primitives";

export function TeachHint({ id, className }: { id: string; className?: string }) {
  const { t } = useI18n();
  const [seen, setSeen] = useLocalStorage<string[]>(TEACH_SEEN_KEY, []);
  const [open, setOpen] = useState(false);
  const key = teachHintKey(id);

  // Escape closes an open lesson from anywhere on the page — a keyboard reader never has to
  // hunt for the "?" again to dismiss what it opened.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // An unknown id is refused by the catalogue; the screen renders nothing rather than a lesson
  // that resolves to the raw key at runtime.
  if (!key) return null;
  const read = isSeen(seen, id);

  const toggle = () => {
    if (!open) setSeen((s) => markSeen(s, id));
    setOpen(!open);
  };

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={t(open ? "teach.close" : read ? "teach.open" : "teach.newUnread")}
        className={cn(
          "grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[9px] font-bold leading-none transition-colors",
          read ? "border-border text-muted-foreground hover:text-foreground" : CHIP_CLASS.badgePrimaryEdge,
        )}
      >
        ?
        {!read && <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden />}
      </button>
      {open && (
        <>
          {/* The dismiss layer: one tap anywhere outside the lesson closes it, the way a popover
              should, without the page having to know a lesson is open. */}
          <button type="button" aria-hidden tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <span
            role="note"
            className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-md border border-border bg-popover p-2.5 text-left text-xs font-normal leading-relaxed text-popover-foreground shadow-md"
          >
            {t(key)}
          </span>
        </>
      )}
    </span>
  );
}

/** How many catalogue lessons the reader has not opened — the count the settings row prints. */
export const unreadTeachCount = (seen: readonly string[]): number => unseenIds(seen).length;
