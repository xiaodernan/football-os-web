import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useRouter } from "@/lib/router";
import { useI18n } from "@/i18n";
import { useTheme } from "@/lib/theme";
import { useOs } from "@/store/useFootballOS";
import { globalSearch } from "@/data/footballService";
import { rowLine, searchKindLabel } from "@/domain/rowText";
import { MODES } from "@/domain/types";
import { useDebounced } from "@/lib/hooks";

interface ActionCmd {
  id: string;
  label: string;
  hint?: string;
  group: Group;
  run: () => void;
}

// The palette's sections, as codes. A command row stores one of these and the
// heading is looked up from it, so no screen text is ever held in a row — and
// because `ActionCmd.group` is typed against this list, a row that tries to carry
// its own display string is a compile error rather than a translation bug.
// proof-i18n reads the list below as the whole value range of `cmd.group.…`.
const GROUPS = ["goto", "modes", "actions"] as const;
type Group = (typeof GROUPS)[number];

// The shell owns `open`: the header carries a ⌘K badge on a button, and the badge and the
// shortcut have to drive the same control.
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: Dispatch<SetStateAction<boolean>> }) {
  const { navigate, path } = useRouter();
  const { t } = useI18n();
  const { theme, toggle } = useTheme();
  const { state, setMode } = useOs();
  const [query, setQuery] = useState("");
  const dq = useDebounced(query, 160);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const actions: ActionCmd[] = useMemo(() => {
    const nav = (to: string) => () => {
      navigate(to);
      onOpenChange(false);
    };
    const base: ActionCmd[] = [
      { id: "home", label: t("nav.home"), group: "goto", run: nav("/") },
      { id: "world", label: t("nav.football"), group: "goto", run: nav("/football") },
      { id: "matches", label: t("nav.matches"), group: "goto", run: nav("/matches") },
      { id: "players", label: t("nav.players"), group: "goto", run: nav("/players") },
      { id: "clubs", label: t("nav.clubs"), group: "goto", run: nav("/clubs") },
      { id: "news", label: t("nav.news"), group: "goto", run: nav("/news") },
      { id: "ai", label: t("nav.ai"), group: "goto", run: nav("/ai") },
      { id: "knowledge", label: t("nav.knowledge"), group: "goto", run: nav("/knowledge") },
      { id: "tactical", label: t("nav.tactical"), group: "goto", run: nav("/tactical-studio") },
      { id: "sim", label: t("nav.simulation"), group: "goto", run: nav("/simulation") },
      { id: "learn", label: t("nav.learn"), group: "goto", run: nav("/learn") },
      { id: "scouting", label: t("nav.scouting"), group: "goto", run: nav("/scouting") },
      { id: "dynamic-world", label: t("nav.world"), group: "goto", run: nav("/world") },
      { id: "film", label: t("nav.film"), group: "goto", run: nav("/film") },
      { id: "data", label: t("nav.data"), group: "goto", run: nav("/data") },
      { id: "transfers", label: t("nav.transfers"), group: "goto", run: nav("/transfers") },
      { id: "compare", label: t("nav.compare"), group: "goto", run: nav("/compare") },
      { id: "watchlist", label: t("nav.watch"), group: "goto", run: nav("/watchlist") },
      { id: "profile", label: t("nav.profile"), group: "goto", run: nav("/profile") },
      { id: "review", label: t("nav.review"), group: "goto", run: nav("/review") },
      { id: "load", label: t("nav.load"), group: "goto", run: nav("/load") },
      { id: "development", label: t("nav.development"), group: "goto", run: nav("/development") },
      { id: "achievements", label: t("nav.achievements"), group: "goto", run: nav("/achievements") },
      { id: "settings", label: t("nav.settings"), group: "goto", run: nav("/settings") },
      { id: "history", label: t("nav.history"), group: "goto", run: nav("/history") },
      { id: "community", label: t("nav.community"), group: "goto", run: nav("/community") },
    ];
    if (state.onboarded) {
      base.unshift({ id: "player", label: t("nav.player"), group: "modes", run: nav("/player") });
      base.unshift({ id: "manager", label: t("nav.manager"), group: "modes", run: nav("/manager") });
    }
    base.push(
      // The theme words are the settings screen's own keys, so the palette can never
      // call 浅色 something the settings page calls 亮色.
      { id: "theme", label: t("cmd.theme", { theme: theme === "dark" ? t("set.theme.light") : t("set.theme.dark") }), hint: t("cmd.appearance"), group: "actions", run: () => { toggle(); } },
      { id: "ask", label: t("cmd.ask"), hint: t("cmd.from", { path }), group: "actions", run: nav("/ai") },
    );
    if (state.onboarded) {
      MODES.forEach((m) =>
        base.push({ id: `mode-${m}`, label: t("cmd.mode", { mode: t(`prof.mode.${m}`) }), group: "actions", run: () => { setMode(m); onOpenChange(false); } }),
      );
    }
    return base;
  }, [navigate, t, theme, toggle, path, state.onboarded, setMode]);

  const filteredActions = actions.filter((a) => !dq || a.label.toLowerCase().includes(dq.toLowerCase()));
  const searchResults = useMemo(() => (dq ? globalSearch(dq, 12) : []), [dq]);

  const groups = useMemo(() => {
    const map = new Map<string, ActionCmd[]>();
    for (const a of filteredActions) {
      if (!map.has(a.group)) map.set(a.group, []);
      map.get(a.group)!.push(a);
    }
    return [...map.entries()];
  }, [filteredActions]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t("cmd.title")} description={t("cmd.description")}>
      <Command shouldFilter={false}>
        <CommandInput placeholder={t("cmd.placeholder")} value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>{t("cmd.empty")}</CommandEmpty>

          {searchResults.length > 0 && (
            <>
              <CommandGroup heading={t("nav.football")}>
                {searchResults.map((r) => (
                  <CommandItem
                    key={`${r.type}-${r.id}`}
                    value={`${r.type}-${r.id}`}
                    onSelect={() => {
                      navigate(r.to);
                      onOpenChange(false);
                    }}
                  >
                    {/* The kind chip used to print the stored code, so a reader in 简体中文 saw
                        「club」 in an otherwise translated list — the only display position in the
                        tree that showed a retrieval kind. It asks the door's composer now, the same
                        line that words a kind anywhere else. */}
                    <span className="mr-2 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">{searchKindLabel(r.type, t)}</span>
                    {/* The news family's title is the seed's composed English sentence, so it
                        rides on its keyed row (M275); the four proper-noun families show the
                        record's own word, as their names do everywhere. */}
                    <span className="font-medium">{r.titleRow ? rowLine(r.titleRow, t) : r.title}</span>
                    <span className="ml-auto truncate pl-3 text-xs text-muted-foreground">{rowLine(r.subtitle, t)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {groups.map(([group, items]) => (
            <CommandGroup key={group} heading={t(`cmd.group.${group}`)}>
              {items.map((a) => (
                <CommandItem key={a.id} value={a.id} onSelect={a.run}>
                  <span>{a.label}</span>
                  {a.hint && <span className="ml-auto text-xs text-muted-foreground">{a.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
