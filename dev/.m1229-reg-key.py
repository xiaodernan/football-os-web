import io
p = "domain/localData.ts"
s = io.open(p, encoding="utf-8").read()
old = 'import { LEARN_STORE_KEY } from "./learn";'
new = 'import { LEARN_STORE_KEY } from "./learn";\n// M1229: the teaching-hint seen-ledger — a preference (what you have read survives an activity reset).\nimport { TEACH_SEEN_KEY } from "./teachHint";'
assert old in s
s = s.replace(old, new, 1)
old2 = '  { key: COACH_KEY, labelKey: "set.key.coach", kind: "preference" },'
new2 = '  { key: COACH_KEY, labelKey: "set.key.coach", kind: "preference" },\n  { key: TEACH_SEEN_KEY, labelKey: "set.key.teach", kind: "preference" },'
assert old2 in s
s = s.replace(old2, new2, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for anchor, val in [
    ('  "set.key.coach": "Coach profile visibility",', '  "set.key.teach": "Lessons you have read",'),
    ('  "set.key.coach": "教练履历可见范围",', '  "set.key.teach": "已读的教学",'),
    ('  "set.key.coach": "教練履歷可見範圍",', '  "set.key.teach": "已讀的教學",'),
]:
    assert anchor in s, anchor
    s = s.replace(anchor, anchor + "\n" + val, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("localData + labels done")
