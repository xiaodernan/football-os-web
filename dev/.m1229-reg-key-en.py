import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
anchor = '  "set.key.coach": "Coach profile visibility",'
assert anchor in s
s = s.replace(anchor, anchor + '\n  "set.key.teach": "Lessons you have read",', 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("en label added")
