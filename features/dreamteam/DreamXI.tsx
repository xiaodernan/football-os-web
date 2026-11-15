// M1147 · The Dream XI — the user's fantasy eleven on the frozen world's 610 players.
// Pick a formation, filter the pool by position, drop picks into the slots that fit,
// auto-fill the best team the seed can field, keep your XI in localStorage.
// Every number is folded; no player is invented; the cap is a deliberate €200M world, proved honest.

import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n, formatDate } from "@/i18n";
import { fmtMoney, cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";
import { FORMATIONS, SALARY_CAP_EUR, teamStats, autoFill, type Formation, type DreamXI } from "@/domain/dreamTeam";
import { DREAM_XI_KEY, browserStore, readJson, writeJson } from "@/domain/localData";
import { byOverall, byValueDesc, tally } from "@/domain/attributes";
import type { PositionGroup } from "@/domain/types";
import { positionLabel } from "@/domain/rowText";
import { DemoBadge, Panel, Crest, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";

// The position filter chips directly use the position code; the words come from the composer.
const BUCKETS: (PositionGroup | "ALL")[] = ["ALL", "GK", "CB", "FB", "DM", "CM", "AM", "W", "ST"];
const FORMATION_KEYS: Formation[] = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2"];
const SORT_MODES = ["overall", "value", "age"] as const;
type Sort = (typeof SORT_MODES)[number];
const SORT_LABEL: Record<Sort, string> = { overall: "dream.sort.overall", value: "dream.sort.value", age: "dream.sort.age" };

export function DreamXI() {
  const { t, locale } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const byId = useMemo(() => new Map(clubs.map((c) => [c.id, c] as const)), [clubs]);

  // The saved XI restores its formation and its picks together; a saved formation we no longer know falls
  // back to 4-3-3 the same honest way an older visit's missing rows fall back to the defaults.
  const stored = useMemo(() => readJson<DreamXI>(browserStore(), DREAM_XI_KEY, { formation: "4-3-3", picked: [], savedAt: "" }).value, []);
  const [formation, setFormation] = useState<Formation>(() => (FORMATION_KEYS.includes(stored.formation as Formation) ? (stored.formation as Formation) : "4-3-3"));
  const [picked, setPicked] = useState<string[]>(() => stored.picked);
  const [savedStamp, setSavedStamp] = useState<string>(() => stored.savedAt);
  const [sort, setSort] = useState<Sort>("overall");
  const [filter, setFilter] = useState<PositionGroup | "ALL">("ALL");

  const slots = FORMATIONS[formation].slots;
  const required = useMemo(() => tally(slots, (s) => s), [slots]);
  const pickedPlayers = useMemo(
    () => picked.map((id) => players.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => p != null),
    [picked, players],
  );
  const stats = useMemo(() => teamStats(players, picked, formation), [players, picked, formation]);
  const filled = stats.picks === stats.slots;

  // For slot i in the slots list, find the ith picked player whose positionGroup matches the slot's requirement.
  const slotAssignment = useMemo(() => {
    const taken: Record<number, typeof pickedPlayers[number]> = {};
    const used = new Set<string>();
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const candidate = pickedPlayers.find((p) => p.positionGroup === slot && !used.has(p.id));
      if (candidate) { taken[i] = candidate; used.add(candidate.id); }
    }
    return taken;
  }, [pickedPlayers, slots]);

  const candidates = useMemo(() => {
    let pool = players.filter((p) => required.has(p.positionGroup) && !new Set(picked).has(p.id));
    if (filter !== "ALL") pool = pool.filter((p) => p.positionGroup === filter);
    switch (sort) {
      case "overall": return [...pool].sort(byOverall);
      case "value": return [...pool].sort(byValueDesc);
      case "age": return [...pool].sort((a, b) => a.age - b.age || byOverall(a, b));
    }
  }, [players, required, picked, filter, sort]);

  const save = () => {
    const payload = { formation, picked, savedAt: new Date().toISOString() };
    writeJson(browserStore(), DREAM_XI_KEY, payload);
    setSavedStamp(payload.savedAt);
  };
  const auto = () => {
    // M1147: the fold does the greedy pass — slot order, seed ordering, no reranking.
    setPicked(autoFill(players, formation, []));
  };
  const clearAll = () => setPicked([]);
  const toggle = (id: string) => {
    const p = players.find((x) => x.id === id);
    if (!p) return;
    if (picked.includes(id)) { setPicked(picked.filter((x) => x !== id)); return; }
    const need = required.get(p.positionGroup) ?? 0;
    if (need === 0) return;
    const took = pickedPlayers.filter((x) => x.positionGroup === p.positionGroup).length;
    if (took >= need) return;
    setPicked([...picked, id]);
  };

  return (
    <div className="space-y-5 print:hidden">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-16 -top-16 h-48 w-48" />
        <div aria-hidden className="fo-orb fo-orb-violet -right-14 -bottom-16 h-48 w-48" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("dream.kicker")}</span>
            <DemoBadge />
          </div>
          <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">{t("dream.title")}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-xs text-muted-foreground">{t("dream.subtitle")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {FORMATION_KEYS.map((f) => (
              <button key={f} type="button" onClick={() => { setFormation(f); setPicked([]); }} className={cn("rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest", formation === f ? CHIP_CLASS.optionOn : CHIP_CLASS.optionOff)}>{FORMATIONS[f].label}</button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("dream.statsOvr"), value: `${stats.avgOverall}` },
          { label: t("dream.statsPicks"), value: `${stats.picks}/${stats.slots}` },
          { label: t("dream.statsValue"), value: fmtMoney(stats.totalValue) },
          { label: t("dream.statsChem"), value: `${stats.chemistry}` },
        ].map((cell) => (
          <div key={cell.label} className={cn("rounded-xl border p-3 text-center", PANEL_CLASS.panelQuiet)}>
            <div className="fo-spectrum font-mono text-2xl font-black tabular-nums">{cell.value}</div>
            <div className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground">{cell.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={auto} className="fo-lift rounded-lg border px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted">{t("dream.autoFill")}</button>
        <button type="button" onClick={clearAll} className="rounded-md border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted">{t("dream.clearAll")}</button>
        <button type="button" onClick={save} className={cn("rounded-md border px-3 py-2 text-xs font-semibold", filled ? CHIP_CLASS.optionOn : CHIP_CLASS.optionOff)}>{t("dream.save")}</button>
        {savedStamp ? <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("dream.savedAt", { when: formatDate(locale, savedStamp) })}</span> : null}
        <span className={cn("ml-auto text-[10px] uppercase tracking-widest", stats.underCap ? "text-primary" : "text-warning")}>{stats.underCap ? t("dream.underCap") : t("dream.overCap", { n: fmtMoney(stats.totalValue - SALARY_CAP_EUR) })}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel className="p-4">
          <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("dream.xiTitle")}</h2>
          <ol className="mt-2 space-y-1">
            {slots.map((slot, i) => {
              const chosen = slotAssignment[i];
              return (
                <li key={i} className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs">
                  <span className="w-10 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{positionLabel(slot, t)}</span>
                  {chosen ? (
                    <>
                      <Crest colors={byId.get(chosen.clubId)?.colors} short={byId.get(chosen.clubId)?.short} size={24} />
                      <div className="flex-1 truncate"><span className="font-semibold">{chosen.name}</span> <span className="text-[9px] text-muted-foreground">{byId.get(chosen.clubId)?.short}</span></div>
                      <span className="font-mono tabular-nums">{chosen.overall}</span>
                      <button type="button" onClick={() => setPicked(picked.filter((x) => x !== chosen.id))} className="text-[10px] text-muted-foreground hover:text-foreground" aria-label={t("dream.remove")}>{t("dream.removeMark")}</button>
                    </>
                  ) : (
                    <div className="flex-1 truncate text-muted-foreground">{t("dream.openSlot")}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </Panel>

        <Panel className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("dream.poolTitle")}<span className="ml-2 text-primary">{candidates.length}</span></h2>
            <div className="flex items-center gap-1">
              {SORT_MODES.map((m) => (
                <button key={m} type="button" onClick={() => setSort(m)} className={cn("rounded px-2 py-1 text-[9px] uppercase tracking-widest", sort === m ? CHIP_CLASS.optionOn : "text-muted-foreground")}>{t(SORT_LABEL[m])}</button>
              ))}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {BUCKETS.filter((b) => b === "ALL" || required.has(b as PositionGroup)).map((b) => (
              <button key={String(b)} type="button" onClick={() => setFilter(b)} className={cn("rounded border px-2 py-0.5 text-[9px] uppercase tracking-widest", filter === b ? CHIP_CLASS.optionOn : CHIP_CLASS.optionOff)}>{b === "ALL" ? t("dream.filter.all") : positionLabel(String(b), t)}</button>
            ))}
          </div>
          <ul className="mt-2 max-h-[460px] space-y-1 overflow-y-auto">
            {candidates.slice(0, 80).map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => toggle(p.id)} className="flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted">
                  <Crest colors={byId.get(p.clubId)?.colors} short={byId.get(p.clubId)?.short} size={24} />
                  <div className="min-w-0 flex-1 truncate"><span className="font-semibold">{p.name}</span> <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{p.age}{" · "}{positionLabel(p.positionGroup, t)}{" · "}{byId.get(p.clubId)?.short}</span></div>
                  <span className="font-mono tabular-nums text-[10px]">{p.overall}</span>
                  <span className="font-mono tabular-nums text-[9px] text-muted-foreground">{fmtMoney(p.value)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">{t("dream.method")}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link to="/watchlist" className="text-xs text-muted-foreground hover:underline">{t("nav.watch")}</Link>
        <Link to="/scouting" className="text-xs text-muted-foreground hover:underline">{t("nav.scouting")}</Link>
        <Link to="/manual" className="text-xs text-muted-foreground hover:underline">{t("manual.title")}</Link>
      </div>
    </div>
  );
}
