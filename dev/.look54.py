import io, re
s = io.open("scripts/proof-i18n.mjs", encoding="utf-8").read()
for m in list(re.finditer(r"spaceOf\(", s))[:14]:
    ln = s[:m.start()].count("\n") + 1
    print(ln, "|", s.split("\n")[ln-1].strip()[:150])
