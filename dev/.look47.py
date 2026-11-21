import io
s = io.open("features/manager/ManagerOS.tsx", encoding="utf-8").read()
import re
for pat in ["playersByClub", "squad", "SQUAD"]:
    for m in list(re.finditer(pat, s))[:3]:
        ln = s[:m.start()].count("\n") + 1
        print(pat, "@", ln, "|", s.split("\n")[ln-1].strip()[:130])
