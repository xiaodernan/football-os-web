import io
p = "scripts/proof-firstrunguide.mjs"
s = io.open(p, encoding="utf-8").read()

old = '''ok(`tourVisible is exact — true inside the table, false once done, false for a step past the end (step 0 ${tourVisible(initialTour())}, step 5 ${tourVisible({ step: 5, done: false })}, step 6 ${tourVisible({ step: 6, done: false })}, done ${tourVisible({ step: 2, done: true })}, junk ${tourVisible({ step: -1, done: false })})`,
  tourVisible(initialTour()) && tourVisible({ step: 5, done: false }) &&'''
new = '''ok(`tourVisible is exact — true inside the table, false once done, false for a step past the end (step 0 ${tourVisible(initialTour())}, step 5 ${tourVisible({ step: 5, done: false })}, step 6 ${tourVisible({ step: 6, done: false })}, done ${tourVisible({ step: 2, done: true })}, junk ${tourVisible({ step: -1, done: false })})`,
  TOUR_STEPS.length >= 6 && tourVisible(initialTour()) && tourVisible({ step: 5, done: false }) &&'''
assert old in s, "visibility clause"
s = s.replace(old, new, 1)

old = '''ok(`advancing a finished guide changes nothing, backing from the first step changes nothing, and skip preserves the step while finishing (advance ${JSON.stringify(tourAdvance(walk))}, back-at-0 ${JSON.stringify(tourBack(initialTour()))}, back-from-2 ${JSON.stringify(tourBack({ step: 2, done: false }))}, skip ${JSON.stringify(tourSkip({ step: 3, done: false }))})`,
  tourAdvance(walk) === walk || JSON.stringify(tourAdvance(walk)) === JSON.stringify(walk) &&
  JSON.stringify(tourBack(initialTour())) === JSON.stringify(initialTour()) &&
  JSON.stringify(tourBack({ step: 2, done: false })) === JSON.stringify({ step: 1, done: false }) &&
  JSON.stringify(tourSkip({ step: 3, done: false })) === JSON.stringify({ step: 3, done: true }) &&
  tourSkip(walk).done);'''
new = '''ok(`advancing a finished guide changes nothing, backing from the first step changes nothing, and skip preserves the step while finishing (advance ${JSON.stringify(tourAdvance(walk))}, back-at-0 ${JSON.stringify(tourBack(initialTour()))}, back-from-2 ${JSON.stringify(tourBack({ step: 2, done: false }))}, skip ${JSON.stringify(tourSkip({ step: 3, done: false }))})`,
  TOUR_STEPS.length >= 6 &&
  JSON.stringify(tourAdvance(walk)) === JSON.stringify(walk) &&
  JSON.stringify(tourBack(initialTour())) === JSON.stringify(initialTour()) &&
  JSON.stringify(tourBack({ step: 2, done: false })) === JSON.stringify({ step: 1, done: false }) &&
  JSON.stringify(tourSkip({ step: 3, done: false })) === JSON.stringify({ step: 3, done: true }) &&
  tourSkip(walk).done);'''
assert old in s, "walk clause"
s = s.replace(old, new, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("clauses guarded")
