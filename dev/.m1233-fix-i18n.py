import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for old, new in [
    ('  "chair.def": "Defence",', '  "chair.def": "Defenders",'),
    ('  "chair.mid": "Midfield",', '  "chair.mid": "Midfielders",'),
    ('  "chair.att": "Attack",', '  "chair.att": "Forwards",'),
    ('  "chair.def": "后卫",', '  "chair.def": "后卫线",'),
    ('  "chair.mid": "中场",', '  "chair.mid": "中场线",'),
    ('  "chair.att": "前锋",', '  "chair.att": "前锋线",'),
    ('  "chair.def": "後衛",', '  "chair.def": "後衛線",'),
    ('  "chair.mid": "中場",', '  "chair.mid": "中場線",'),
    ('  "chair.att": "前鋒",', '  "chair.att": "前鋒線",'),
]:
    assert old in s, old
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("line labels differentiated")

p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
import re
m = re.search(r"const DYN_SITES = \[", s)
# find the closing "];" of the array
i = s.find("];", m.end())
old = s[m.start():i+2]
new_entry = '''  // M1233 The Selection Chair: the refusal badges interpolate a ChairViolation code, whose value
  // space is the union in domain/selectionChair.ts — read out of the table, not written down again.
  { path: "features/chair/SelectionChair.tsx", expr: "v", prefix: "chair.v.", suffix: "" },
];'''
s = s[:m.start()] + "const DYN_SITES = [" + old[len("const DYN_SITES = ["):-2].rstrip() + "\n" + new_entry + s[i+2:]
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("DYN_SITE declared")
