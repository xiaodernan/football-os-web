import io
p = "features/desk/TrainingDesk.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''    // The fold's zones are four; the load fold's "none" (no sessions yet) is the optimal
    // answer to it — a player with no history gets the standard week, not a spike.
    const zone = load.hasData && load.zone !== "none" ? load.zone : "optimal";'''
new = '''    // The load fold's five zones onto the desk's four: an under-loaded player gets the long
    // week ("low"), a cautioned one the medium ("high"), a spiked one the short sharp session,
    // and a player with no history at all the standard week — never a guess dressed as a zone.
    const ZONE_OF = { none: "optimal", under: "low", optimal: "optimal", caution: "high", high: "spike" } as const;
    const zone = ZONE_OF[load.zone];'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("zone mapped")
