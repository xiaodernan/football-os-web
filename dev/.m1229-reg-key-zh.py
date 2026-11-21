import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for anchor, val in [
    ('  "set.key.coach": "教练履历公开设置",', '  "set.key.teach": "已读的教学",'),
    ('  "set.key.coach": "教練履歷公開設定",', '  "set.key.teach": "已讀的教學",'),
]:
    assert anchor in s, anchor
    s = s.replace(anchor, anchor + "\n" + val, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("labels done")
