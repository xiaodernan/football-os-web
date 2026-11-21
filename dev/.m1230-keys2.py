import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for anchor, val in [
    ('  "guide.replay": "Replay the quick tour",', '  "guide.replayHint": "Never walked the quick tour, or want to walk it again?",'),
    ('  "guide.replay": "重播快速之旅",\n  "guide.welcome.title": "欢迎来到 Football OS",', '  "guide.replay": "重播快速之旅",\n  "guide.replayHint": "没走过快速之旅，或者想再走一遍？",'),
    ('  "guide.replay": "重播快速之旅",\n  "guide.welcome.title": "歡迎來到 Football OS",', '  "guide.replay": "重播快速之旅",\n  "guide.replayHint": "沒走過快速之旅，或者想再走一遍？",'),
]:
    assert anchor in s, anchor
    s = s.replace(anchor, anchor.replace(val.split("\n")[0] + ",", "") + "\n" + val if False else anchor + "\n" + val.split("\n")[-1].strip(), 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("replayHint added")
