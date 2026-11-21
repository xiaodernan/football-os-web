import io
s = io.open("scripts/proof-i18n.mjs", encoding="utf-8").read()
i = s.find("const isZeroish")
print(s[max(0,i-200):i+700])
