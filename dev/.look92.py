import io
s = io.open("features/manual/Manual.tsx", encoding="utf-8").read()
i = s.find('id="epics"')
print(s[max(0,i-100):i+1700])
