import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
subs = [
    ('  "nav.congestion": "The Congested Calendar",', '  "nav.congestion": "Congestion",'),
    ('  "nav.congestion": "魔鬼赛程",', '  "nav.congestion": "赛程密度",'),
    ('  "nav.congestion": "魔鬼賽程",', '  "nav.congestion": "賽程密度",'),
    ('  "con.daysN": "{n}d",\n', ''),
    ('  "con.daysN": "{n}天",\n', ''),
    ('  "con.daysN": "{n}天",\n', ''),
]
for old, new in subs:
    if old in s:
        s = s.replace(old, new, 1)
        print("replaced:", old[:44])
    else:
        print("NOT FOUND:", old[:44])
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
