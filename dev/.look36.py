import io
s = io.open("scripts/proof-i18n.mjs", encoding="utf-8").read()
i = s.find("no English sentence is carried by two keys")
print(s[max(0,i-2200):i+300])
