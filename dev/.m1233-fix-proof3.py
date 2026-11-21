import io
p = "scripts/proof-selectionchair.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''  ["an invented figure is refused", "a1 is the 91-rated striker.", ["offSquad"]],'''
new = '''  ["an invented figure is refused", "a1 is the 987654-rated striker.", ["offSquad"]],'''
assert old in s
s = s.replace(old, new, 1)
old = '''ok(`the prose law passes the squad's own figures and refuses an invented one and futurology (${prose.map(([l]) => l).join(" · ")}: ${proseOk})`,
  proseOk && verifyChairText("a1 is the 91-rated striker.", squad).includes("offSquad") &&'''
new = '''ok(`the prose law passes the squad's own figures and refuses an invented one and futurology (${prose.map(([l]) => l).join(" · ")}: ${proseOk})`,
  proseOk && verifyChairText("a1 is the 987654-rated striker.", squad).includes("offSquad") &&'''
assert old in s
s = s.replace(old, new, 1)
old = '''ok(`a thin squad still fills eleven best-rated-first, and a squad with no keeper or fewer than eleven reads null rather than a broken XI (thin ${thinFold?.ids.length} first ${thinFold?.ids[0]}, noGk ${noGk}, short ${short})`,
  thinFold !== null && thinFold.ids.length === 11 && thinFold.ids[0] === "a1" && noGk === null && short === null);'''
new = '''ok(`a thin squad still fills eleven — the keeper leads, the shape's picks follow, the best-rated leftovers fill the rest — and a squad with no keeper or fewer than eleven reads null rather than a broken XI (thin ${thinFold?.ids.length}: ${thinFold?.ids.join(",")}; noGk ${noGk}; short ${short})`,
  thinFold !== null && thinFold.ids.length === 11 && thinFold.ids[0] === "g1" &&
  thinFold.ids[1] === "d1" && thinFold.ids[2] === "m1" && thinFold.ids[3] === "a1" &&
  thinFold.ids[4] === "x7" && thinFold.ids[10] === "x1" && noGk === null && short === null);'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("proof fixed")
