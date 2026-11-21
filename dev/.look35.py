import io
lines = io.open("lib/utils.ts", encoding="utf-8").read().split("\n")
for i in range(118, 140):
    print(i+1, "|", lines[i][:130])
