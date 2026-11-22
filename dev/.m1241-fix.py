import io
p = "domain/opsTrend.ts"
s = io.open(p, encoding="utf-8").read()
old = '''  // The advice: each rule fires on the fold's own measured number, in a fixed order.
  const advice: TrendAdvice[] = [];
  if (input.bounceRate >= 50) advice.push({ code: "onboarding", measure: round2(input.bounceRate) });'''
new = '''  // The advice: each rule fires on the fold's own measured number, in a fixed order. An empty
  // series prescribes NOTHING — a world with no data must not be told to fix its navigation
  // (the proof's empty arm caught that a zero depth reads as a low depth).
  const advice: TrendAdvice[] = [];
  if (series.length === 0) return { weekAvg, prevAvg, slopePct, forecast, advice: [{ code: "healthy", measure: 0 }], days: 0 };
  if (input.bounceRate >= 50) advice.push({ code: "onboarding", measure: round2(input.bounceRate) });'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("empty guard added")

p = "scripts/proof-opstrend.mjs"
s = io.open(p, encoding="utf-8").read()
s = s.replace('''  read.forecast[6].day === day(21) && read.forecast[6].visits === 62.86 &&''',
              '''  read.forecast[6].day === day(21) && read.forecast[6].visits === 60 &&''')
s = s.replace('''const healthy = trendRead({ trend: series, bounceRate: 12, avgDepth: 3.5, loopRate: 8 });''',
              '''const healthy = trendRead({ trend: series.map((d, i) => ({ ...d, visits: i < 7 ? 60 : 80 })), bounceRate: 12, avgDepth: 3.5, loopRate: 8 });''')
s = s.replace('''ok(`a healthy fortnight answers the healthy code with the week's mean as its measure (${healthy.advice.map((a) => `${a.code}:${a.measure}`).join(",")})`,
  healthy.advice.length === 1 && healthy.advice[0].code === "healthy" && healthy.advice[0].measure === 80);''',
              '''ok(`a healthy fortnight answers the healthy code with the week's mean as its measure (${healthy.advice.map((a) => `${a.code}:${a.measure}`).join(",")})`,
  healthy.advice.length === 1 && healthy.advice[0].code === "healthy" && healthy.advice[0].measure === 80 && healthy.slopePct > CONTENT_DECLINE_PCT);''')
old = '''const atDecline = trendRead({ trend: series, bounceRate: 5, avgDepth: 3, loopRate: 5 });'''
new = '''const atDecline = trendRead({ trend: [...series].map((d, i) => ({ ...d, visits: i < 7 ? 100 : 90.01 })), bounceRate: 5, avgDepth: 3, loopRate: 5 });'''
assert old in s
s = s.replace(old, new, 1)
old = '''  !atDecline.advice.some((a) => a.code === "content") && atDecline.advice[0].code === "healthy");'''
new = '''  !atDecline.advice.some((a) => a.code === "content") && atDecline.advice[0].code === "healthy" &&
  Math.abs(atDecline.slopePct + 9.99) < 0.01);'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("proof assertions fixed")
