import io, re
s = io.open("features/learn/LearnHub.tsx", encoding="utf-8").read()
idxs = [m.start() for m in re.finditer(r"callLlmStream", s)]
print("occurrences:", len(idxs))
i = idxs[-1]
print(s[max(0,i-3000):i+2000])
