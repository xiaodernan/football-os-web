import io
p = "domain/selectionChair.ts"
s = io.open(p, encoding="utf-8").read()
old = '''  const picked: string[] = [keeper.id];
  const rest: ChairPlayer[] = [];
  for (const g of ["DEF", "MID", "ATT"] as const) {
    const line = outfield.filter((p) => p.positionGroup === g);
    picked.push(...line.slice(0, shape[g]).map((p) => p.id));
    rest.push(...line.slice(shape[g]));
  }
  // A thin squad: the leftovers and the unpicked fill the XI to eleven, best-rated first.
  const remaining = [...rest, ...outfield.filter((p) => !picked.includes(p.id))].sort(rank);
  while (picked.length < 11 && remaining.length > 0) picked.push(remaining.shift()!.id);'''
new = '''  const picked: string[] = [keeper.id];
  for (const g of ["DEF", "MID", "ATT"] as const) {
    const line = outfield.filter((p) => p.positionGroup === g);
    picked.push(...line.slice(0, shape[g]).map((p) => p.id));
  }
  // A thin squad: every outfield player the shape did not pick fills the XI to eleven,
  // best-rated first. The unpicked set is read ONCE — the first cut added the line leftovers
  // and the unpicked set together, which double-counted a thin squad's bodies and put the
  // same player in the XI twice (caught by proof-selectionchair's thin-squad arm).
  const remaining = outfield.filter((p) => !picked.includes(p.id));
  while (picked.length < 11 && remaining.length > 0) picked.push(remaining.shift()!.id);'''
assert old in s, "fold body"
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("foldXi fixed for real")
