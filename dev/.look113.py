import io, re
s = io.open("features/football/Details.tsx", encoding="utf-8").read()
idx = [m.start() for m in re.finditer(r"export function MatchDetail", s)]
print("occurrences:", len(idx))
i = idx[0]
print(s[i:i+3000])
