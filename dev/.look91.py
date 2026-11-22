import io
s = io.open("scripts/proof-messaging-wire.mjs", encoding="utf-8").read()
i = s.find("fetch")
print(s[max(0,i-800):i+1500])
