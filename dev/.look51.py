import io
s = io.open("scripts/proof-i18n.mjs", encoding="utf-8").read()
i = s.find("DYN_SITES")
print(s[max(0,i-300):i+1800])
