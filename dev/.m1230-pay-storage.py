import io
p = "scripts/proof-storage.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_FILES_PIN = 225;"
new = "const APP_FILES_PIN = 226; // M1230 The First-Run Guide: 225 -> 226 — domain/firstRunGuide.ts joins the scope (ui/ is outside this gate's eight directories)."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("storage pin paid")
