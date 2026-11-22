import io
p = "scripts/llm-proxy.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''    const [rSummary, rTables] = await Promise.all([
      fetch(`${url}/cache/league/stats`, { cache: "no-store", signal: AbortSignal.timeout(1200) }),
      fetch(`${url}/cache/league/table/stats`, { cache: "no-store", signal: AbortSignal.timeout(1200) }),
    ]);
    const stats = rSummary.ok ? await rSummary.json() : null;
    const tables = rTables.ok ? await rTables.json() : null;
    return { ok: true, reason: "ok", service: "football-os-cache", stats, tables };'''
new = '''    const [rSummary, rTables] = await Promise.all([
      fetch(`${url}/cache/league/stats`, { cache: "no-store", signal: AbortSignal.timeout(1200) }),
      fetch(`${url}/cache/league/table/stats`, { cache: "no-store", signal: AbortSignal.timeout(1200) }),
    ]);
    // Each leg reads its own body behind its own guard: one leg answering a body that will not
    // parse reads THAT leg as null — it must not take the whole probe down with it (the shape
    // proof-cache-wire caught on its first run).
    const readLeg = async (r) => {
      if (!r?.ok) return null;
      try { return await r.json(); } catch { return null; }
    };
    const stats = await readLeg(rSummary);
    const tables = await readLeg(rTables);
    return { ok: true, reason: "ok", service: "football-os-cache", stats, tables };'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("per-leg guard added")
