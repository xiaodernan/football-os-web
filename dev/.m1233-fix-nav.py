import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for old, new in [
    ('  "nav.chair": "The Selection Chair",', '  "nav.chair": "Selection Chair",'),
    ('  "nav.chair": "选人席",', '  "nav.chair": "选人",'),
    ('  "nav.chair": "選人席",', '  "nav.chair": "選人",'),
]:
    assert old in s, old
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("nav.chair differentiated")
