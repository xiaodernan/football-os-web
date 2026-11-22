import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for anchor, val in [
    ('  "dress.v.offRecord": "a figure the record cannot carry",', '  "dress.v.tooLong": "the briefing runs past its budget",'),
    ('  "dress.v.offRecord": "记录承载不了的数字",', '  "dress.v.tooLong": "简报超出了长度预算",'),
    ('  "dress.v.offRecord": "紀錄承載不了的數字",', '  "dress.v.tooLong": "簡報超出了長度預算",'),
]:
    assert anchor in s, anchor[:40]
    s = s.replace(anchor, anchor + "\n" + val, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("tooLong keyed")
