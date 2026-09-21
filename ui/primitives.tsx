import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEMO_MODE } from "@/data/footballService";
import type { AsyncState } from "@/lib/hooks";

export function Panel({ className, children, glow }: { className?: string; children: ReactNode; glow?: boolean }) {
  return (
    <Card className={cn("relative overflow-hidden rounded-xl border bg-card/60 backdrop-blur", glow && "fo-glass", className)}>
      {children}
    </Card>
  );
}

export function SectionTitle({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold tracking-[0.14em] text-foreground/80 uppercase">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function DemoBadge() {
  if (!DEMO_MODE) return null;
  return (
    <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning font-mono text-[10px]">
      ● DEMO DATA · synthetic
    </Badge>
  );
}

export function StatTile({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "up" | "down" | "neutral" }) {
  return (
    <div className="rounded-lg border bg-card/50 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && (
        <div className={cn("mt-0.5 text-xs", tone === "up" && "text-success", tone === "down" && "text-destructive", (!tone || tone === "neutral") && "text-muted-foreground")}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Crest({ colors, short, size = 36 }: { colors?: [string, string]; short?: string; size?: number }) {
  const [a, b] = colors ?? ["#1f2937", "#111827"];
  return (
    <div
      className="grid shrink-0 place-items-center rounded-md font-bold text-white shadow-inner"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${a}, ${b})`, fontSize: size * 0.32 }}
      aria-hidden
    >
      {short}
    </div>
  );
}

export function PositionTag({ position }: { position: string }) {
  return <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-secondary-foreground">{position}</span>;
}

export function AttributeBar({ label, value, max = 99 }: { label: string; value: number; max?: number }) {
  const pct = Math.max(2, Math.min(100, (value / max) * 100));
  const color = value >= 78 ? "var(--color-success)" : value >= 62 ? "var(--color-info)" : value >= 48 ? "var(--color-warning)" : "var(--color-destructive)";
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0 truncate text-xs text-muted-foreground">{label}</div>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-8 shrink-0 text-right font-mono text-xs tabular-nums">{Math.round(value)}</div>
    </div>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", hint, icon }: { title?: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed py-12 text-center">
      <div className="text-3xl opacity-40">{icon ?? "◇"}</div>
      <div className="mt-2 text-sm font-medium">{title}</div>
      {hint && <div className="mt-1 max-w-xs text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function ErrorState({ error, retry }: { error?: Error | null; retry?: () => void }) {
  return (
    <div className="grid place-items-center rounded-xl border border-destructive/30 bg-destructive/5 py-10 text-center">
      <div className="text-sm font-medium text-destructive">Something went wrong</div>
      <div className="mt-1 max-w-sm text-xs text-muted-foreground">{error?.message ?? "Unexpected error while loading this view."}</div>
      {retry && (
        <Button size="sm" variant="outline" className="mt-3" onClick={retry}>
          Retry
        </Button>
      )}
    </div>
  );
}

/** Wraps an async resource into loading / error / empty / success — spec §11, §41. */
export function AsyncBoundary<T>({ state, skeleton, empty, render, minItems }: {
  state: AsyncState<T>;
  skeleton?: ReactNode;
  empty?: ReactNode;
  render: (data: T) => ReactNode;
  minItems?: (data: T) => boolean;
}) {
  if (state.status === "loading" || state.status === "idle") return <>{skeleton ?? <LoadingBlock />}</>;
  if (state.status === "error") return <ErrorState error={state.error} retry={state.reload} />;
  const data = state.data as T;
  if (minItems && !minItems(data)) return <>{empty ?? <EmptyState />}</>;
  return <>{render(data)}</>;
}

export function Sparkline({ points, className, stroke = "var(--color-primary)" }: { points: number[]; className?: string; stroke?: string }) {
  if (points.length < 2) return <div className={cn("h-10 rounded bg-secondary/50", className)} />;
  const w = 100;
  const h = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(h - ((p - min) / span) * h).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("h-8 w-full", className)} aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.8} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
