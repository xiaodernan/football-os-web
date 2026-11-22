import io
p = "features/ops/Ops.tsx"
s = io.open(p, encoding="utf-8").read()

# import the fold
old = '''import { foldPrescription, type Prescription } from "@/domain/prescription";'''
new = '''import { foldPrescription, type Prescription } from "@/domain/prescription";
import { trendRead, type TrendRead } from "@/domain/opsTrend";'''
assert old in s
s = s.replace(old, new, 1)

# the read, beside the existing fold
old = '''  const fold: PulseFold = useSeeded ? seededFold : deviceFold;'''
new = '''  const fold: PulseFold = useSeeded ? seededFold : deviceFold;
  // M1241 — the trend read: the fortnight's momentum projected forward, and the advice the
  // fold's own measured numbers rule. Deterministic; the model's version of this advice is the
  // prescription council's job, this is the arithmetic one.
  const trend: TrendRead = useMemo(() => trendRead({
    trend: fold.trend,
    bounceRate: fold.bounceRate,
    avgDepth: fold.avgDepth,
    loopRate: fold.loopRate,
  }), [fold.trend, fold.bounceRate, fold.avgDepth, fold.loopRate]);'''
assert old in s
s = s.replace(old, new, 1)

# the panel: history bars + forecast bars + advice
old = '''      {/* 14-day rhythm */}
      <Panel className="p-4">
        <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("ops.panel.trend")}</h2>
        <div className="mt-2 flex h-28 items-end gap-1">
          {fold.trend.map((d) => {
            const max = Math.max(1, ...fold.trend.map((x) => x.visits));
            return (
              <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t bg-info/80" style={{ height: `${(d.visits / max) * 88}%` }} title={formatDate(locale, d.day)} />
                <span className="text-[8px] text-muted-foreground">{d.day.slice(5)}</span>
              </div>
            );
          })}
          {fold.trend.length === 0 ? <span className="text-xs text-muted-foreground">{t("ops.empty")}</span> : null}
        </div>
      </Panel>'''
new = '''      {/* The fortnight, its projection, and what to do about it */}
      <Panel className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("ops.panel.trend")}</h2>
          <span className="font-mono text-[10px] text-muted-foreground">
            {t("ops.trend.weekAvg", { n: fmt2(trend.weekAvg) })} · {t("ops.trend.slope", { p: signed1(trend.slopePct) })}
          </span>
        </div>
        <div className="mt-2 flex h-28 items-end gap-1">
          {fold.trend.map((d) => {
            const max = Math.max(1, ...fold.trend.map((x) => x.visits), ...trend.forecast.map((x) => x.visits));
            return (
              <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t bg-info/80" style={{ height: `${(d.visits / max) * 88}%` }} title={formatDate(locale, d.day)} />
                <span className="text-[8px] text-muted-foreground">{d.day.slice(5)}</span>
              </div>
            );
          })}
          {fold.trend.length === 0 ? <span className="text-xs text-muted-foreground">{t("ops.empty")}</span> : null}
        </div>
        {/* The projection: the same scale, drawn lighter and dashed at the top, labelled. */}
        {fold.trend.length > 0 && (
          <div className="mt-2 border-t border-dashed border-border pt-2">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("ops.trend.forecastTitle")}</div>
            <div className="mt-1 flex h-14 items-end gap-1">
              {trend.forecast.map((d) => {
                const max = Math.max(1, ...fold.trend.map((x) => x.visits), ...trend.forecast.map((x) => x.visits));
                return (
                  <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1" title={formatDate(locale, d.day)}>
                    <div className="w-full rounded-t border border-dashed border-primary/60 bg-primary/15" style={{ height: `${(d.visits / max) * 80}%` }} />
                    <span className="text-[8px] text-muted-foreground">{d.day.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* The advice: codes worded through the dictionary, each with the number it fired on. */}
        <ul className="mt-3 space-y-1">
          {trend.advice.map((a) => (
            <li key={a.code} className="flex items-baseline gap-2 text-xs">
              <span className="font-mono text-primary">{t(`ops.trend.advice.${a.code}`)}</span>
              <span className="text-muted-foreground">{t(`ops.trend.advice.${a.code}.note`, { n: a.measure })}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-muted-foreground">{t("ops.trend.method")}</p>
      </Panel>'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ops trend panel deepened")
