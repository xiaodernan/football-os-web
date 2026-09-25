import { useMemo, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { LOCALES, type Locale } from "@/i18n/dictionaries";
import { useTheme } from "@/lib/theme";
import { useOs, STORAGE_KEY } from "@/store/useFootballOS";
import { applyImport, buildExport, clearActivity, inventory, readImport } from "@/domain/localData";
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
  const [imported, setImported] = useState<{ keys: number } | null>(null);

  const inv = useMemo(() => inventory(localStorage), [state]);

  const activityEntries = inv.entries.filter((e) => e.kind === "activity");
  const prefEntries = inv.entries.filter((e) => e.kind === "preference");

  function exportData() {
    try {
      const bundle = buildExport(localStorage);
      if (!Object.keys(bundle.sections).length) {
        toast(t("set.nothingToExport"));
        return;
      }
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `football-os-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast(t("set.exported", { n: Object.keys(bundle.sections).length }));
    } catch {
      toast(t("set.exportFailed"));
    }
  }

  async function importData(file: File) {
    try {
      const text = await file.text();
      const parsed = readImport(text);
      if ("error" in parsed) {
        toast(t("set.importNotBundle"));
        return;
      }
      const result = applyImport(localStorage, parsed.bundle);
      if (!result.ok) {
        toast(t("set.importFailed"));
        return;
      }
      setImported({ keys: result.keys });
      toast(t("set.imported", { n: result.keys }));
    } catch {
      toast(t("set.importFailed"));
    }
  }

  function doReset() {
    reset();
    const cleared = clearActivity(localStorage);
    setConfirming(false);
    setImported(null);
    toast(t("set.resetDone", { n: cleared }));
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
        <SectionTitle title={t("set.data")} hint={t("set.dataHint", { n: inv.present, t: inv.entries.length })} />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5">{t("set.colStore")}</th>
                <th className="px-2 py-1.5 text-right">{t("set.colRecords")}</th>
                <th className="px-2 py-1.5 text-right">{t("set.colSize")}</th>
                <th className="px-2 py-1.5">{t("set.colKind")}</th>
              </tr>
            </thead>
            <tbody>
              {[...activityEntries, ...prefEntries].map((e) => (
                <tr key={e.key} className="border-t">
                  <td className="px-2 py-1.5">
                    <span className={cn(e.present ? "text-foreground" : "text-muted-foreground")}>{t(e.labelKey)}</span>
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground">{e.key}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums">{e.present ? e.records : "—"}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums">{e.present ? formatBytes(e.bytes) : "—"}</td>
                  <td className="px-2 py-1.5 text-[11px] text-muted-foreground">{t(e.kind === "activity" ? "set.kind.activity" : "set.kind.preference")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg border bg-secondary/20 px-3 py-2 text-xs">
          <span className="text-muted-foreground">{t("set.storageUsed")}</span>
          <span className="font-mono tabular-nums">
            {formatBytes(inv.bytes)} · {t("set.totals", { r: inv.records, k: inv.present })}
          </span>
        </div>
        {imported && (
          <p className="mt-2 rounded-lg border border-success/40 bg-success/5 px-3 py-2 text-xs text-success">
            {t("set.importedNote", { n: imported.keys })}{" "}
            <button className="underline" onClick={() => window.location.reload()}>{t("set.reloadToApply")}</button>
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportData}>{t("set.export")}</Button>
          <label className="inline-flex">
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importData(f);
                e.target.value = "";
              }}
            />
            <span className="inline-flex h-8 cursor-pointer items-center rounded-md border bg-card px-3 text-xs font-medium text-foreground hover:bg-secondary/50">{t("set.import")}</span>
          </label>
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
        <p className="mt-2 text-[11px] text-muted-foreground">{t("set.resetKeepsPrefs")}</p>
      </Panel>

      <Panel className="p-4">
        <SectionTitle title={t("set.about")} />
        <dl className="space-y-1.5 text-xs">
          <Line k={t("set.provider")} v={`${footballProvider.id} · ${DEMO_MODE ? t("set.demoMode") : t("set.liveMode")}`} />
          <Line k={t("set.version")} v="0.1.0" />
          <Line k={t("set.storageKey")} v={`${inv.entries.length} · ${STORAGE_KEY}`} />
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
