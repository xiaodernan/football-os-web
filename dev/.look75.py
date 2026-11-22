import io
s = io.open("scripts/proof-matchreporter.mjs", encoding="utf-8").read()
i = s.find("the machine walks")
print(repr(s[i-30:i+520]))
