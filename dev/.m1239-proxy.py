import io
p = "scripts/llm-proxy.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''// Detect the live cache service — up to 1.2s per probe. Self-contained: no shared session, no
// shared keys, no drift. If you don't run it, this returns null and the caller reports "down|unset".
const probeService = async (base) => {
  if (!base) return { ok: false, reason: "unconfigured", service: null, stats: null };
  const url = normaliseServiceBase(base);
  try {
    const r = await fetch(`${url}/actuator/health`, { cache: "no-store", signal: AbortSignal.timeout(1200) });
    if (!r.ok) return { ok: false, reason: "upstream_down", service: null, stats: null };
    const r2 = await fetch(`${url}/cache/league/stats`, { cache: "no-store", signal: AbortSignal.timeout(1200) });
    const stats = r2.ok ? await r2.json() : null;
    return { ok: true, reason: "ok", service: "football-os-cache", stats };
  } catch (err) {
    return { ok: false, reason: err?.name === "AbortError" ? "timeout" : "unreachable", service: null, stats: null };
  }
};'''
new = '''// M1239 — the service carries TWO caches, so the wire reads BOTH stats: the league summary and the
// league tables. One census told half the story — the tables read-through is the one a season's
// worth of table reads actually lands in. Each probe is independently aborted (1.2s each) and the
// two stats fetches run in PARALLEL: the wall clock is the slowest leg, not the sum, the same
// "bound your blocking" discipline the fleet probe applies. If you don't run the service this
// returns the honest unconfigured/down envelope — never a fake live number.
const probeService = async (base) => {
  if (!base) return { ok: false, reason: "unconfigured", service: null, stats: null, tables: null };
  const url = normaliseServiceBase(base);
  try {
    const r = await fetch(`${url}/actuator/health`, { cache: "no-store", signal: AbortSignal.timeout(1200) });
    if (!r.ok) return { ok: false, reason: "upstream_down", service: null, stats: null, tables: null };
    const [rSummary, rTables] = await Promise.all([
      fetch(`${url}/cache/league/stats`, { cache: "no-store", signal: AbortSignal.timeout(1200) }),
      fetch(`${url}/cache/league/table/stats`, { cache: "no-store", signal: AbortSignal.timeout(1200) }),
    ]);
    const stats = rSummary.ok ? await rSummary.json() : null;
    const tables = rTables.ok ? await rTables.json() : null;
    return { ok: true, reason: "ok", service: "football-os-cache", stats, tables };
  } catch (err) {
    return { ok: false, reason: err?.name === "AbortError" ? "timeout" : "unreachable", service: null, stats: null, tables: null };
  }
};'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("proxy reads both caches")
