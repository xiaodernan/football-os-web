import io
s = io.open("domain/career.ts", encoding="utf-8").read()
i = s.find("export interface CoachPlan")
print(s[i:i+900])
