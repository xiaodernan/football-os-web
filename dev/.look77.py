import io
s = io.open("scripts/proof-i18n.mjs", encoding="utf-8").read()
i = s.find("text children read a kind or type field")
print(s[max(0,i-2600):i+300])
