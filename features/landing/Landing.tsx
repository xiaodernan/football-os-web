import { Link } from "@/lib/router";
import { positionLabel } from "@/domain/rowText";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { WORLD } from "@/data/footballSeed";
import { trendingPlayers, getClub } from "@/data/footballService";
import { Crest, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";
import { cn } from "@/lib/utils";

// The six pillars, as ids only. Every word a pillar shows — its name and its one-line
// description — is keyed off `k`, and proof-i18n enumerates this array as the whole
// value range of both sites, so a seventh pillar with no `landing.pillars.*` /
// `landing.pillarDesc.*` rows fails the suite instead of printing a raw key.
const PILLARS = ["coach", "world", "studio", "dev", "intel", "manager"];

export function Landing() {
  const { t } = useI18n();
  const stars = trendingPlayers(5);
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className={cn("grid h-8 w-8 place-items-center rounded-lg text-lg font-black", CHIP_CLASS.solidPrimary)}>F</span>
          <span className="font-bold tracking-tight">{t("brand.name")}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/onboarding" className="text-sm text-muted-foreground hover:text-foreground">
            {t("cta.enter")}
          </Link>
          <Link to="/football">
            <Button size="sm" variant="outline">
              {t("cta.explore")}
            </Button>
          </Link>
        </div>
      </header>

      <section className="fo-radial relative overflow-hidden">
        <div className="fo-grid absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 text-center sm:pt-24">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="fo-live-dot h-1.5 w-1.5 rounded-full bg-success" /> {t("landing.statLine", { players: WORLD.players.length, clubs: WORLD.clubs.length, matches: WORLD.matches.length })}
          </div>
          <h1 className="text-5xl font-black leading-[0.95] tracking-tighter sm:text-7xl md:text-8xl">
            {t("landing.hero.1")}
            <br />
            <span className="bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-transparent">{t("landing.hero.2")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">{t("landing.sub")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/onboarding">
              <Button size="lg" className="shadow-[0_0_40px_-8px] shadow-primary/60">
                {t("cta.enter")} →
              </Button>
            </Link>
            <Link to="/football">
              <Button size="lg" variant="outline">
                {t("cta.explore")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((k) => (
            <div key={k} className={cn("group rounded-xl p-5 transition hover:border-primary/40 hover:bg-card/70", PANEL_CLASS.panelSoft)}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">{t(`landing.pillars.${k}`)}</div>
              <p className="text-sm text-muted-foreground">{t(`landing.pillarDesc.${k}`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("landing.trending")}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {stars.map((p) => {
            const club = getClub(p.clubId);
            return (
              <Link key={p.id} to={`/players/${p.id}`} className={cn("rounded-xl p-4 transition hover:border-primary/40", PANEL_CLASS.panelSoft)}>
                <div className="flex items-center gap-2">
                  <Crest colors={club?.colors} short={club?.short} size={30} />
                  <div className="text-right text-lg font-bold tabular-nums">{p.overall}</div>
                </div>
                <div className="mt-3 truncate text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">{positionLabel(p.position, t)} · {t("landing.ageSuffix", { age: p.age })} · {club?.name}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="border-t px-6 py-8 text-center text-xs text-muted-foreground">
        {t("landing.footer")}
      </footer>
    </div>
  );
}
