import io
# 1. enforce the budget in the domain
p = "domain/matchReporter.ts"
s = io.open(p, encoding="utf-8").read()
old = '''  if (/\\b(will|won't|never will|by the time|years from now|mark my words|next match)\\b/i.test(text)) out.add("prediction");
  return [...out];
}'''
new = '''  if (/\\b(will|won't|never will|by the time|years from now|mark my words|next match)\\b/i.test(text)) out.add("prediction");
  // The budget is real or it is not a budget: a report past REPORT_MAX_CHARS is refused.
  if (text.length > REPORT_MAX_CHARS) out.add("tooLong");
  return [...out];
}'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("budget enforced")

# 2. dictionaries: add rep.v.tooLong, drop the dead rep.via.local
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for anchor, val in [
    ('  "rep.v.offFixture": "a figure the fixture cannot carry",', '  "rep.v.tooLong": "the report runs past its budget",'),
    ('  "rep.v.offFixture": "比赛承载不了的数字",', '  "rep.v.tooLong": "报道超出了长度预算",'),
    ('  "rep.v.offFixture": "比賽承載不了的數字",', '  "rep.v.tooLong": "報導超出了長度預算",'),
]:
    assert anchor in s, anchor[:40]
    s = s.replace(anchor, anchor + "\n" + val, 1)
# drop the dead key in all three locales
n = s.count('  "rep.via.local": ')
lines = s.split("\n")
out = [l for l in lines if not l.strip().startswith('"rep.via.local"')]
s = "\n".join(out)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("tooLong keyed; dead via.local lines removed:", n)
