import io
p = "features/desk/TrainingDesk.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''    const load = buildLoad({ nowMs: Date.now(), sessions: state.sessions });
    return {
      playerName: state.profile?.displayName ?? "the visitor",
      group: state.profile?.positionGroup ?? "CM",
      age: 24,
      loadZone: load.hasData ? load.zone : "optimal",
      attributes: attrs,
    };'''
new = '''    const load = buildLoad({ nowMs: Date.now(), sessions: state.sessions });
    // The fold's zones are four; the load fold's "none" (no sessions yet) is the optimal
    // answer to it — a player with no history gets the standard week, not a spike.
    const zone = load.hasData && load.zone !== "none" ? load.zone : "optimal";
    return {
      playerName: state.profile?.displayName ?? "the visitor",
      group: state.profile?.positionGroup ?? "CM",
      age: 24,
      loadZone: zone,
      attributes: attrs,
    };'''
assert old in s
s = s.replace(old, new, 1)
old = '''      prescription.minutes,
      prescription.focusKeys,
    );'''
new = '''      prescription.minutes,
      [...prescription.focusKeys],
    );'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("screen fixed")
