import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, CHIP_CLASS, PANEL_CLASS, Mini } from "@/ui/primitives";
import { cn, fmtGrouped, hashRingPoint } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";
import { hashString } from "@/lib/rng";
import {
  QUEUE_POLICY,
  MECH_KEYS,
  matchMessages,
  deliverQueue,
  rawBackoff,
  backoffDelay,
  buildHashRing,
  ringOwner,
  ringMigration,
  shardOf,
  backpressureSignal,
  admitMessages,
} from "@/domain/queue";

/**
 * M1059: the message pipeline observatory — the delivery layer drawn from the same fold the proof
 * recounts. Nothing here re-derives a number: the board, the ring, the backoff ladder and the
 * backpressure trace all come from domain/queue.ts, so the picture cannot disagree with the proof.
 *
 * It is an ANALYSIS surface, not a live console: PLATFORM_LIVE is false, these fixtures are the
 * seeded world's finished matches replayed as messages, and the fault injection is a stated,
 * deterministic plan — not traffic from a broker. The page says all of that out loud.
 */

const NODES = ["eu-west", "eu-central", "us-east"];
const NODE_FILL = ["var(--color-primary)", "var(--color-info)", "var(--color-success)"];

export function QueueObservatory() {
  const { t } = useI18n();

  // The world's finished fixtures, replayed as an ordered message stream.
  const messages = useMemo(() => matchMessages(footballProvider.matches()), []);
  // A stated fault plan: every 11th fixture NACKs once, every 29th twice. Deterministic, so the
  // board is byte-identical run to run and the proof can recount it.
  const failures = useMemo(() => {
    const plan: Record<string, number> = {};
    messages.forEach((m, i) => {
      if (i % 29 === 0) plan[m.id] = 2;
      else if (i % 11 === 0) plan[m.id] = 1;
    });
    return plan;
  }, [messages]);
  const board = useMemo(() => deliverQueue(messages, QUEUE_POLICY, failures), [messages, failures]);

  // The hash ring and a few real club keys placed on it.
  const ring = useMemo(() => buildHashRing(NODES, QUEUE_POLICY.vnode), []);
  const ringKeys = useMemo(() => messages.slice(0, 14).map((m) => m.key), [messages]);
  const nodeColor = (node: string) => NODE_FILL[Math.max(0, NODES.indexOf(node))] ?? NODE_FILL[0];

  // Expansion witness: grow from 3 regions to 4. The consistent-hash ring moves only the keys on
  // the new node's arc; a modulo sharder re-maps every key whose hash changes bucket. Both counts
  // read the same ring fold / hash, so the picture cannot disagree with proof-message-queue.
  const migration = useMemo(() => {
    const grown = [...NODES, "ap-south"];
    const ringGrown = buildHashRing(grown, QUEUE_POLICY.vnode);
    const moved = ringMigration(ring, ringGrown, ringKeys);
    // The modulo foil uses the fold's OWN shardOf (no re-derivation, no Math.abs): growing 3->4
    // regions re-maps every key whose shard bucket changes, the comparison the proof recounts.
    const modulo = ringKeys.filter((k) => shardOf(k, NODES.length) !== shardOf(k, grown.length)).length;
    return { moved, modulo, grown: grown.length, keys: ringKeys.length };
  }, [ring, ringKeys]);

  // The backoff ladder: the raw exponential plus six jittered samples per rung.
  const ladder = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const attempt = i + 1;
    const raw = rawBackoff(attempt, QUEUE_POLICY.baseDelay, QUEUE_POLICY.capDelay);
    const samples = Array.from({ length: 6 }, (_, s) => backoffDelay(attempt, QUEUE_POLICY.baseDelay, QUEUE_POLICY.capDelay, QUEUE_POLICY.seed, `probe-${s}`));
    return { attempt, raw, samples };
  }), []);
  const ladderPeak = Math.max(...ladder.map((r) => r.raw), 1);

  // A labelled, synthetic depth trace that shows the hysteresis band doing its job.
  const trace = useMemo(() => [70, 50, 30, 50, 30, 50, 30, 50, 30, 50, 30, 50, 10], []);
  const pressure = useMemo(() => backpressureSignal(trace, QUEUE_POLICY.highWater, QUEUE_POLICY.lowWater), [trace]);
  const tracePeak = Math.max(...trace, QUEUE_POLICY.highWater);

  // Admission control over the real message stream: replay the depth trace cyclically as the queue
  // depth seen before each arrival, then let the fold decide which fixtures the gate would accept.
  // The gate state comes from the same backpressureSignal the SVG above draws.
  const admission = useMemo(() => {
    const batch = messages.slice(0, 120);
    const depths = batch.map((_, i) => trace[i % trace.length]);
    const { admitted, rejected } = admitMessages(batch, depths, QUEUE_POLICY.highWater, QUEUE_POLICY.lowWater);
    return { admitted: admitted.length, rejected: rejected.length, of: batch.length };
  }, [messages, trace]);

  const shardPeak = Math.max(...board.byShard, 1);
  const throughput = board.delivered.length + board.deadLettered.length;

  return (
    <div className="space-y-5">
      <Panel className="p-5">
        <SectionTitle title={t("messaging.title")} hint={t("messaging.subtitle")} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className={cn(CHIP_CLASS.muted, "rounded-full px-2 py-0.5 text-[11px] uppercase tracking-widest")}>
            {t("messaging.analysisBadge")}
          </span>
          <span className="text-[11px] uppercase tracking-widest text-primary">{t("messaging.notLive")}</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t("messaging.liveLine")}</p>
      </Panel>

      {/* The board, read straight off the fold. */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Mini label={t("messaging.statDelivered")} value={fmtGrouped(board.delivered.length)} />
        <Mini label={t("messaging.statTries")} value={fmtGrouped(board.attempts)} />
        <Mini label={t("messaging.statRetries")} value={fmtGrouped(board.retries)} />
        <Mini label={t("messaging.statThroughput")} value={fmtGrouped(throughput)} />
        <Mini label={t("messaging.statDead")} value={fmtGrouped(board.deadLettered.length)} />
        <Mini label={t("messaging.statDup")} value={fmtGrouped(board.duplicates.length)} />
        <Mini label={t("messaging.statPeak")} value={fmtGrouped(board.peakDepth)} />
        <Mini label={t("messaging.statShards")} value={`${board.byShard.filter((n) => n > 0).length}/${board.byShard.length}`} />
      </div>

      {/* Consistent-hash ring: virtual nodes around the circle, real club keys just inside. */}
      <Panel className="p-5">
        <SectionTitle title={t("messaging.ringTitle")} hint={t("messaging.ringHint")} />
        <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
          <RingViz ring={ring} ringKeys={ringKeys} nodeColor={nodeColor} />
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              {NODES.map((node) => (
                <span key={node} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: nodeColor(node) }} />
                  <span className="font-mono">{node}</span>
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t("messaging.ringMethod")}</p>
            <div className="grid gap-2 grid-cols-3">
              {NODES.map((node) => {
                const owned = ringKeys.filter((k) => ringOwner(ring, k) === node).length;
                return (
                  <div key={node} className={cn("rounded-lg px-2 py-1.5", PANEL_CLASS.panelMuted)}>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">{node}</div>
                    <div className="text-lg font-semibold tabular-nums">{owned}</div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">{t("messaging.ringOwn", { n: ringKeys.length, v: QUEUE_POLICY.vnode })}</p>
            <p className="text-[11px] text-muted-foreground">
              {t("messaging.migrateLine", { keys: migration.keys, from: NODES.length, to: migration.grown, moved: migration.moved, modulo: migration.modulo })}
            </p>
          </div>
        </div>
      </Panel>

      {/* The backoff ladder: exponential height, full-jitter scatter. */}
      <Panel className="p-5">
        <SectionTitle title={t("messaging.backoffTitle")} hint={t("messaging.backoffHint")} />
        <div className="mt-3 overflow-x-auto">
          <svg viewBox="0 0 640 180" className="h-44 w-full" role="img" aria-label={t("messaging.backoffTitle")}>
            <line x1="30" y1="16" x2="630" y2="16" stroke="var(--color-border)" strokeDasharray="4 4" />
            <text x="30" y="12" className="fill-muted-foreground" style={{ fontSize: 9 }}>{t("messaging.capLine", { cap: QUEUE_POLICY.capDelay })}</text>
            {ladder.map((rung, i) => {
              const x = 30 + i * ((600) / ladder.length);
              const w = (600 / ladder.length) * 0.5;
              const h = (rung.raw / ladderPeak) * 140;
              return (
                <g key={rung.attempt}>
                  <rect x={x} y={160 - h} width={w} height={h} rx="3" fill="var(--color-primary)" opacity="0.28" />
                  {rung.samples.map((s, j) => {
                    const sy = 160 - (s / ladderPeak) * 140;
                    const sx = x + (w / (rung.samples.length + 1)) * (j + 1);
                    return <circle key={j} cx={sx} cy={sy} r="2.6" fill="var(--color-primary)" />;
                  })}
                  <text x={x + w / 2} y="174" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>#{rung.attempt}</text>
                  <text x={x + w / 2} y={154 - h} textAnchor="middle" className="fill-foreground" style={{ fontSize: 9 }}>{rung.raw}</text>
                  <title>{t("messaging.rungTip", { n: rung.attempt, raw: rung.raw })}</title>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t("messaging.backoffMethod", { base: QUEUE_POLICY.baseDelay, cap: QUEUE_POLICY.capDelay })}</p>
      </Panel>

      {/* Backpressure hysteresis: the two water marks and the gate's state. */}
      <Panel className="p-5">
        <SectionTitle title={t("messaging.pressureTitle")} hint={t("messaging.pressureHint")} />
        <div className="mt-3 overflow-x-auto">
          <svg viewBox="0 0 640 180" className="h-44 w-full" role="img" aria-label={t("messaging.pressureTitle")}>
            {/* hysteresis band */}
            <rect x="30" y={160 - (QUEUE_POLICY.highWater / tracePeak) * 140} width="600" height={((QUEUE_POLICY.highWater - QUEUE_POLICY.lowWater) / tracePeak) * 140} fill="var(--color-warning)" opacity="0.08" />
            {[QUEUE_POLICY.highWater, QUEUE_POLICY.lowWater].map((mark) => {
              const y = 160 - (mark / tracePeak) * 140;
              return (
                <g key={mark}>
                  <line x1="30" y1={y} x2="630" y2={y} stroke="var(--color-warning)" strokeDasharray="4 4" opacity="0.7" />
                  <text x="634" y={y + 3} className="fill-muted-foreground" style={{ fontSize: 9 }}>{mark}</text>
                </g>
              );
            })}
            {trace.map((d, i) => {
              const step = 600 / trace.length;
              const x = 30 + i * step;
              const y = 160 - (d / tracePeak) * 140;
              const open = pressure.open[i];
              return (
                <g key={i}>
                  <circle cx={x + step / 2} cy={y} r="3.4" fill={open ? "var(--color-destructive)" : "var(--color-success)"} />
                  <rect x={x + 1} y="164" width={step - 2} height="5" rx="1" fill={open ? "var(--color-destructive)" : "var(--color-success)"} opacity="0.8" />
                  <title>{`${d} · ${open ? t("messaging.gateClosed") : t("messaging.gateOpen")}`}</title>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("messaging.pressureMethod", { high: QUEUE_POLICY.highWater, low: QUEUE_POLICY.lowWater, flips: pressure.transitions, shed: pressure.shed })}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t("messaging.admitLine", { admitted: admission.admitted, rejected: admission.rejected, of: admission.of })}
        </p>
      </Panel>

      {/* Per-shard delivery load. */}
      <Panel className="p-5">
        <SectionTitle title={t("messaging.shardsTitle")} hint={t("messaging.shardsHint")} />
        <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${board.byShard.length}, minmax(0, 1fr))` }}>
          {board.byShard.map((n, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end rounded-md bg-secondary/30">
                <div className="w-full rounded-md bg-info/60" style={{ height: `${Math.max(3, (n / shardPeak) * 100)}%` }} title={t("messaging.shardTip", { i, n })} />
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">{i}</span>
              <span className="text-xs font-semibold tabular-nums">{n}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("messaging.shardsMethod", { n: board.byShard.length })}</p>
      </Panel>

      {/* The delivery timeline — the first slice of the board, in clock order. */}
      <Panel className="p-5">
        <SectionTitle title={t("messaging.timelineTitle")} hint={t("messaging.timelineHint")} />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-1.5 font-medium">{t("messaging.colId")}</th>
                <th className="py-1.5 font-medium">{t("messaging.colShard")}</th>
                <th className="py-1.5 font-medium">{t("messaging.colAttempt")}</th>
                <th className="py-1.5 font-medium">{t("messaging.colDelay")}</th>
                <th className="py-1.5 font-medium">{t("messaging.colAt")}</th>
              </tr>
            </thead>
            <tbody>
              {board.delivered.slice(0, 12).map((d, i) => (
                <tr key={d.id} className={cn("border-b border-border/50", i % 2 && "bg-secondary/20")}>
                  <td className="py-1.5 font-mono">{d.id}</td>
                  <td className="py-1.5 font-mono tabular-nums">{d.shard}</td>
                  <td className="py-1.5 tabular-nums">{d.attempt > 1
                    ? <span className={cn("rounded px-1.5 py-0.5", CHIP_CLASS.warning)}>×{d.attempt}</span>
                    : <span className="text-muted-foreground">1</span>}</td>
                  <td className="py-1.5 font-mono tabular-nums">{d.delay}ms</td>
                  <td className="py-1.5 font-mono tabular-nums text-muted-foreground">{d.at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{t("messaging.timelineMore", { n: board.delivered.length })}</p>
      </Panel>

      {/* Honest boundary: what each mechanism is and what this surface is not. */}
      <Panel className="p-5">
        <SectionTitle title={t("messaging.boundaryTitle")} />
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {MECH_KEYS.map((key) => (
            <li key={key} className="rounded-lg border px-3 py-2">
              <div className="text-xs font-medium">{t(`messaging.mech.${key}.title`)}</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t(`messaging.mech.${key}.body`)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">{t("messaging.witnessLine")}</p>
        <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{t("messaging.witnessCmd")}</p>
      </Panel>
    </div>
  );
}

/** The ring, drawn: vnode points around the circumference (coloured by owner), real club keys
 *  just inside it (coloured by the owner the binary search assigns). A key's owner is the first
 *  vnode clockwise, so the colour of the inner dot must match the arc of nodes it sits behind. */
function RingViz({ ring, ringKeys, nodeColor }: {
  ring: ReturnType<typeof buildHashRing>;
  ringKeys: readonly string[];
  nodeColor: (node: string) => string;
}) {
  const { t } = useI18n();
  const cx = 160, cy = 160, r = 128;
  return (
    <svg viewBox="0 0 320 320" className="mx-auto h-64 w-full max-w-[320px]" role="img" aria-label={t("messaging.ringTitle")}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
      {ring.points.map((h, i) => {
        const p = hashRingPoint(cx, cy, h, r);
        return <circle key={i} cx={p.x} cy={p.y} r="2" fill={nodeColor(ring.owners[i])} opacity="0.75" />;
      })}
      {ringKeys.map((key) => {
        const h = hashString(key);
        const outer = hashRingPoint(cx, cy, h, r);
        const inner = hashRingPoint(cx, cy, h, r - 22);
        return (
          <g key={key}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="var(--color-border)" strokeWidth="0.7" />
            <circle cx={inner.x} cy={inner.y} r="3.2" fill={nodeColor(ringOwner(ring, key))} />
            <title>{`${key} → ${ringOwner(ring, key)}`}</title>
          </g>
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 600 }}>{ringKeys.length}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 9 }}>{t("messaging.ringKeysLabel")}</text>
    </svg>
  );
}
