import io
lines = io.open("domain/analytics.ts", encoding="utf-8").read().split("\n")
for i in range(1087, 1160):
    print(i+1, "|", lines[i][:140])
