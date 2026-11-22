import io
p = "domain/broker.ts"
s = io.open(p, encoding="utf-8").read()
old = '''const RULING_LINE = /^RULING:(accept|reject|counter)\\s*$/mi;'''
new = '''// The line's code is read as a WORD and checked against the list below, so an unknown ruling
// ("RULING:maybe") is charged badCode rather than falling through to noDirective — the two are
// different failures and a reader deserves to be told which one happened.
const RULING_LINE = /^RULING:(\\w+)\\s*$/mi;'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("regex widened")
