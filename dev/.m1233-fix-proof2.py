import io
p = "scripts/proof-selectionchair.mjs"
s = io.open(p, encoding="utf-8").read()
s = s.replace('chairCommit(chairPrecommit(desk, "pass"), lawful, parsed.selection!)', 'chairCommit(chairPrecommit(desk, "pass"), lawful, parsed.selection)')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("fixed")
