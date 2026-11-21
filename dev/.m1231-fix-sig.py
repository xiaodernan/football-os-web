import io
p = "domain/keepers.ts"
s = io.open(p, encoding="utf-8").read()
old = 'export function keeperUnion(players: readonly PlayerRef[], clubs: readonly Club[], matches: readonly Match[]): KeepersFold {'
new = 'export function keeperUnion(players: PlayerRef[], clubs: Club[], matches: Match[]): KeepersFold {'
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("signature aligned")
