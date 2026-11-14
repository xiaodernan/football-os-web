import { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import {
  DemoBadge, Panel, SectionTitle, CHIP_CLASS, PANEL_CLASS,
} from "@/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * M1129 — the world's chronicle of itself — an honest one-screen lodestone for the app.
 * Nothing on this page is new; everything it names already exists with a proof gate, a
 * dictionary row and a ledger entry behind it. If a label here says so, trust it.
 */

const CHAPTERS: { to: string; labelKey: string; hintKey: string }[] = [
  { to: "/football", labelKey: "nav.football", hintKey: "about.chapterFootball" },
  { to: "/legends", labelKey: "nav.legends", hintKey: "about.chapterLegends" },
  { to: "/records", labelKey: "nav.records", hintKey: "about.chapterRecords" },
  { to: "/season-room", labelKey: "nav.seasonRoom", hintKey: "about.chapterSeasonRoom" },
  { to: "/chronicle", labelKey: "nav.chronicle", hintKey: "about.chapterChronicle" },
  { to: "/tomorrow", labelKey: "nav.tomorrow", hintKey: "about.chapterTomorrow" },
  { to: "/moonshots", labelKey: "nav.moonshots", hintKey: "about.chapterMoonshots" },
  { to: "/derby-codex", labelKey: "nav.derby", hintKey: "about.chapterDerby" },
  { to: "/prophet", labelKey: "nav.prophet", hintKey: "about.chapterProphet" },
  { to: "/upsets", labelKey: "nav.upsets", hintKey: "about.chapterUpsets" },
  { to: "/atlas", labelKey: "nav.atlas", hintKey: "about.chapterAtlas" },
  { to: "/transfers", labelKey: "nav.transfers", hintKey: "about.chapterTransfers" },
  { to: "/compare", labelKey: "nav.compare", hintKey: "about.chapterCompare" },
  { to: "/ai", labelKey: "nav.ai", hintKey: "about.chapterAi" },
  { to: "/knowledge", labelKey: "nav.knowledge", hintKey: "about.chapterKnowledge" },
  { to: "/platform", labelKey: "nav.platform", hintKey: "about.chapterPlatform" },
];

export function About() {
  const { t } = useI18n();
  const fixtures = footballProvider.matches().length;
  const clubs = footballProvider.clubs().length;
  const players = footballProvider.players().length;
  const competitions = footballProvider.competitions().length;
  const [fleet, setFleet] = useState<null | boolean>(null);
  useEffect(() => {
    const r = fetch("/api/spring/fleet", { cache: "no-store", signal: AbortSignal.timeout(4000) });
    r.then(async (res) => setFleet(res.ok)).catch(() => setFleet(false));
  }, []);

  return (
    <div className="space-y-5">
      {/* Cinematic hero — this file is the world's own door plaque */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-16 -top-16 h-44 w-44" />
        <div aria-hidden className="fo-orb fo-orb-violet -right-14 -bottom-14 h-48 w-48" />
        <div aria-hidden className="fo-orb fo-orb-cyan left-1/3 top-10 h-32 w-32" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
              {t("about.title")}
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-2 max-w-2xl text-xs text-muted-foreground">{t("about.subtitle")}</p>
        </div>
      </header>

      {/* The honest ledger — the world's own size, as counted at render time */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { value: fixtures, label: t("about.fixtures") },
          { value: clubs, label: t("about.clubs") },
          { value: players, label: t("about.players") },
          { value: competitions, label: t("about.competitions") },
        ].map(({ value, label }) => (
          <div key={label} className={cn("rounded-xl border p-4 text-center", PANEL_CLASS.panelSoft)}>
            <div className="text-2xl font-black tabular-nums leading-none text-primary sm:text-3xl">{value}</div>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* The atlas of chapters — one flight into the world */}
      <Panel className="p-5">
        <SectionTitle title={t("about.chaptersTitle")} hint={t("about.chaptersHint")} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CHAPTERS.map((c) => (
            <Link key={c.to} to={c.to} className={cn("fo-lift rounded-lg p-3 transition-colors hover:bg-muted", PANEL_CLASS.panelDeep)}>
              <div className="text-sm font-semibold leading-snug">{t(c.labelKey)}</div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{t(c.hintKey)}</div>
            </Link>
          ))}
        </div>
      </Panel>

      {/* The Spring fleet — one honest line for the curious reader */}
      <Panel className="p-5">
        <SectionTitle title={t("about.platformTitle")} hint={t("about.platformHint")} />
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className={cn(CHIP_CLASS.labelPrimary, "rounded-md px-2 py-1 font-mono")}>{t("about.javaContractLine")}</span>
          {fleet === null ? (
            <span className={cn(CHIP_CLASS.mutedSoft, "rounded-md px-2 py-1")}>{t("about.fleetLoading")}</span>
          ) : fleet === true ? (
            <span className={cn(CHIP_CLASS.labelSuccess, "rounded-md px-2 py-1")}>{t("about.fleetAlive")}</span>
          ) : (
            <span className={cn(CHIP_CLASS.mutedSoft, "rounded-md px-2 py-1")}>{t("about.fleetLive")}</span>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{t("about.platformLine")}</p>
      </Panel>

      {/* The world's own note — one honest paragraph, the app describing itself */}
      <Panel className="p-5">
        <SectionTitle title={t("about.worldTitle")} />
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{t("about.worldBody")}</p>
      </Panel>

      {/* The honesty line */}
      <p className="text-center text-[11px] text-muted-foreground">{t("about.method")}</p>
    </div>
  );
}
