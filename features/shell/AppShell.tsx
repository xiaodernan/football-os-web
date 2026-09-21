import { useState, type ReactNode } from "react";
import { Link, useRouter, matchRoute } from "@/lib/router";
import { useI18n } from "@/i18n";
import { useTheme } from "@/lib/theme";
import { useOs } from "@/store/useFootballOS";
import { LOCALES, type Locale } from "@/i18n/dictionaries";
import { levelInfo } from "@/store/useFootballOS";
import { Button } from "@/components/ui/button";
import { Command } from "@/components/ui/command";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DemoBadge } from "@/ui/primitives";
import { CommandPalette } from "@/features/command/CommandPalette";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  match?: string[];
}

const I = {
  grid: "▦",
  globe: "◎",
  users: "☰",
  ball: "●",
  shield: "⛨",
  news: "❯",
  bolt: "⚡",
  board: "▤",
  pitch: "⛶",
  sim: "▷",
  book: "✎",
  chat: "❉",
  search: "⌕",
  trophy: "♛",
};

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { path, navigate } = useRouter();
  const { state } = useOs();
  const [mobileOpen, setMobileOpen] = useState(false);

  const primary: NavItem[] = [
    { to: "/", label: t("nav.home"), icon: I.grid, match: ["/"] },
    { to: "/football", label: t("nav.football"), icon: I.globe, match: ["/football", "/players", "/clubs", "/competitions", "/matches", "/news"] },
  ];
  const modes: NavItem[] = [];
  if (state.onboarded) {
    modes.push({ to: "/player", label: t("nav.player"), icon: I.ball, match: ["/player"] });
    modes.push({ to: "/manager", label: t("nav.manager"), icon: I.board, match: ["/manager"] });
  }
  const studio: NavItem[] = [
    { to: "/ai", label: "Football AI", icon: I.bolt, match: ["/ai"] },
    { to: "/knowledge", label: "Knowledge graph", icon: I.users, match: ["/knowledge"] },
    { to: "/tactical-studio", label: t("nav.tactical"), icon: I.pitch, match: ["/tactical-studio"] },
    { to: "/simulation", label: t("nav.simulation"), icon: I.sim, match: ["/simulation"] },
    { to: "/learn", label: t("nav.learn"), icon: I.book, match: ["/learn"] },
    { to: "/community", label: "Community", icon: I.chat, match: ["/community"] },
  ];
  const search: NavItem[] = [{ to: "/search", label: t("nav.search"), icon: I.search, match: ["/search"] }];

  const isActive = (n: NavItem) =>
    n.to === "/" ? path === "/" : n.match?.some((m) => path === m || (matchRoute(`${m}/*`, path) as unknown) || path.startsWith(m + "/") || path === m);

  const renderLink = (n: NavItem, compact = false) => (
    <Link
      key={n.to}
      to={n.to}
      onClick={() => setMobileOpen(false)}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive(n) ? "bg-sidebar-primary/15 font-medium text-sidebar-primary" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
        compact && "w-full",
      )}
    >
      <span className="grid w-5 place-items-center text-base leading-none">{n.icon}</span>
      <span className="truncate">{n.label}</span>
    </Link>
  );

  const info = state.profile ? levelInfo(state.profile.xp) : null;

  const sidebar = (
    <div className="flex h-full flex-col gap-1 bg-sidebar p-3 text-sidebar-foreground">
      <Link to="/" className="mb-2 flex items-center gap-2 px-1 py-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-sidebar-primary text-lg font-black text-sidebar-primary-foreground">F</span>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight">{t("brand.name")}</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("brand.tagline")}</div>
        </div>
      </Link>

      {info && (
        <div className="mb-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{state.profile?.displayName}</span>
            <span className="font-mono text-sidebar-primary">Lv {info.level}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sidebar">
            <div className="h-full rounded-full bg-sidebar-primary transition-all" style={{ width: `${Math.round(info.progress * 100)}%` }} />
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {info.intoLevel} / {info.forNext} XP · {state.mode}
          </div>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto scrollbar-thin">
        <Group>{primary.map((n) => renderLink(n))}</Group>
        {modes.length > 0 && <Group label="Your OS">{modes.map((n) => renderLink(n))}</Group>}
        <Group label="Studios">{studio.map((n) => renderLink(n))}</Group>
        <Group label="">{search.map((n) => renderLink(n))}</Group>
      </nav>

      <div className="mt-2 flex items-center justify-between border-t border-sidebar-border pt-3">
        <ModeSwitch />
        <Controls />
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh">
      <CommandPalette />
      {/* desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-sidebar-border lg:block">{sidebar}</aside>

      <div className="lg:pl-60">
        {/* topbar */}
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/80 px-4 py-2.5 backdrop-blur">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden" aria-label="Open navigation">
                ☰
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="h-full">{sidebar}</div>
            </SheetContent>
          </Sheet>

          <Button
            variant="outline"
            size="sm"
            className="ml-auto flex h-9 w-full max-w-xs items-center justify-start gap-2 text-muted-foreground sm:w-64"
            onClick={() => navigate("/search")}
          >
            <span>{I.search}</span>
            <span className="text-xs">Search or ask…</span>
            <kbd className="ml-auto hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline">⌘K</kbd>
          </Button>
          <div className="hidden sm:block">
            <Controls />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4 flex justify-end">{path !== "/" && <DemoBadge />}</div>
          <div className="fo-rise" key={path}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Group({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="mb-1">
      {label && <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</div>}
      {children}
    </div>
  );
}

function ModeSwitch() {
  const { state, setMode } = useOs();
  const { t } = useI18n();
  if (!state.onboarded) return null;
  const modes: ("FAN" | "PLAYER" | "MANAGER")[] = ["FAN", "PLAYER", "MANAGER"];
  return (
    <div className="flex items-center gap-1">
      {modes.map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={cn(
            "rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition",
            state.mode === m ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-sidebar/60 text-muted-foreground hover:text-foreground",
          )}
          title={t(`onboarding.${m.toLowerCase()}`)}
        >
          {m[0]}
        </button>
      ))}
    </div>
  );
}

function Controls() {
  const { locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  return (
    <div className="flex items-center gap-1">
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="h-8 rounded-md border bg-card px-1.5 text-xs text-foreground outline-none"
        aria-label="Language"
      >
        {LOCALES.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
      <Button variant="ghost" size="sm" onClick={toggle} aria-label="Toggle theme">
        {theme === "dark" ? "☾" : "☀"}
      </Button>
    </div>
  );
}
