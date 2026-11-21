import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for old, new in [
    ('  "depth.tileAvg": "World average",', '  "depth.tileAvg": "Mean cliff",'),
    ('  "nav.depth": "The Cliff",', '  "nav.depth": "Squad Depth",'),
    ('  "depth.tileAvg": "世界平均",', '  "depth.tileAvg": "平均断层",'),
    ('  "nav.depth": "断层榜",', '  "nav.depth": "阵容深度",'),
    ('  "depth.tileAvg": "世界平均",', '  "depth.tileAvg": "平均斷層",'),
    ('  "nav.depth": "斷層榜",', '  "nav.depth": "陣容深度",'),
]:
    if old in s:
        s = s.replace(old, new, 1)
        print("replaced:", old[:40])
    else:
        print("NOT FOUND:", old[:40])
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
