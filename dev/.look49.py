import io, re
s = io.open("data/deepDigest.ts", encoding="utf-8").read()
for m in re.finditer(r"60|strongest|LEDGER", s):
    ln = s[:m.start()].count("\n") + 1
    line = s.split("\n")[ln-1]
    print(ln, "|", line.strip()[:130])
