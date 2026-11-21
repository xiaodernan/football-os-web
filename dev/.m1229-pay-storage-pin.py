import io
p = "scripts/proof-storage.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_FILES_PIN = 224;"
new = "const APP_FILES_PIN = 225; // M1229 The Teaching Hints: 224 -> 225 — domain/teachHint.ts joins the scope (ui/ is outside this gate's eight directories)."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("storage pin paid")
