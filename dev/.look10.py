import io
lines = io.open("features/settings/SettingsPage.tsx", encoding="utf-8").read().split("\n")
for i, l in enumerate(lines[:16], 1):
    print(i, "|", l[:120])
