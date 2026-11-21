import io
p = "ui/TeachHint.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''        aria-label={t(open ? "teach.close" : "teach.open")}'''
new = '''        aria-label={t(open ? "teach.close" : read ? "teach.open" : "teach.newUnread")}'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("component uses teach.newUnread")

p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const APP_SRC_PIN = 226;", "const APP_SRC_PIN = 228; // M1229 The Teaching Hints: 226 -> 228 — domain/teachHint.ts and ui/TeachHint.tsx join the reader."),
  ("const TSX_PIN = 116;", "const TSX_PIN = 117; // M1229 The Teaching Hints: +1 ui/TeachHint.tsx."),
  ("const SRC_PIN = 229;", "const SRC_PIN = 231; // M1229 The Teaching Hints: 229 -> 231 — domain/teachHint.ts and ui/TeachHint.tsx join the dictionary-table reader."),
]
for old, new in subs:
    assert old in s, old
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("i18n pins paid")
