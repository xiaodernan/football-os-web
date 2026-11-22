import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const SK_TEXT_CHILD_PIN = 30;"
new = "const SK_TEXT_CHILD_PIN = 31; // M1236 The Match Reporter: the goal chips' map reads e.type through a filter (GOAL only) — +1 text child, charged bare nowhere."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pin paid")
