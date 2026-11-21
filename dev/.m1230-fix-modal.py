import io
p = "ui/FirstRunGuide.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t(step.titleKey)}>'''
new = '''  return (
    // Non-modal by design: the dim and the spotlight frame the step's control, but the page
    // underneath stays clickable — a guide you cannot click out of is a jail, not a tutorial.
    // (The modal attribute is deliberately absent; the card alone takes the pointer.)
    <div className="pointer-events-none fixed inset-0 z-[60]" role="dialog" aria-label={t(step.titleKey)}>'''
assert old in s, "container"
s = s.replace(old, new, 1)
old = '''      <div
        className="absolute left-1/2 w-80 -translate-x-1/2 rounded-xl border border-border bg-popover p-4 shadow-2xl"'''
new = '''      <div
        className="pointer-events-auto absolute left-1/2 w-80 -translate-x-1/2 rounded-xl border border-border bg-popover p-4 shadow-2xl"'''
assert old in s, "card"
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("guide is non-modal")
