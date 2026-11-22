import io
s = io.open("scripts/proof-opstrend.mjs", encoding="utf-8").read()
i = s.find("The screen reads the catalogue")
print(repr(s[i-30:i+900]))
