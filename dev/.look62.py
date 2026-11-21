import io, re
s = io.open("store/useFootballOS.tsx", encoding="utf-8").read()
for m in re.finditer(r"CoachPlan", s):
    ln = s[:m.start()].count("\n") + 1
    print(ln, "|", s.split("\n")[ln-1].strip()[:130])
