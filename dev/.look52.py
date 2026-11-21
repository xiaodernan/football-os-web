import io, re
s = io.open("scripts/proof-i18n.mjs", encoding="utf-8").read()
i = s.find("const DYN_SITES")
print(s[i:i+2200])
