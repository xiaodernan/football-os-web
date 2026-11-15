import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n, fmtDateTime } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { selectChalkboardRun, chalkboardForecast } from "@/domain/chalkboard";
import { CHALKBOARD_KEY, browserStore, readJson, writeJson } from "@/domain/localData";
import { DemoBadge, Panel, Crest, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";
import { cn, SEPARATOR } from "@/lib/utils";
import { sum } from "@/domain/attributes";

/**
 * M1138 · The Chalkboard Cup — the five-question duel between the visitor's eye
 * and the seed's own Poisson fold. Nothing here is invented: eligibility and order
 * are the seed's (see domain/chalkboard.ts), the three calls pay the model's own
 * pre-match percentages, and the record lives on this device — no network, no reveal
 * until a call lands, no pretending the model is anything but the seed's opinion.
 */
export function Chalkboard() {
  const { t, locale } = useI18n();
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const competitions = useMemo(() => footballProvider.competitions(), []);

  const [record, setRecord] = useState(() => {
    const held = readJson<{ runs: number; best: number; total: number; last: number }>(browserStore(), CHALKBOARD_KEY, { runs: 0, best: 0, total: 0, last: 0 });
    return held.value;
  });

  const [run, setRun] = useState(record.runs);
  const fixtures = useMemo(() => selectChalkboardRun(matches, run), [matches, run]);

  // Every match yields a read or null; only fixtures the model could call get served.
  const calls = useMemo(
    () =>
      fixtures
        .map((m) => {
          const read = chalkboardForecast(m, matches, clubs);
          return read ? { match: m, fc: read, compId: m.competitionId } : null;
        })
        .filter((c): c is NonNullable<typeof c> => c !== null),
    [fixtures, matches, clubs],
  );

  const [picks, setPicks] = useState<(0 | 1 | 2 | null)[]>(() => calls.map(() => null));
  const answered = picks.filter((p) => p !== null).length;
  const done = calls.length > 0 && answered === calls.length;

  useEffect(() => { setPicks(calls.map(() => null)); }, [run, calls]);

  const points = sum(calls.map((c, i) => (picks[i] !== null ? [c.fc.homePct, c.fc.drawPct, c.fc.awayPct][picks[i]!] : 0)), (n) => n);

  useEffect(() => {
    if (!done) return;
    setRecord((prev) => {
      const next = { runs: prev.runs + 1, total: points, best: Math.max(prev.best, points), last: points };
      writeJson(browserStore(), CHALKBOARD_KEY, next);
      return next;
    });
    // points only becomes final when done flips; record is the durable ledger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const teamName = (id: string) => getClub(id)?.short ?? id;
  const compName = (id: string) => competitions.find((c) => c.id === id)?.name ?? id;
  // The verdict band from the run total
  const band = points <= 150 ? 1 : points <= 240 ? 2 : points <= 330 ? 3 : points <= 410 ? 4 : 5;

  if (calls.length === 0) {
    return (
      <div className="space-y-4">
        <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
          <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent">{t("chalkboard.title")}</h1>
        </header>
        <Panel className="p-6 text-center text-sm text-muted-foreground">{t("chalkboard.empty")}</Panel>
      </div>
    );
  }

  return (
    <div className="space-y-5 print:hidden">
      {/* The hero — your eye versus the model's, framed */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-7", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-20 -top-20 h-48 w-48" />
        <div aria-hidden className="fo-orb fo-orb-violet -right-16 -bottom-16 h-48 w-48" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("chalkboard.kicker")}</span>
            <DemoBadge />
          </div>
          <h1 className="fo-spectrum mt-2 bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-6xl">
            {t("chalkboard.title")}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-xs text-muted-foreground">{t("chalkboard.subtitle")}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <span>{t("chalkboard.runs", { n: record.runs })}</span>
            <span aria-hidden>·</span>
            <span>{t("chalkboard.best", { n: record.best })}</span>
            <span aria-hidden>·</span>
            <span>{t("chalkboard.vsModel")}</span>
          </div>
        </div>
      </header>

      {/* The five-call run */}
      <ol className="space-y-4">
        {calls.map(({ match, fc, compId }, i) => {
          const picked = picks[i];
          const modelPick = fc.homePct >= fc.drawPct && fc.homePct >= fc.awayPct ? 0 : fc.drawPct >= fc.awayPct ? 1 : 2;
          const withModel = picked !== null && picked === modelPick;
          return (
            <li key={match.id} className={cn("rounded-2xl border p-5", PANEL_CLASS.panelDeep)}>
              <div className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-widest text-muted-foreground">
                <span>{compName(compId)} · {fmtDateTime(locale, match.kickoff)}</span>
                <span>{String(i + 1).padStart(2, "0")} / {String(calls.length).padStart(2, "0")}</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Crest colors={getClub(match.homeClubId)?.colors} short={getClub(match.homeClubId)?.short} size={44} />
                  <div className="text-sm font-bold sm:text-base">{teamName(match.homeClubId)}</div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{t("chalkboard.question")}</div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold sm:text-base">{teamName(match.awayClubId)}</div>
                  <Crest colors={getClub(match.awayClubId)?.colors} short={getClub(match.awayClubId)?.short} size={44} />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {([0, 1, 2] as const).map((choice) => {
                  const pct = [fc.homePct, fc.drawPct, fc.awayPct][choice];
                  const label = [teamName(match.homeClubId), t("chalkboard.draw"), teamName(match.awayClubId)][choice];
                  const chosen = picked === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      disabled={picked !== null}
                      onClick={() => setPicks((p) => p.map((v, idx) => (idx === i ? choice : v)))}
                      aria-pressed={chosen}
                      className={cn(
                        "fo-lift flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors",
                        chosen ? CHIP_CLASS.optionOn : "border-border hover:bg-muted disabled:opacity-70",
                      )}
                    >
                      <span className="truncate">{label}</span>
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{picked === null ? "??" : `${pct}%`}</span>
                    </button>
                  );
                })}
              </div>
              {picked !== null && (
                <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-widest">
                  <span className={cn("rounded px-1.5 py-0.5", withModel ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.warning)}>{withModel ? t("chalkboard.withModel") : t("chalkboard.against")}</span>
                  <span className="text-muted-foreground">{t("chalkboard.modelSays", { score: fc.mostLikelyScore.replace("-", SEPARATOR) })}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* The verdict */}
      {done && (
        <section className={cn("rounded-2xl border p-6 text-center", PANEL_CLASS.panelQuiet)}>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("chalkboard.total")}</div>
          <div className="fo-spectrum mt-1 bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text font-mono text-5xl font-black tabular-nums text-transparent">{points}</div>
          <div className="mt-2 inline-flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-widest text-primary">{t(`chalkboard.rank.${band}`)}</span>
            <span className="text-[10px] text-muted-foreground">{t(`chalkboard.rank.hint.${band}`)}</span>
          </div>
          <div className="mt-3 text-[10px] text-muted-foreground">{t("chalkboard.resetNote")}</div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => setRun(record.runs)} className="fo-lift rounded-lg border px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted">
              {t("chalkboard.again")}
            </button>
            <Link to="/manual" className="text-xs text-muted-foreground hover:underline">{t("manual.title")}</Link>
          </div>
        </section>
      )}

      <p className="text-center text-[11px] text-muted-foreground">{t("chalkboard.method")}</p>
    </div>
  );
}
