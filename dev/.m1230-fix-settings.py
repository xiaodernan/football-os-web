import io
p = "features/settings/SettingsPage.tsx"
lines = io.open(p, encoding="utf-8").read().split("\n")
# lines[9:12] are the misplaced state declarations (0-based 9,10,11 = file lines 10,11,12)
assert lines[9].strip().startswith("const [teachSeen"), lines[9]
assert lines[10].strip().startswith("const [tour"), lines[10]
assert lines[11].strip().startswith("const unreadLessons"), lines[11]
del lines[9:12]
# restore the teachHint import before the firstRunGuide import
idx = next(i for i, l in enumerate(lines) if l.startswith('import { TOUR_KEY'))
lines.insert(idx, 'import { TEACH_SEEN_KEY, resetSeen } from "@/domain/teachHint";')
s = "\n".join(lines)
# the initial value must be a state, not the factory
s = s.replace('useLocalStorage<TourState>(TOUR_KEY, initialTour)', 'useLocalStorage<TourState>(TOUR_KEY, initialTour())')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("settings repaired")
