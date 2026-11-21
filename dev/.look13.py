import io, re
s = io.open("scripts/proof-i18n.mjs", encoding="utf-8").read()
i = s.find("carry no placeholder, in any locale")
print(s[max(0,i-1800):i+400])
