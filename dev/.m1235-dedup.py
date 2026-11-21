import io
p = "i18n/dictionaries.ts"
lines = io.open(p, encoding="utf-8").read().split("\n")
out = []
skip_next = 0
removed = 0
for i, l in enumerate(lines):
    if skip_next > 0:
        skip_next -= 1
        continue
    # a desk.v.prediction line immediately followed by another desk.v.prediction line: drop the first
    if l.strip().startswith('"desk.v.prediction"') and i + 1 < len(lines) and lines[i + 1].strip().startswith('"desk.v.prediction"'):
        removed += 1
        continue
    out.append(l)
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(out))
print("removed stale dup lines:", removed)
