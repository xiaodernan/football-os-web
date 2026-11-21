import io
lines = io.open("scripts/proof-firstrunguide.mjs", encoding="utf-8").read().split("\n")
for ln in [36, 37, 38, 39, 47, 48, 49]:
    print(ln, "|", lines[ln-1][:180])
