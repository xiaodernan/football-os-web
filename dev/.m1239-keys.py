import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for anchor, val in [
    ('  "cache.springLiveLine": "requests {r} · hits {h} · misses {m} · hit-rate {p}% · origin loads {x} · coalesced {c}",',
     '  "cache.springLiveSummary": "League summary",\n  "cache.springLiveTables": "League tables",'),
    ('  "cache.springLiveLine": "请求 {r} · 命中 {h} · 未命中 {m} · 命中率 {p}% · 源回 {x} 次 · 合并 {c}",',
     '  "cache.springLiveSummary": "联赛摘要缓存",\n  "cache.springLiveTables": "联赛积分榜缓存",'),
    ('  "cache.springLiveLine": "請求 {r} · 命中 {h} · 未命中 {m} · 命中率 {p}% · 源回 {x} 次 · 合併 {c}",',
     '  "cache.springLiveSummary": "聯賽摘要快取",\n  "cache.springLiveTables": "聯賽積分榜快取",'),
]:
    assert anchor in s, anchor[:50]
    s = s.replace(anchor, anchor + "\n" + val, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("keys added")
