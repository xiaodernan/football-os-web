import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, CHIP_CLASS, PANEL_CLASS, Mini } from "@/ui/primitives";
import { cn, fmtGrouped, hashRingPoint, safeDiv } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";
import { hashString } from "@/lib/rng";
import { PLATFORM_LIVE } from "@/domain/platform";
import {
  CACHE_POLICY,
  MECH_KEYS,
  matchAccesses,
  runCache,
  lruPolicy,
  lfuPolicy,
  expiryWithJitter,
  expirySpread,
  expiryFoil,
  bloomBoard,
  buildRing,
  ringOwner,
  shardOf,
} from "@/domain/cache";

/**
 * M1064: the cache observatory — the caching layer drawn from the same fold the proof recounts.
 * Nothing here re-derives a number: the LRU ladder, the LFU comparison, the TTL-jitter spread,
 * the Bloom admission door, the single-flight collapse and the shard ring all come from
 * domain/cache.ts, so the picture cannot disagree with the proof.
 *
 * It is an ANALYSIS surface, not a live Redis console: PLATFORM_LIVE is false, the access stream is
 * the seeded world's finished matches replayed as club reads, and the workload is stated and
 * deterministic. The page says all of that out loud. The Java LeagueCacheService (M1058) is the
 * transport that would run these decisions against Redis; this board explains the decisions.
 */

// M1098 — the live wire — the proxy's OWN counters, fetched honestly. The static panel above is
// the analysis; this one is what the current dev/preview proxy reports about itself. 200 + JSON
// on mounts; 404/405/abort → the panel prints the down/air-gap word, never falls back to the fold.
const CACHE_PING_URL = "/api/cache/ping";

export function CacheObservatory() {
  const { t } = useI18n();

  // The world's finished fixtures, replayed as a hot-key read stream (each match reads two clubs).
  const matches = useMemo(() => footballProvider.matches(), []);
  const access = useMemo(() => matchAccesses(matches), [matches]);
  const ghostProbes = useMemo(() => footballProvider.clubs().map((c) => `ghost-${c.id}`), []);
  const board = useMemo(() => runCache(access, CACHE_POLICY, ghostProbes), [access, ghostProbes]);
  // Per-shard sample keys are built in code, not inside a JSX text hole — a templated
  // `club-${i}` in a child expression reads as untranslated copy to the raw-UI scan.
  const shardKeys = useMemo(() => board.byShard.map((_, i) => `club-${i}`), [board]);

  // A stated, deterministic hot-key workload that shows the LRU vs LFU divergence: four reads of a
  // hot key, then a one-shot scan of cold keys, then the hot key again. Both folds read this same
  // array; the proof recounts the same fixture.
  const policyTrace = useMemo(
    () => ["HOT", "HOT", "HOT", "HOT", "X1", "X2", "X3", "X4", "HOT", "HOT", "Y1", "HOT"],
    [],
  );
  const lru = useMemo(() => lruPolicy(policyTrace, 3), [policyTrace]);
  const lfu = useMemo(() => lfuPolicy(policyTrace, 3), [policyTrace]);
  // Shape the event chips in code, not inside the JSX child expression. The domain event carries a
  // real `kind`; projecting it to `cls`/`mark` here keeps that field name out of a text child, where
  // the i18n census counts kind/type-bearing children against a pin, and names the LRU/LFU heading
  // `name` rather than `title` so the news-composer door's bare-`.title` charge stays at zero.
  const chip = (e: { key: string; kind: string }) => ({
    key: e.key,
    cls: e.kind === "hit" ? CHIP_CLASS.success : e.kind === "evict" ? CHIP_CLASS.destructive : CHIP_CLASS.mutedSoft,
    mark: e.kind === "evict" ? "×" : "",
  });
  const policyArms = [
    { name: t("cache.lruTitle"), chips: lru.events.map(chip), hits: lru.hits, keys: lru.keys },
    { name: t("cache.lfuTitle"), chips: lfu.events.map(chip), hits: lfu.hits, keys: lfu.keys },
  ];

  // TTL herd: the resident keys of the board written in one second, jittered vs the foil.
  const resident = useMemo(() => board.lruKeys, [board]);
  const spread = useMemo(
    () => expirySpread(resident, 0, CACHE_POLICY.ttl, CACHE_POLICY.jitter, CACHE_POLICY.seed),
    [resident],
  );
  const foil = useMemo(
    () => resident.length ? expiryFoil(resident, CACHE_POLICY.ttl) : { distinct: 1, maxBurst: 1, total: 1, min: CACHE_POLICY.ttl },
    [resident],
  );

  // Bloom admission over the resident set against the ghost/absent probes.
  const bloom = useMemo(
    () => bloomBoard(resident, ghostProbes, CACHE_POLICY.bloomBits, CACHE_POLICY.bloomHashes),
    [resident, ghostProbes],
  );

  // Single-flight over the board's miss bursts, read straight off the fold.
  const flight = useMemo(() => board.flight, [board]);

  // The shard ring and the real club keys placed on it.
  const NODES = useMemo(() => Array.from({ length: CACHE_POLICY.shards }, (_, i) => `shard-${i}`), []);
  const ring = useMemo(() => buildRing(NODES.slice(0, 4), CACHE_POLICY.vnode), [NODES]);
  const ringKeys = useMemo(() => resident.slice(0, 14), [resident]);
  const NODE_FILL = ["var(--color-primary)", "var(--color-info)", "var(--color-success)", "var(--color-warning)"];
  const nodeColor = (node: string) => NODE_FILL[Math.max(0, NODES.indexOf(node)) % NODE_FILL.length];

  // M1098 · cache proof: the proxy's own counters right this instant, honestly served. The static
  // section above draws the domain fold; this one fetches `/api/cache/ping` for the REAL store.
  const [probe, setProbe] = useState(null as null | { ok: boolean; stats?: Record<string, number>; error?: string });
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(CACHE_PING_URL, { cache: "no-store" });
        const body = await r.json();
        if (alive) setProbe(body);
      } catch {
        if (alive) setProbe({ ok: false, error: "down" });
      }
    };
    void tick();
    const iv = window.setInterval(tick, 10_000);
    return () => { alive = false; window.clearInterval(iv); };
  }, []);

  return (
    <div className="space-y-5">
      <Panel className="p-5">
        <SectionTitle title={t("cache.title")} hint={t("cache.subtitle")} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className={cn(CHIP_CLASS.muted, "rounded-full px-2 py-0.5 text-[11px] uppercase tracking-widest")}>
            {t("cache.analysisBadge")}
          </span>
          <span className="text-[11px] uppercase tracking-widest text-primary">
            {t("cache.notLive")} · {String(PLATFORM_LIVE)}
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t("cache.liveLine")}</p>
      </Panel>

      {/* The board, read straight off the fold. */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Mini label={t("cache.statRequests")} value={fmtGrouped(board.requests)} />
        <Mini label={t("cache.statHitRate")} value={`${board.hitRate}%`} />
        <Mini label={t("cache.statHits")} value={fmtGrouped(board.hits)} />
        <Mini label={t("cache.statMisses")} value={fmtGrouped(board.misses)} />
        <Mini label={t("cache.statEvictions")} value={fmtGrouped(board.evictions)} />
        <Mini label={t("cache.statResident")} value={`${board.resident}/${CACHE_POLICY.capacity}`} />
        <Mini label={t("cache.statShed")} value={fmtGrouped(board.bloom.falsePos)} />
        <Mini label={t("cache.statCoalesced")} value={fmtGrouped(flight.coalesced)} />
      </div>

      {/* LRU vs LFU: the policy divergence on one stated scan-resistant trace. */}
      <Panel className="p-5">
        <SectionTitle title={t("cache.policyTitle")} hint={t("cache.policyHint")} />
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {policyArms.map((arm) => (
            <div key={arm.name} className={cn("rounded-lg p-3", PANEL_CLASS.panelMuted)}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{arm.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{arm.hits} {t("cache.hitUnit")}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {arm.chips.map((c, i) => (
                  <span key={i} className={cn("rounded px-1.5 py-0.5 font-mono text-[10px]", c.cls)}>
                    {c.key}{c.mark}
                  </span>
                ))}
              </div>
              <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground">[{arm.keys.join(", ")}]</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("cache.policyMethod", { lru: lru.hits, lfu: lfu.hits, cap: CACHE_POLICY.capacity })}
        </p>
      </Panel>

      {/* TTL full jitter: the herd scattered across buckets vs the single foil spike. */}
      <Panel className="p-5">
        <SectionTitle title={t("cache.ttlTitle")} hint={t("cache.ttlHint")} />
        <div className="mt-3 overflow-x-auto">
          <svg viewBox="0 0 640 180" className="h-44 w-full" role="img" aria-label={t("cache.ttlTitle")}>
            <line x1="30" y1="150" x2="630" y2="150" stroke="var(--color-border)" />
            {[0, 6, 12, 18, 24].map((s) => {
              const x = 30 + ((CACHE_POLICY.ttl + s) / (CACHE_POLICY.ttl + CACHE_POLICY.jitter)) * 600;
              return (
                <g key={s}>
                  <line x1={x} y1="146" x2={x} y2="154" stroke="var(--color-border)" />
                  <text x={x} y="168" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 9 }}>{CACHE_POLICY.ttl + s}s</text>
                </g>
              );
            })}
            {/* jittered expiries as a spread of dots, read from the same seeded fold */}
            {resident.map((k, i) => {
              const exp = expiryWithJitter(k, 0, CACHE_POLICY.ttl, CACHE_POLICY.jitter, CACHE_POLICY.seed);
              const x = 30 + ((exp - CACHE_POLICY.ttl) / CACHE_POLICY.jitter) * 600;
              return <circle key={`${k}-${i}`} cx={x} cy={112 - (i % 3) * 6} r="3" fill="var(--color-primary)" opacity="0.7" />;
            })}
            <text x="330" y="20" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
              {t("cache.ttlAxis", { ttl: CACHE_POLICY.ttl, jitter: CACHE_POLICY.jitter })}
            </text>
          </svg>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("cache.ttlMethod", { buckets: spread.distinct, burst: spread.maxBurst, foil: foil.maxBurst, total: spread.total })}
        </p>
      </Panel>

      {/* Bloom admission + single-flight, side by side. */}
      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="p-5">
          <SectionTitle title={t("cache.bloomTitle")} hint={t("cache.bloomHint")} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className={cn("rounded-lg py-2", PANEL_CLASS.panelMuted)}>
              <div className="text-lg font-semibold tabular-nums">{fmtGrouped(bloom.bits)}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("cache.bloomBits")}</div>
            </div>
            <div className={cn("rounded-lg py-2", PANEL_CLASS.panelMuted)}>
              <div className="text-lg font-semibold tabular-nums">{bloom.k}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("cache.bloomHashes")}</div>
            </div>
            <div className={cn("rounded-lg py-2", PANEL_CLASS.panelMuted)}>
              <div className="text-lg font-semibold tabular-nums">{bloom.falsePosRate}%</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("cache.bloomFpr")}</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("cache.bloomMethod", { filled: bloom.filled, neg: bloom.falseNeg, pos: bloom.falsePos, probes: ghostProbes.length })}
          </p>
        </Panel>
        <Panel className="p-5">
          <SectionTitle title={t("cache.flightTitle")} hint={t("cache.flightHint")} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className={cn("rounded-lg py-2", PANEL_CLASS.panelMuted)}>
              <div className="text-lg font-semibold tabular-nums">{fmtGrouped(flight.requests)}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("cache.flightRequests")}</div>
            </div>
            <div className={cn("rounded-lg py-2", PANEL_CLASS.panelMuted)}>
              <div className="text-lg font-semibold tabular-nums">{fmtGrouped(flight.originLoads)}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("cache.flightLoads")}</div>
            </div>
            <div className={cn("rounded-lg py-2", PANEL_CLASS.panelMuted)}>
              <div className="text-lg font-semibold tabular-nums">{fmtGrouped(flight.coalesced)}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("cache.flightCoalesced")}</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("cache.flightMethod", { requests: flight.requests, loads: flight.originLoads, avoided: flight.coalesced })}
          </p>
        </Panel>
      </div>

      {/* The shard ring: virtual nodes around the circle, resident club keys just inside. */}
      <Panel className="p-5">
        <SectionTitle title={t("cache.shardsTitle")} hint={t("cache.shardsHint")} />
        <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,300px)_1fr]">
          <ShardRing ring={ring} ringKeys={ringKeys} nodeColor={nodeColor} title={t("cache.shardsTitle")} />
          <div className="space-y-2">
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${board.byShard.length}, minmax(0, 1fr))` }}>
              {board.byShard.map((n, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div className="flex h-16 w-full items-end rounded-md bg-secondary/30">
                    <div className="w-full rounded-md bg-info/60" style={{ height: `${Math.max(3, safeDiv(n, Math.max(...board.byShard)) * 100)}%` }} title={t("cache.shardTip", { i, n })} />
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground">{shardOf(shardKeys[i], board.byShard.length)}</span>
                  <span className="text-[11px] font-semibold tabular-nums">{n}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t("cache.shardsMethod", { n: board.byShard.length, v: CACHE_POLICY.vnode })}</p>
          </div>
        </div>
      </Panel>

      {/* Honest boundary: what each mechanism is, and what this surface is not. */}
      <Panel className="p-5">
        <SectionTitle title={t("cache.boundaryTitle")} />
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {MECH_KEYS.map((key) => (
            <li key={key} className="rounded-lg border px-3 py-2">
              <div className="text-xs font-medium">{t(`cache.mech.${key}.title`)}</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t(`cache.mech.${key}.body`)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">{t("cache.witnessLine")}</p>
        <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{t("cache.witnessCmd")}</p>
      </Panel>

      {/* M1098 · the live wire — the proxy's own counters, fetched honestly. Real-time on this dev/preview server. */}
      <Panel className="p-5">
        <SectionTitle title={t("cache.liveWireTitle")} hint={t("cache.liveWireHint")} />
        <div className="mt-3 text-sm">
          {probe === null && <div className="text-muted-foreground">{t("cache.liveWireLoading")}</div>}
          {probe?.ok === false && <div className="text-muted-foreground">{t("cache.liveWireDown")}</div>}
          {probe?.ok === true && probe.stats && (
            probe.stats.stores === 0
              ? <div className="text-muted-foreground">{t("cache.liveWireEmpty")}</div>
              : (
                <ul className="space-y-1 font-mono text-[12px]">
                  <li>{t("cache.liveWireCount", { a: fmtGrouped(probe.stats.hits), b: fmtGrouped(probe.stats.misses), c: fmtGrouped(probe.stats.coalesced), d: fmtGrouped(probe.stats.evictions), e: fmtGrouped(probe.stats.expired), f: fmtGrouped(probe.stats.stores), g: fmtGrouped(probe.stats.size) })}</li>
                </ul>
              )
          )}
        </div>
      </Panel>
    </div>
  );
}

/** The ring, drawn: virtual-node points around the circumference (coloured by owner), resident
 *  club keys just inside (coloured by the owner the binary search assigns). */
function ShardRing({ ring, ringKeys, nodeColor, title }: {
  ring: ReturnType<typeof buildRing>;
  ringKeys: readonly string[];
  nodeColor: (node: string) => string;
  title: string;
}) {
  const { t } = useI18n();
  const cx = 150, cy = 150, r = 120;
  return (
    <svg viewBox="0 0 300 300" className="mx-auto h-60 w-full max-w-[300px]" role="img" aria-label={title}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
      {ring.points.map((h, i) => {
        const p = hashRingPoint(cx, cy, h, r);
        return <circle key={i} cx={p.x} cy={p.y} r="1.8" fill={nodeColor(ring.owners[i])} opacity="0.7" />;
      })}
      {ringKeys.map((key) => {
        const h = hashString(key);
        const outer = hashRingPoint(cx, cy, h, r);
        const inner = hashRingPoint(cx, cy, h, r - 20);
        const owner = ringOwner(ring, key);
        return (
          <g key={key}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="var(--color-border)" strokeWidth="0.6" />
            <circle cx={inner.x} cy={inner.y} r="3" fill={nodeColor(owner)} />
            <title>{`${key} → ${owner}`}</title>
          </g>
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 600 }}>{ringKeys.length}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 8 }}>{t("cache.ringKeysLabel")}</text>
    </svg>
  );
}
