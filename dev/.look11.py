import io
lines = io.open("features/settings/SettingsPage.tsx", encoding="utf-8").read().split("\n")
for i, l in enumerate(lines[16:34], 17):
    print(i, "|", l[:130])
