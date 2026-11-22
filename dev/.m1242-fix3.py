import io
p = "domain/dressingRoom.ts"
s = io.open(p, encoding="utf-8").read()
old = '''// ---- the state machine --------------------------------------------------'''
new = '''/** The door's own initial state — the opponent's record cloned in, so a caller can never swap
 *  the record from under the proof mid-run. */
export const createDressing = (opponent: OpponentRecord, locale: Locale): DressingState => ({
  opponent: { ...opponent, form: [...opponent.form] },
  locale, status: "preflight", trace: [], answer: "",
});

// ---- the state machine --------------------------------------------------'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("createDressing added")
