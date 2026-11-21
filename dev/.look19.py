import io
lines = io.open("domain/analytics.ts", encoding="utf-8").read().split("\n")
for a, b in [(4040, 4110), (540, 560)]:
    print("=== lines", a, "-", b, "===")
    for i in range(a-1, min(b, len(lines))):
        print(i+1, "|", lines[i][:130])
