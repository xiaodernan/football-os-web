import io
s = io.open("scripts/verify-cartographer-live.mjs", encoding="utf-8").read()
print(s[2600:5600])
