import io
p = "scripts/proof-storage.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_FILES_PIN = 226;"
new = "const APP_FILES_PIN = 227; // M1231 The Keepers' Union: 226 -> 227 — domain/keepers.ts joins the scope (features/ is outside this gate's eight directories... ui/keepers is not counted; only domain/keepers.ts rides)."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("storage pin paid")
