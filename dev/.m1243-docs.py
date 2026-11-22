import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1243 The Dead Import Sweep — proof-unused-locals charged 9 unread declarations the recent doors left behind (TransferBroker's dead fee, three unread imports in the Dressing Room, plus CHIP_CLASS/cn/toast/TOUR_STEPS/tour); all nine removed, the broker's memo now returns the dossier directly; tsc 0, unused-locals 5/5, build 0, bundle held at 898 KB, the six affected screens' E2E 9/9.")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
print("plan updated")
