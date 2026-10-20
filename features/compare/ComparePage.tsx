import { useMemo, useState } from "react";
import { positionLabel } from "@/domain/rowText";
import { Link, useRouter } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { byOverall } from "@/domain/attributes";
import { compare, type CompareMetric } from "@/domain/compare";
import { playerDna } from "@/domain/playerDna";
import type { PlayerRef } from "@/domain/types";
import { Panel, SectionTitle, Crest, PositionTag, EmptyState, DemoBadge, DnaCard } from "@/ui/primitives";
import { Input } from "@/components/ui/input";
import { cn, pctOf, SEPARATOR, paramText } from "@/lib/utils";

export function ComparePage() {
  const { t } = useI18n();
  const { query } = useRouter();
  const players = useMemo(() => footballProvider.players(), []);
  const ids = useMemo(() => new Set(players.map((p) => p.id)), [players]);
  const defaults = useMemo(
    () => [...players].sort(byOverall).slice(0, 2).map((p) => p.id),
    [players],
  );
  const [aId, setAId] = useState(() => {
    const q = paramText(query, "a");
    return ids.has(q) ? q : defaults[0] ?? "";
  });
  const [bId, setBId] = useState(() => {
    const q = paramText(query, "b");
    return ids.has(q) && q !== paramText(query, "a") ? q : defaults[1] ?? "";
  });

  const result = useMemo(() => (aId && bId ? compare(aId, bId) : null), [aId, bId]);
  const dnaA = result ? playerDna(result.a.attributes) : null;
  const dnaB = result ? playerDna(result.b.attributes) : null;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("compare.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("compare.subtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PlayerPicker players={players} value={aId} onChange={setAId} exclude={bId} side="A" />
        <PlayerPicker players={players} value={bId} onChange={setBId} exclude={aId} side="B" />
      </div>

      {!result ? (
        <Panel className="p-4">
          <EmptyState title={t("compare.pickTwo")} icon="⇄" hint={t("compare.pickTwoHint")} />
        </Panel>
      ) : (
        <>
          <Panel className="p-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <SideHead p={result.a} club={result.aClub} win={result.verdict === "a"} />
              <div className="text-center">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("compare.verdict")}</div>
                <div className="mt-0.5 text-sm font-semibold">
                  {result.verdict === "even" ? t("compare.even") : result.verdict === "a" ? result.a.name : result.b.name}
                </div>
                <div className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">{result.aWins}{SEPARATOR}{result.bWins}</div>
              </div>
              <SideHead p={result.b} club={result.bClub} win={result.verdict === "b"} align="right" />
            </div>
            {!result.sameBucket && (
              <p className="mt-3 rounded-lg border border-warning/30 bg-warning/5 px-3 py-1.5 text-[11px] text-muted-foreground">
                {t("compare.diffPosition")}
              </p>
            )}
          </Panel>

          <Panel className="p-0">
            <div className="px-4 pt-4"><SectionTitle title={t("compare.metrics")} hint={t("compare.metricsHint")} /></div>
            <div className="mt-2 divide-y">
              {result.metrics.map((m) => <MetricRow key={m.key} m={m} />)}
            </div>
          </Panel>

          {(dnaA || dnaB) && (
            <Panel className="p-4">
              <SectionTitle title={t("compare.dna")} hint={t("compare.dnaHint")} />
              <div className="mt-1 grid gap-3 sm:grid-cols-2">
                <DnaCard
                  dna={dnaA}
                  fallbackLabel={t(`dna.arch.${result.a.archetype}`)}
                  fallbackNote={t("compare.dnaNoVector")}
                />
                <DnaCard
                  dna={dnaB}
                  fallbackLabel={t(`dna.arch.${result.b.archetype}`)}
                  fallbackNote={t("compare.dnaNoVector")}
                />
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">{t("compare.dnaNote")}</p>
            </Panel>
          )}

          {result.hasAttributes ? (
            <>
              <Panel className="p-4">
                <SectionTitle title={t("compare.categories")} hint={t("compare.categoriesHint")} />
                <div className="mt-3 space-y-3">
                  {result.categoryEdges.map((c) => {
                    const max = Math.max(c.a, c.b, 1);
                    return (
                      <div key={c.category} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <span className={cn("font-mono tabular-nums", c.favor === "a" && "font-semibold text-success")}>{c.a}</span>
                          <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
                            <span className="absolute inset-y-0 right-0 rounded-full bg-primary/50" style={{ width: pctOf(c.a, max) }} />
                          </span>
                        </div>
                        <div className="text-center text-[11px] uppercase tracking-wider text-muted-foreground">{t(`attr.${c.category}`)}</div>
                        <div className="flex items-center gap-2">
                          <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
                            <span className="absolute inset-y-0 left-0 rounded-full bg-primary/50" style={{ width: pctOf(c.b, max) }} />
                          </span>
                          <span className={cn("font-mono tabular-nums", c.favor === "b" && "font-semibold text-success")}>{c.b}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <Panel className="p-4">
                <SectionTitle title={t("compare.attributes")} hint={t("compare.attributesHint")} />
                <div className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {result.attributeEdges.map((e) => (
                    <div key={e.key} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{t(`attr.name.${e.key}`)}</span>
                      <span className={cn("font-mono tabular-nums", e.favor === "a" ? "text-success" : "text-muted-foreground")}>{e.a}</span>
                      <span className="w-10 text-center font-mono tabular-nums text-muted-foreground">{e.delta > 0 ? `+${e.delta}` : e.delta}</span>
                      <span className={cn("font-mono tabular-nums", e.favor === "b" ? "text-success" : "text-muted-foreground")}>{e.b}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">{t("compare.attributesNote")}</p>
              </Panel>
            </>
          ) : (
            <Panel className="p-4">
              <SectionTitle title={t("compare.attributes")} />
              <p className="mt-2 text-xs text-muted-foreground">{t("compare.noAttributes")}</p>
            </Panel>
          )}
        </>
      )}

      <p className="text-[11px] text-muted-foreground">{t("compare.disclaimer")}</p>
    </div>
  );
}

function MetricRow({ m }: { m: CompareMetric }) {
  const { t } = useI18n();
  const aBetter = m.dir !== "info" && m.a !== m.b && (m.dir === "high" ? m.a > m.b : m.a < m.b);
  const bBetter = m.dir !== "info" && m.a !== m.b && !aBetter;
  // Normalise the two "info"-free bars for a subtle relative fill; info rows skip bars.
  const max = Math.max(m.a, m.b, 1);
  return (
    <div className="grid grid-cols-[1fr_120px_1fr] items-center gap-2 px-4 py-2.5 text-sm">
      <div className="flex items-center justify-end gap-2">
        <span className={cn("font-mono tabular-nums", aBetter && "font-semibold text-success")}>{m.display(m.a)}</span>
        {m.dir !== "info" && (
          <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
            <span className="absolute inset-y-0 right-0 rounded-full bg-primary/50" style={{ width: pctOf(m.a, max) }} />
          </span>
        )}
      </div>
      <div className="text-center text-[11px] uppercase tracking-wider text-muted-foreground">{t(`compare.m.${m.key}`)}</div>
      <div className="flex items-center gap-2">
        {m.dir !== "info" && (
          <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
            <span className="absolute inset-y-0 left-0 rounded-full bg-primary/50" style={{ width: pctOf(m.b, max) }} />
          </span>
        )}
        <span className={cn("font-mono tabular-nums", bBetter && "font-semibold text-success")}>{m.display(m.b)}</span>
      </div>
    </div>
  );
}

function SideHead({ p, club, win, align }: { p: PlayerRef; club: string; win: boolean; align?: "right" }) {
  const { t } = useI18n();
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <div className={cn("flex items-center gap-2", align === "right" && "flex-row-reverse")}>
        <Crest colors={getClub(p.clubId)?.colors} short={getClub(p.clubId)?.short} size={32} />
        <div className="min-w-0">
          <Link to={`/players/${p.id}`} className="truncate font-semibold hover:text-primary hover:underline">{p.name}</Link>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <PositionTag position={p.position} />
            <span>{p.age}y</span>
          </div>
        </div>
      </div>
      <div className="mt-1 truncate text-[11px] text-muted-foreground">{club}</div>
      {win && <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-success">▲ {t("compare.edge")}</div>}
    </div>
  );
}

function PlayerPicker({ players, value, onChange, exclude, side }: {
  players: PlayerRef[];
  value: string;
  onChange: (id: string) => void;
  exclude: string;
  side: "A" | "B";
}) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const selected = players.find((p) => p.id === value) ?? null;
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    return players
      .filter((p) => p.id !== exclude)
      .filter((p) => !s || p.name.toLowerCase().includes(s) || p.nation.toLowerCase().includes(s) || p.position.toLowerCase().includes(s))
      .slice(0, 7);
  }, [players, q, exclude]);

  return (
    <Panel className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("compare.player")} {side}</span>
        {selected && <span className="text-xs text-muted-foreground">{t(`dna.arch.${selected.archetype}`)}</span>}
      </div>
      {selected ? (
        <div className="flex items-center gap-2">
          <Crest colors={getClub(selected.clubId)?.colors} short={getClub(selected.clubId)?.short} size={28} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{selected.name}</div>
            <div className="truncate text-xs text-muted-foreground">{positionLabel(selected.position, t)} · {getClub(selected.clubId)?.name}</div>
          </div>
          <button onClick={() => { onChange(""); setQ(""); }} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>
      ) : (
        <Input placeholder={t("compare.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
      )}
      {!selected && (
        <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
          {matches.map((p) => (
            <button
              key={p.id}
              onClick={() => { onChange(p.id); setQ(""); }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-secondary/50"
            >
              <Crest colors={getClub(p.clubId)?.colors} short={getClub(p.clubId)?.short} size={20} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{positionLabel(p.position, t)} · {p.overall}</span>
            </button>
          ))}
          {!matches.length && <div className="px-2 py-3 text-center text-xs text-muted-foreground">{t("compare.noMatch")} “{q}”.</div>}
        </div>
      )}
    </Panel>
  );
}
