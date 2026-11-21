import io
p = "scripts/proof-selectionchair.mjs"
s = io.open(p, encoding="utf-8").read()
s = s.replace("const cases: Array<[string, string, string]> = [", "const cases = [")
s = s.replace('''const proseOk = prose.every(([, text, want]) => {
  const got = verifyChairText(text as string, squad).sort();
  return JSON.stringify(got) === JSON.stringify([...(want as string[])].sort());
});''', '''const proseOk = prose.every((row) => {
  const got = verifyChairText(row[1], squad).sort();
  return JSON.stringify(got) === JSON.stringify([...row[2]].sort());
});''')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("annotations removed")
