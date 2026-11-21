import io
p = "scripts/proof-storage.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_FILES_PIN = 227;"
new = "const APP_FILES_PIN = 228; // M1231 The Keepers' Union: 226 -> 228 — domain/keepers.ts and features/keepers/KeepersUnion.tsx join the scope."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("storage pin paid")
