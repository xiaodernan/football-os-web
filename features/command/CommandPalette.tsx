import { useEffect, useMemo, useState } from "react";
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
import { useDebounced } from "@/lib/hooks";
import { getCompetition } from "@/data/footballService";

interface ActionCmd {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
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
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const actions: ActionCmd[] = useMemo(() => {
    const nav = (to: string) => () => {
      navigate(to);
      setOpen(false);
    };
    const base: ActionCmd[] = [
      { id: "home", label: t("nav.home"), group: "Go to", run: nav("/") },
      { id: "world", label: t("nav.football"), group: "Go to", run: nav("/football") },
      { id: "matches", label: t("nav.matches"), group: "Go to", run: nav("/matches") },
      { id: "players", label: t("nav.players"), group: "Go to", run: nav("/players") },
      { id: "clubs", label: t("nav.clubs"), group: "Go to", run: nav("/clubs") },
      { id: "news", label: t("nav.news"), group: "Go to", run: nav("/news") },
      { id: "ai", label: t("nav.ai"), group: "Go to", run: nav("/ai") },
      { id: "knowledge", label: t("nav.knowledge"), group: "Go to", run: nav("/knowledge") },
      { id: "tactical", label: t("nav.tactical"), group: "Go to", run: nav("/tactical-studio") },
      { id: "sim", label: t("nav.simulation"), group: "Go to", run: nav("/simulation") },
      { id: "learn", label: t("nav.learn"), group: "Go to", run: nav("/learn") },
      { id: "scouting", label: t("nav.scouting"), group: "Go to", run: nav("/scouting") },
      { id: "dynamic-world", label: t("nav.world"), group: "Go to", run: nav("/world") },
      { id: "film", label: t("nav.film"), group: "Go to", run: nav("/film") },
      { id: "data", label: t("nav.data"), group: "Go to", run: nav("/data") },
      { id: "transfers", label: t("nav.transfers"), group: "Go to", run: nav("/transfers") },
      { id: "compare", label: t("nav.compare"), group: "Go to", run: nav("/compare") },
      { id: "watchlist", label: t("nav.watch"), group: "Go to", run: nav("/watchlist") },
      { id: "profile", label: t("nav.profile"), group: "Go to", run: nav("/profile") },
      { id: "review", label: t("nav.review"), group: "Go to", run: nav("/review") },
      { id: "load", label: t("nav.load"), group: "Go to", run: nav("/load") },
      { id: "development", label: t("nav.development"), group: "Go to", run: nav("/development") },
      { id: "achievements", label: t("nav.achievements"), group: "Go to", run: nav("/achievements") },
      { id: "settings", label: t("nav.settings"), group: "Go to", run: nav("/settings") },
      { id: "history", label: t("nav.history"), group: "Go to", run: nav("/history") },
      { id: "community", label: t("nav.community"), group: "Go to", run: nav("/community") },
    ];
    if (state.onboarded) {
      base.unshift({ id: "player", label: t("nav.player"), group: "Your modes", run: nav("/player") });
      base.unshift({ id: "manager", label: t("nav.manager"), group: "Your modes", run: nav("/manager") });
    }
    base.push(
      { id: "theme", label: `Toggle ${theme === "dark" ? "light" : "dark"} theme`, hint: "Appearance", group: "Actions", run: () => { toggle(); } },
      { id: "ask", label: "Ask Football AI", hint: `from ${path}`, group: "Actions", run: nav("/search?ai=1") },
    );
    if (state.onboarded) {
      (["FAN", "PLAYER", "MANAGER"] as const).forEach((m) =>
        base.push({ id: `mode-${m}`, label: `Switch to ${m} mode`, group: "Actions", run: () => { setMode(m); setOpen(false); } }),
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
    <CommandDialog open={open} onOpenChange={setOpen} title="Football OS Command" description="Search entities or run a command">
      <Command shouldFilter={false}>
        <CommandInput placeholder="Search players, clubs, matches… or type a command" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>

          {searchResults.length > 0 && (
            <>
              <CommandGroup heading="Football World">
                {searchResults.map((r) => (
                  <CommandItem
                    key={`${r.type}-${r.id}`}
                    value={`${r.type}-${r.id}`}
                    onSelect={() => {
                      navigate(r.to);
                      setOpen(false);
                    }}
                  >
                    <span className="mr-2 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">{r.type}</span>
                    <span className="font-medium">{r.title}</span>
                    <span className="ml-auto truncate pl-3 text-xs text-muted-foreground">{r.subtitle}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {groups.map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
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
