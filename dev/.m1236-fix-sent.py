import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for old, new in [
    ('  "rep.v.prediction": "a prediction about the future",', '  "rep.v.prediction": "a claim about a match not yet played",'),
    ('  "rep.v.prediction": "对未来的预言",', '  "rep.v.prediction": "对尚未进行的比赛的断言",'),
    ('  "rep.v.prediction": "對未來的預言",', '  "rep.v.prediction": "對尚未進行的比賽的斷言",'),
]:
    assert old in s, old[:40]
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("differentiated")
