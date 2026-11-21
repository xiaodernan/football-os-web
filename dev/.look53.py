import io
s = io.open("scripts/proof-i18n.mjs", encoding="utf-8").read()
i = s.find("a value space is declared for")
print(s[max(0,i-3000):i+400])
