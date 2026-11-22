import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for old, new in [
    ('  "dress.overallN": "{n} overall",', '  "dress.overallN": "rated {n}",'),
    ('  "dress.playedN": "{n} played",', '  "dress.playedN": "from {n} matches",'),
    ('  "dress.briefing": "Briefing",', '  "dress.briefing": "Writing the briefing…",'),
    ('  "dress.overallN": "综合 {n}",', '  "dress.overallN": "评分 {n}",'),
    ('  "dress.playedN": "{n} 场",', '  "dress.playedN": "共 {n} 场",'),
    ('  "dress.briefing": "简报撰写中",', '  "dress.briefing": "正在写简报……",'),
    ('  "dress.overallN": "綜合 {n}",', '  "dress.overallN": "評分 {n}",'),
    ('  "dress.playedN": "{n} 場",', '  "dress.playedN": "共 {n} 場",'),
    ('  "dress.briefing": "簡報撰寫中",', '  "dress.briefing": "正在寫簡報……",'),
]:
    assert old in s, old[:40]
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("three dups differentiated")
