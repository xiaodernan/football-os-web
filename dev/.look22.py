import io
lines = io.open("domain/analytics.ts", encoding="utf-8").read().split("\n")
for i in range(1040, 1090):
    print(i+1, "|", lines[i][:140])
