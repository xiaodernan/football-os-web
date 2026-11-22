import io
p = "features/reporter/MatchReporter.tsx"
s = io.open(p, encoding="utf-8").read()
old = 'import { byKickoff } from "@/domain/attributes";'
new = 'import { byKickoff } from "@/domain/analytics";'
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("import fixed")
