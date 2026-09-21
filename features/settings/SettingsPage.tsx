import { useMemo, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { LOCALES, type Locale } from "@/i18n/dictionaries";
import { useTheme } from "@/lib/theme";
import { useOs, STORAGE_KEY } from "@/store/useFootballOS";
import { DEMO_MODE, footballProvider } from "@/data/footballService";
import type { Mode } from "@/domain/types";
import { Panel, SectionTitle, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MODES: Mode[] = ["FAN", "PLAYER", "MANAGER"];

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const { state, setMode, reset } = useOs();
  const [confirming, setConfirming] = useState(false);

  const bytes = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Blob([raw]).size : 0;
    } catch {
      return 0;
    }
  }, [state]);

  const counts = useMemo(
    () => [
      { label: t("set.sessions"), value: state.sessions.length },
      { label: t("set.plans"), value: state.plans.length },
      { label: t("set.goals"), value: state.goals.length },
      { label: t("set.watchlist"), value: state.watchlist.length },
      { label: t("set.memory"), value: state.memory.length },
      { label: t("set.progress"), value: state.progress.length },
    ],
    [state, t],
  );

  function exportData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        toast(t("set.nothingToExport"));
        return;
      }
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `football-os-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast(t("set.exported"));
    } catch {
      toast(t("set.exportFailed"));
    }
  }

  function doReset() {
    reset();
    setConfirming(false);
    toast(t("set.resetDone"));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{t("set.title")}</h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("set.subtitle")}</p>
        </div>
      </div>

      <Panel className="p-4">
        <SectionTitle title={t("set.preferences")} hint={t("set.preferencesHint")} />
        <div className="space-y-4">
          <Row label={t("set.mode")} hint={t("set.modeHint")}>
            <div className="flex flex-wrap gap-1.5">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition",
                    state.mode === m ? "bg-primary text-primary-foreground" : "border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`set.mode.${m}`)}
                </button>
              ))}
            </div>
          </Row>

          <Row label={t("set.language")} hint={t("set.languageHint")}>
            <div className="flex flex-wrap gap-1.5">
              {LOCALES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLocale(l.id as Locale)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition",
                    locale === l.id ? "bg-primary text-primary-foreground" : "border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </Row>

          <Row label={t("set.theme")} hint={t("set.themeHint")}>
            <Button variant="outline" size="sm" onClick={toggle}>
              {theme === "dark" ? "☾" : "☀"} {t(theme === "dark" ? "set.theme.dark" : "set.theme.light")}
            </Button>
          </Row>
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionTitle title={t("set.data")} hint={t("set.dataHint")} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {counts.map((c) => (
            <div key={c.label} className="rounded-lg border bg-card/50 px-3 py-2 text-center">
              <div className="text-lg font-semibold tabular-nums">{c.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg border bg-secondary/20 px-3 py-2 text-xs">
          <span className="text-muted-foreground">{t("set.storageUsed")}</span>
          <span className="font-mono tabular-nums">{formatBytes(bytes)}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportData}>{t("set.export")}</Button>
          {!confirming ? (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirming(true)}>
              {t("set.reset")}
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1.5">
              <span className="text-xs text-destructive">{t("set.resetConfirm")}</span>
              <Button variant="outline" size="sm" onClick={doReset}>{t("set.resetYes")}</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>{t("set.resetNo")}</Button>
            </div>
          )}
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionTitle title={t("set.about")} />
        <dl className="space-y-1.5 text-xs">
          <Line k={t("set.provider")} v={`${footballProvider.id} · ${DEMO_MODE ? t("set.demoMode") : t("set.liveMode")}`} />
          <Line k={t("set.version")} v="0.1.0" />
          <Line k={t("set.storageKey")} v={STORAGE_KEY} />
        </dl>
        <p className="mt-3 text-[11px] text-muted-foreground">{t("set.privacy")}</p>
      </Panel>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="truncate font-mono">{v}</dd>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
