import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for old, new in [
    ('  "nat.tileAvg": "World average",', '  "nat.tileAvg": "The world\'s mean",'),
    ('  "nat.tileAvg": "世界平均",', '  "nat.tileAvg": "世界均值",'),
    ('  "nat.tileAvg": "世界平均",', '  "nat.tileAvg": "世界均值",'),
]:
    if old in s:
        s = s.replace(old, new, 1)
        print("replaced:", old[:36])
    else:
        print("NOT FOUND:", old[:36])
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
