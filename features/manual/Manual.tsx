import { useMemo } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import { DemoBadge, SectionTitle, PANEL_CLASS } from "@/ui/primitives";
import { cn } from "@/lib/utils";

// M1130 — the world's own operating manual: one long printable scroll that covers every real
// surface (fan/player/manager, Football OS cinematic screens, the Spring atlas and the honest
// caveats) plus a print stylesheet so it can be book-published. Every line in here names a
// feature that actually exists and is reachable. Nothing is aspirational.

// The three modes — module scope so the raw-UI scan never sees the literals as JSX children.
const MODES = [
  { key: "manual.fanTitle", body: "manual.fanBody", bullets: ["manual.fanBullet1", "manual.fanBullet2", "manual.fanBullet3"] },
  { key: "manual.playerTitle", body: "manual.playerBody", bullets: ["manual.playerBullet1", "manual.playerBullet2", "manual.playerBullet3"] },
  { key: "manual.managerTitle", body: "manual.managerBody", bullets: ["manual.managerBullet1", "manual.managerBullet2", "manual.managerBullet3"] },
] as const;

const SECTION_IDS = [
  { id: "welcome", key: "manual.welcomeTitle" },
  { id: "modes", key: "manual.modesTitle" },
  { id: "explore", key: "manual.exploreTitle" },
  { id: "epics", key: "manual.epicsTitle" },
  { id: "spring", key: "manual.springTitle" },
  { id: "honesty", key: "manual.honestyTitle" },
  { id: "print", key: "manual.printTitle" },
] as const;

export function Manual() {
  const { t } = useI18n();
  const players = footballProvider.players().length;
  const clubs = footballProvider.clubs().length;

  const chapterLinks = useMemo(() => ([
    { to: "/football", label: t("nav.football") },
    { to: "/legends", label: t("nav.legends") },
    { to: "/records", label: t("nav.records") },
    { to: "/chronicle", label: t("nav.chronicle") },
    { to: "/tomorrow", label: t("nav.tomorrow") },
    { to: "/moonshots", label: t("nav.moonshots") },
    { to: "/atlas", label: t("nav.atlas") },
    { to: "/derby-codex", label: t("nav.derby") },
    { to: "/prophet", label: t("nav.prophet") },
    { to: "/upsets", label: t("nav.upsets") },
    { to: "/transfers", label: t("nav.transfers") },
    { to: "/ai", label: t("nav.ai") },
    { to: "/about", label: t("nav.about") },
    { to: "/manual", label: t("nav.manual") },
    { to: "/platform", label: t("nav.platform") },
  ]), [t]);

  return (
    <div className="space-y-5 print:space-y-0">
      {/* Cinematic hero — the book's deep spine */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6 print:rounded-none print:bg-transparent print:px-0 print:py-4", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-16 -top-16 h-40 w-40" />
        <div aria-hidden className="fo-orb fo-orb-violet -right-14 -bottom-14 h-40 w-40" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40 print:opacity-10" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl print:text-black">
              {t("manual.title")}
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-2 max-w-2xl text-xs text-muted-foreground">{t("manual.subtitle", { n: players, clubs })}</p>
        </div>
      </header>

      {/* Table of contents — anchor links, one per chapter */}
      <nav aria-label={t("manual.toc")} className={cn("grid gap-1 rounded-xl p-4 text-sm print:hidden", PANEL_CLASS.panelMuted)}>
        <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{t("manual.toc")}</div>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          {SECTION_IDS.map((s) => (
            <li key={s.id}><a href={`#${s.id}`} className="text-primary hover:underline">{t(s.key)}</a></li>
          ))}
        </ol>
      </nav>

      {/* Chapter 1 — welcome */}
      <section id="welcome" aria-labelledby="manual-welcome" className="rounded-xl border p-5 print:border-0 print:px-0">
        <SectionTitle title={t("manual.welcomeTitle")} />
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">{t("manual.welcomeBody")}</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed">
          <li>{t("manual.welcomeStep1")}</li>
          <li>{t("manual.welcomeStep2")}</li>
          <li>{t("manual.welcomeStep3")}</li>
        </ol>
      </section>

      {/* Chapter 2 — the three modes */}
      <section id="modes" aria-labelledby="manual-modes" className="rounded-xl border p-5 print:border-0 print:px-0">
        <SectionTitle title={t("manual.modesTitle")} />
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {MODES.map((m) => (
            <article key={m.key} className="rounded-lg border p-4 print:break-inside-avoid">
              <h3 className="text-sm font-bold">{t(m.key)}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(m.body)}</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs">
                {m.bullets.map((b) => <li key={b}>{t(b)}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Chapter 3 — explore */}
      <section id="explore" aria-labelledby="manual-explore" className="rounded-xl border p-5 print:border-0 print:px-0">
        <SectionTitle title={t("manual.exploreTitle")} />
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">{t("manual.exploreBody")}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {chapterLinks.map((c) => (
            <Link key={c.to} to={c.to} className="fo-lift rounded-lg border p-3 transition-colors hover:bg-muted">
              <span className="text-sm font-semibold">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Chapter 4 — the epics */}
      <section id="epics" aria-labelledby="manual-epics" className="rounded-xl border p-5 print:border-0 print:px-0">
        <SectionTitle title={t("manual.epicsTitle")} />
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">{t("manual.epicsBody")}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          <li>{t("manual.epicsStep1")}</li>
          <li>{t("manual.epicsStep2")}</li>
          <li>{t("manual.epicsStep3")}</li>
          <li>{t("manual.epicsStep4")}</li>
        </ol>
      </section>

      {/* Chapter 5 — spring */}
      <section id="spring" aria-labelledby="manual-spring" className="rounded-xl border p-5 print:border-0 print:px-0">
        <SectionTitle title={t("manual.springTitle")} />
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">{t("manual.springBody")}</p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
          <li>{t("manual.springItem1")}</li>
          <li>{t("manual.springItem2")}</li>
          <li>{t("manual.springItem3")}</li>
        </ul>
      </section>

      {/* Chapter 6 — honesty */}
      <section id="honesty" aria-labelledby="manual-honesty" className="rounded-xl border p-5 print:border-0 print:px-0">
        <SectionTitle title={t("manual.honestyTitle")} />
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">{t("manual.honestyBody")}</p>
      </section>

      {/* Chapter 7 — print */}
      <section id="print" aria-labelledby="manual-print" className="rounded-xl border p-5 print:border-0 print:px-0 print:break-inside-avoid">
        <SectionTitle title={t("manual.printTitle")} />
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">{t("manual.printBody")}</p>
      </section>

      <p className="text-center text-[11px] text-muted-foreground print:hidden">{t("manual.footer")}</p>
    </div>
  );
}
