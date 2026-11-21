import io
lines = io.open("domain/matchEngine.ts", encoding="utf-8").read().split("\n")
for i in range(138, 165):
    print(i+1, "|", lines[i][:140])
