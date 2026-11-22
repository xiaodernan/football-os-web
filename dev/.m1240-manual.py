import io
p = "features/manual/Manual.tsx"
s = io.open(p, encoding="utf-8").read()

# 1. the TOC entry
old = '''  { id: "epics", key: "manual.epicsTitle" },'''
new = '''  { id: "epics", key: "manual.epicsTitle" },
  { id: "doors", key: "manual.doorsTitle" },'''
assert old in s
s = s.replace(old, new, 1)

# 2. the chapter body, after the epics section
old = '''      {/* Chapter 5 — spring */}'''
new = '''      {/* Chapter 4.5 — the doors that decide: the model's three ruling desks and the boards
          that read them. Every one of them imprisons the model to the world's own numbers. */}
      <section id="doors" aria-labelledby="manual-doors" className="rounded-xl border p-5 print:border-0 print:px-0">
        <SectionTitle title={t("manual.doorsTitle")} />
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">{t("manual.doorsBody")}</p>
        <ul className="mt-2 space-y-1.5 pl-5 text-sm">
          <li>{t("manual.doorsChair")}</li>
          <li>{t("manual.doorsDesk")}</li>
          <li>{t("manual.doorsBroker")}</li>
        </ul>
        <p className="mt-2 max-w-3xl text-xs text-muted-foreground">{t("manual.doorsBoards")}</p>
      </section>

      {/* Chapter 5 — spring */}'''
assert old in s
s = s.replace(old, new, 1)

# 3. the explore links gain the new surfaces
old = '''    { to: "/dream-team", label: t("nav.dreamTeam") },'''
new = '''    { to: "/dream-team", label: t("nav.dreamTeam") },
    { to: "/keepers", label: t("nav.keepers") },
    { to: "/congestion", label: t("nav.congestion") },
    { to: "/depth", label: t("nav.depth") },
    { to: "/nations", label: t("nav.nations") },
    { to: "/chair", label: t("nav.chair") },
    { to: "/desk", label: t("nav.desk") },
    { to: "/broker", label: t("nav.broker") },'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("manual updated")
