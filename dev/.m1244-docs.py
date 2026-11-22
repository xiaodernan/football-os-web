import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1244 The Fresh-Eyes Pass — a visual QA over the eleven surfaces added since the last sweep (four boards, four doors, the ops console, the cache observatory): caught and fixed two real defects — the Selection Chair's fold panel label box was 32px wide so \"Midfielders\" overflowed it and touched the player names (now 80px), and the tide forecast read \"after 1 days\" (the window phrase is pluralised by the screen); every other surface inspected clean; build 0, i18n 463/463, bundle held at 898 KB.")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
print("plan updated")
