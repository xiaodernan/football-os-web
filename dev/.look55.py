import io
s = io.open("scripts/proof-i18n.mjs", encoding="utf-8").read()
i = s.find("const SPACES = new Map")
print(s[i:i+700])
j = s.find('["liveWire.askViolation.|code"')
print("...")
print(s[max(0,j-500):j+500])
