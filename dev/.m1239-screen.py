import io
p = "features/cache/CacheObservatory.tsx"
s = io.open(p, encoding="utf-8").read()

old = '''  const [live, setLive] = useState(null as null | { ok: boolean; enabled?: boolean; stats?: Record<string, number | string | boolean | null> | null; error?: string; reason?: string | null });'''
new = '''  // M1239 — the envelope carries BOTH caches' censuses now (stats = the league summary,
  // tables = the league tables read-through), so the panel reads the whole cache tier, not half.
  const [live, setLive] = useState(null as null | { ok: boolean; enabled?: boolean; stats?: Record<string, number | string | boolean | null> | null; tables?: Record<string, number | string | boolean | null> | null; error?: string; reason?: string | null });'''
assert old in s
s = s.replace(old, new, 1)

old = '''        if (alive) setLive({ ok: r.ok && body?.ok === true, stats: body?.stats ?? null, reason: body?.reason ?? null });'''
new = '''        if (alive) setLive({ ok: r.ok && body?.ok === true, stats: body?.stats ?? null, tables: body?.tables ?? null, reason: body?.reason ?? null });'''
assert old in s
s = s.replace(old, new, 1)

old = '''          {live?.ok === true && live.stats && (
            <ul className="space-y-1 font-mono text-[12px]">
              <li>{t("cache.springLiveLine", { r: String(live.stats.requests ?? "0"), h: String(live.stats.hits ?? "0"), m: String(live.stats.misses ?? "0"), p: String(live.stats.hitRate ?? "0"), x: String(live.stats.originLoads ?? "0"), c: String(live.stats.coalesced ?? "0") })}</li>
            </ul>
          )}'''
new = '''          {live?.ok === true && live.stats && (
            <ul className="space-y-1.5 font-mono text-[12px]">
              <li>
                <span className="text-muted-foreground">{t("cache.springLiveSummary")}</span>{" "}
                {t("cache.springLiveLine", { r: String(live.stats.requests ?? "0"), h: String(live.stats.hits ?? "0"), m: String(live.stats.misses ?? "0"), p: String(live.stats.hitRate ?? "0"), x: String(live.stats.originLoads ?? "0"), c: String(live.stats.coalesced ?? "0") })}
              </li>
              {live.tables && (
                <li>
                  <span className="text-muted-foreground">{t("cache.springLiveTables")}</span>{" "}
                  {t("cache.springLiveLine", { r: String(live.tables.requests ?? "0"), h: String(live.tables.hits ?? "0"), m: String(live.tables.misses ?? "0"), p: String(live.tables.hitRate ?? "0"), x: String(live.tables.originLoads ?? "0"), c: String(live.tables.coalesced ?? "0") })}
                </li>
              )}
            </ul>
          )}'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("screen reads both caches")
