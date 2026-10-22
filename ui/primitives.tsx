import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn, clamp } from "@/lib/utils";
import { DEMO_MODE } from "@/data/footballService";
import { useI18n } from "@/i18n";
import { positionLabel, rowLine } from "@/domain/rowText";
import { deltaSign } from "@/domain/attributes";
import type { DeltaSign } from "@/domain/attributes";
import type { Tone } from "@/domain/types";
import type { LoadZone } from "@/domain/load";
import type { Dna } from "@/domain/playerDna";

export function Panel({ className, children, glow }: { className?: string; children: ReactNode; glow?: boolean }) {
  return (
    <Card className={cn("relative overflow-hidden rounded-xl backdrop-blur", PANEL_CLASS.panelDeep, glow && "fo-glass", className)}>
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
  const { t } = useI18n();
  if (!DEMO_MODE) return null;
  return (
    <Badge variant="outline" className={cn(CHIP_CLASS.warning, "font-mono text-[10px]")}>
      ● {t("common.demo")} · {t("common.synthetic")}
    </Badge>
  );
}

/** The TILE's own direction: which way a figure moved, as the stat tile shows it. It is the tile's
 *  vocabulary and the tile's contract, so it is named here — but named, so the screens that hand a
 *  tone to a tile write the three words once rather than at each call. */
export type TileTone = "up" | "down" | "neutral";

export function StatTile({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: TileTone }) {
  return (
    <div className={cn("rounded-lg px-4 py-3", PANEL_CLASS.panelMuted)}>
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

// The app's colours for a DIFFERENCE — the green a gain wears, the red a loss wears and the grey a
// figure that did not move. The three classes were spelled in three files: the entity detail's
// category difference, the scouting panel's best and worst edge, and the watchlist board's two
// copies of the same two edges. So the app could have shown the same figure in green on one screen
// and in grey on another, and a change to the palette would have had to be made in three places.
//
// The QUESTION — which way does the difference point — is the domain's (attributes.ts's
// deltaSign); the classes are the app's, and they live here with the other shared UI vocabulary.
export const DELTA_CLASS: Record<DeltaSign, string> = {
  up: "text-success",
  down: "text-destructive",
  flat: "text-muted-foreground",
};

// The BEST edge of a player is an advantage or nothing: it is green when it is an advantage and
// grey when it is not, and it is never red — a red "best" would be a lie about the best thing a
// player has going for them.
export const bestEdgeTone = (d: number): string =>
  deltaSign(d) === "up" ? DELTA_CLASS.up : DELTA_CLASS.flat;

// The WORST edge is a disadvantage or nothing: red when it is a disadvantage, grey when it is not,
// and never green.
export const worstEdgeTone = (d: number): string =>
  deltaSign(d) === "down" ? DELTA_CLASS.down : DELTA_CLASS.flat;

// The app's colours for a TONE. The domain's judgement of how a table position sits is a tone —
// "good", "mixed" or "bad" — and the app has three classes for it: green for good, blue for
// mixed, red for bad. The mapping was spelled twice in the manager screen, once for the season
// summary's honour and once for the outlook's zone, with the same three words in the same order,
// and the manager's own metric component spelled two arms of it a third time.
//
// The TONE is the domain's (career.ts's zone and honour tables, and the type lives in
// domain/types.ts so the words are written once); the colour it wears is the app's, and it lives
// here with the rest of the shared vocabulary.
export const TONE_CLASS: Record<Tone, string> = {
  good: "text-success",
  mixed: "text-info",
  bad: "text-destructive",
};

// The app's CHIP: the border, the wash and the word a tone wears. A chip is the app's smallest
// coloured badge, and the same chip was spelled out in many places: the load module's four zone
// chips, the news module's three certainty chips and the review screen's three kind chips each
// wrote the same three class strings, the muted chip ("border-border text-muted-foreground") was
// written out five times, and the chip an option wears when you have PICKED it — "border-primary
// bg-primary/10 text-primary" — was written out sixteen times, in nine screens, each one a copy of
// the others. So the app could wear a caution in one colour on one screen and in another colour on
// the next, and moving a chip off its colour in one place would have left the other two disagreeing
// about what it looks like.
//
// The chip is the app's, and it lives here with the other shared UI vocabulary: the DOMAIN says
// what a chip MEANS (a load zone, a news certainty, a review kind) and the UI says what it wears.
export const CHIP_CLASS = {
  // The tone chips: a border, a wash and a word, all of one colour.
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  primary: "border-primary/40 bg-primary/10 text-primary",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-info/40 bg-info/10 text-info",
  // The muted chips: a border and a word, with no colour of their own.
  muted: "border-border text-muted-foreground",
  mutedSoft: "border-border bg-secondary/30 text-muted-foreground",
  // The badges: a border and a word of ONE colour, with no wash. The amber badge alone was written
  // out in seven places and the green one in five.
  badgeSuccess: "border-success/40 text-success",
  badgeWarning: "border-warning/40 text-warning",
  badgePrimary: "border-primary/40 text-primary",
  badgeSuccessStrong: "border-success/50 text-success",
  badgeWarningStrong: "border-warning/50 text-warning",
  badgeInfoStrong: "border-info/50 text-info",
  // The option you have picked wears a full-strength border; the ones you have not wear muted
  // words that turn primary when you point at them.
  optionOn: "border-primary bg-primary/10 text-primary",
  optionOff: "text-muted-foreground hover:border-primary/40",
  // The filter chip's two states: the one in force, and the ones you could turn on. A filter in
  // force wears a stronger border than a tone chip, and a filter at rest keeps a border of its own.
  filterOn: "border-primary/50 bg-primary/10 text-primary",
  filterOff: "border-border/60 text-muted-foreground hover:border-primary/30",
  // The LABEL — a wash and a word with NO border — and its mirror, the MARK: a full-strength
  // border and a wash with NO word. The app wore the primary wash on thirteen icon plates and the
  // "yours" chip, the neutral wash twice, and the answer's border-and-wash once per answer.
  labelPrimary: "bg-primary/15 text-primary",
  labelPrimary20: "bg-primary/20 text-primary",
  labelPrimaryForeground: "bg-primary/10 text-foreground",
  labelSuccess: "bg-success/20 text-success",
  labelSuccess10: "bg-success/10 text-success",
  labelDestructive: "bg-destructive/20 text-destructive",
  labelInfo: "bg-info/20 text-info",
  labelMuted: "bg-muted text-muted-foreground",
  labelSecondary: "bg-secondary text-muted-foreground",
  labelSidebarPrimary: "bg-sidebar-primary/15 text-sidebar-primary",
  labelBorderSuccess: "border-success bg-success/10",
  labelBorderDestructive: "border-destructive bg-destructive/10",
  labelBorderPrimary: "border-primary bg-primary/10",
  labelBorderPrimarySoft: "border-primary bg-primary/5",
} as const;

// The PANEL: the app's own quiet box — a border and a wash of one of its quiet surfaces, with no
// word of its own. A bare `border` IS the border colour in Tailwind (the width class with the
// theme's border colour), so the panel's border rides with its wash and the reader can see it.
//
// The app drew its panels in FOUR strengths of the card surface, and each strength was used
// consistently for its own kind of panel — so the four are named rather than merged. A panel's
// LAYOUT (its radius, its padding, its size) stays at the screen that draws it; only the colour
// is the app's.
export const PANEL_CLASS = {
  panelFaint: "border bg-card/30",
  panelSoft: "border bg-card/40",
  panelMuted: "border bg-card/50",
  panelDeep: "border bg-card/60",
  panelPlain: "border bg-card",
  panelGhost: "border-border/60 bg-secondary/20",
  panelDim: "border-border/50 bg-secondary/10",
  panelQuiet: "border bg-secondary/20",
} as const;

// The load ZONE's chip: what the four action zones wear. The `none` state is deliberately NOT
// here — it is presentational, and the /load banner carries a subtle secondary fill a bare chip
// does not, so each caller supplies its own `none` and spreads these four. Excluding `none` is the
// point: the type will not let a caller forget the divergence is intentional by re-adding it to
// the shared map.
export const ZONE_CLASS: Record<Exclude<LoadZone, "none">, string> = {
  under: CHIP_CLASS.primary,
  optimal: CHIP_CLASS.success,
  caution: CHIP_CLASS.warning,
  high: CHIP_CLASS.destructive,
};

// The compact stat tile: a bold figure ABOVE a small uppercase label, in a tighter px-2 py-1.5 box than
// StatTile's label-first px-4 py-3 card. DataRoom's per-team tiles and ProfilePage's progress tiles each
// carried a byte-identical private `Mini` — only the `value` prop's declared type differed (number vs
// ReactNode; `value` is only ever rendered as `{value}`, so ReactNode, the superset, is behaviour-
// preserving for both). NOTE this is NOT StatTile: that one prints label first, reserves a larger type
// scale, and carries `sub`/`tone`; folding Mini into it would flip the visual order and gain a line no
// caller passes, so the two tiles coexist on purpose.
export function Mini({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={cn("rounded-lg px-2 py-1.5", PANEL_CLASS.panelMuted)}>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
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
  const { t } = useI18n();
  return <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-secondary-foreground">{positionLabel(position, t)}</span>;
}

export function AttributeBar({ label, value, max = 99 }: { label: string; value: number; max?: number }) {
  const pct = clamp((value / max) * 100, 2, 100);
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

export function DnaCard({ dna, note, fallbackLabel, fallbackNote, bare }: { dna?: Dna | null; note?: ReactNode; fallbackLabel?: string; fallbackNote?: ReactNode; bare?: boolean }) {
  const { t } = useI18n();
  // Without a vector there is no honest archetype read, so the caller passes the
  // dataset's stored primary label and the card states what is missing rather
  // than inventing a secondary archetype.
  // The two branches carry an identical heading, so it is written once here instead
  // of twice — which is also why it went unnoticed: a duplicated literal is the one
  // form a per-file debt count reports as two.
  const heading = !bare && (
    <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("dna.title")}</div>
  );
  const body = !dna ? (
    <>
      {heading}
      <div className="mt-1 text-lg font-semibold text-primary">{fallbackLabel ?? "—"}</div>
      {fallbackNote && <p className="mt-1 text-xs text-muted-foreground">{fallbackNote}</p>}
    </>
  ) : (
    <>
      {heading}
      <div className="mt-1 text-lg font-semibold text-primary">{t(`dna.arch.${dna.primary.id}`)}</div>
      <p className="text-xs text-muted-foreground">{t(`dna.blurb.${dna.primary.id}`)}</p>
      <div className="mt-2 text-xs">
        {t("dna.secondary")} <span className="font-medium">{t(`dna.arch.${dna.secondary.id}`)}</span>
        <span className="text-muted-foreground"> · {rowLine(dna.evolution, t)}</span>
      </div>
      {note && <p className="mt-2 text-[11px] text-muted-foreground">{note}</p>}
    </>
  );
  // `bare` lets the card drop its own frame and header so it can sit inside a
  // Panel that already supplies a title, instead of nesting box inside box.
  if (bare) return <div>{body}</div>;
  return <div className={cn("rounded-lg p-3", PANEL_CLASS.panelSoft)}>{body}</div>;
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2.5" role="status" aria-label={t("cta.loading")}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, icon }: { title?: string; hint?: string; icon?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="grid place-items-center rounded-xl border border-dashed py-12 text-center">
      <div className="text-3xl opacity-40">{icon ?? "◇"}</div>
      <div className="mt-2 text-sm font-medium">{title ?? t("common.empty")}</div>
      {hint && <div className="mt-1 max-w-xs text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function ErrorState({ error, retry }: { error?: Error | null; retry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="grid place-items-center rounded-xl border border-destructive/30 bg-destructive/5 py-10 text-center">
      <div className="text-sm font-medium text-destructive">{t("common.error")}</div>
      <div className="mt-1 max-w-sm text-xs text-muted-foreground">{error?.message ?? t("common.errorDetail")}</div>
      {retry && (
        <Button size="sm" variant="outline" className="mt-3" onClick={retry}>
          {t("cta.retry")}
        </Button>
      )}
    </div>
  );
}

