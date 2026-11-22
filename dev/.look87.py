import io, re
s = io.open("scripts/proof-cache-parity.mjs", encoding="utf-8").read()
for m in re.finditer(r"tables", s):
    ln = s[:m.start()].count("\n") + 1
    print(ln, "|", s.split("\n")[ln-1].strip()[:140])
