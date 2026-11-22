import io
p = "features/reporter/MatchReporter.tsx"
s = io.open(p, encoding="utf-8").read()

old = '''  const fold = useMemo(() => (fixture ? foldReport(fixture) : ""), [fixture]);'''
new = '''  // The fold's report is DATA; the words are the dictionary's — the domain writes no prose.
  const fold = useMemo(() => (fixture ? foldReport(fixture) : null), [fixture]);
  const foldText = fold && fixture
    ? [
        t("rep.foldScore", { home: fixture.homeName, away: fixture.awayName, hg: fold.homeGoals, ag: fold.awayGoals }),
        fold.goals.length
          ? t("rep.foldGoals", { list: fold.goals.map((g) => `${g.player} ${g.minute}'`).join(", ") })
          : t("rep.foldNoGoals"),
        t("rep.foldTallies", { shots: fold.shots, saves: fold.saves }),
      ].join(" ")
    : "";'''
assert old in s
s = s.replace(old, new, 1)

# the refusal and no-key arms answer with the fold's composed report
s = s.replace('''    if (desk.status !== "build" || !LLM_CONFIG.hasKey) {
      const refused = reporterRefused(desk, t("rep.via.local"));
      setTrace(refused.trace);
      setAnswer(refused.answer);
      return;
    }''', '''    if (desk.status !== "build" || !LLM_CONFIG.hasKey) {
      const refused = reporterRefused(desk, foldText);
      setTrace(refused.trace);
      setAnswer(foldText);
      return;
    }''')
s = s.replace('''    if (!result.ok) {
      const refused = reporterRefused(desk, t("rep.via.local"));
      setTrace(refused.trace);
      setAnswer(refused.answer);
      return;
    }''', '''    if (!result.ok) {
      const refused = reporterRefused(desk, foldText);
      setTrace(refused.trace);
      setAnswer(foldText);
      return;
    }''')
s = s.replace('''    setViolations([...parsed.violations, ...lawBreaks]);
    const refused = reporterRefused(reporterPrecommit(desk, "refused"), result.text);
    setTrace(refused.trace);
    setAnswer(refused.answer);''', '''    setViolations([...parsed.violations, ...lawBreaks]);
    const refused = reporterRefused(reporterPrecommit(desk, "refused"), foldText);
    setTrace(refused.trace);
    setAnswer(foldText);''')

old = '''        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{fold}</p>'''
new = '''        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{foldText}</p>'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("screen words the fold through the dictionary")
