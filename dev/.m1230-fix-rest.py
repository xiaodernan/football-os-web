import io
p = "features/command/CommandPalette.tsx"
s = io.open(p, encoding="utf-8").read()
s = s.replace('useLocalStorage<TourState>(TOUR_KEY, initialTour)', 'useLocalStorage<TourState>(TOUR_KEY, initialTour())')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
p = "ui/FirstRunGuide.tsx"
s = io.open(p, encoding="utf-8").read()
s = s.replace('useLocalStorage<TourState>(TOUR_KEY, initialTour)', 'useLocalStorage<TourState>(TOUR_KEY, initialTour())')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("palette + component repaired")
