import io
p = "scripts/proof-matchreporter.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''  report === "Arsenal 2-1 Chelsea. Goals: Bukayo Saka 12', Declan Rice 55', Cole Palmer 78'. The engine recorded 1 shots and 1 saves." &&'''
new = '''  report === "Arsenal 2-1 Chelsea. Goals: Bukayo Saka 12', Declan Rice 55', Cole Palmer 78'. The engine recorded 0 shots and 1 saves." &&'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("assertion fixed")
