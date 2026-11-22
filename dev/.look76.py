import io
s = io.open("scripts/proof-matchreporter.mjs", encoding="utf-8").read()
i = s.find("The fold's own report")
print(repr(s[i-60:i+700]))
