import io
p = "domain/localData.ts"
s = io.open(p, encoding="utf-8").read()
old = '''import { TOUR_KEY } from "./firstRunGuide";'''
new = '''import { TOUR_KEY } from "./firstRunGuide";
// M1242: the dressing room's last-briefing-read line — a preference (a reading record, not activity).
export const DRESSING_KEY = "football-os.dressing.v1";'''
assert old in s
s = s.replace(old, new, 1)
old = '''  { key: TOUR_KEY, labelKey: "set.key.tour", kind: "preference" },'''
new = '''  { key: TOUR_KEY, labelKey: "set.key.tour", kind: "preference" },
  { key: DRESSING_KEY, labelKey: "set.key.dressing", kind: "preference" },'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("localData wired")

p = "features/dressing/DressingRoom.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''import { useLocalStorage } from "@/lib/hooks";'''
new = '''import { useLocalStorage } from "@/lib/hooks";
import { DRESSING_KEY } from "@/domain/localData";'''
assert old in s
s = s.replace(old, new, 1)
old = '''  const [saved, setSaved] = useLocalStorage<string>("football-os.dressing.v1", "");'''
new = '''  const [saved, setSaved] = useLocalStorage<string>(DRESSING_KEY, "");'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("screen uses the registered key")

# the set.key.dressing label in three locales
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for anchor, val in [
    ('  "set.key.tour": "Quick tour progress",', '  "set.key.dressing": "Last briefing read",'),
    ('  "set.key.tour": "快速之旅进度",', '  "set.key.dressing": "最近读过的简报",'),
    ('  "set.key.tour": "快速之旅進度",', '  "set.key.dressing": "最近讀過的簡報",'),
]:
    assert anchor in s, anchor[:40]
    s = s.replace(anchor, anchor + "\n" + val, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("label added")
