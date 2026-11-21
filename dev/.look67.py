import io
s = io.open("scripts/proof-trainingdesk.mjs", encoding="utf-8").read()
i = s.find("the prose law passes")
print(s[i-100:i+700])
