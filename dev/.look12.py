import io
s = io.open("scripts/proof-i18n.mjs", encoding="utf-8").read()
i = s.find("a key field with no declared renderer")
print(s[max(0,i-2500):i+300])
