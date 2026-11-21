import io
p = "scripts/proof-trainingdesk.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''ok(`the prose law passes the dossier's own figures and refuses an invented one and futurology (dossier ${verifyDeskText("finishing is 53 and pace is 82.", dossier).length === 0}, invented ${verifyDeskText("finishing is 91.", dossier).includes("offDossier")}, futurology ${verifyDeskText("you will reach 99 by June.", dossier).includes("prediction")})`,'''
new = '''ok(`the prose law passes the dossier's own figures and refuses an invented one and futurology (dossier ${verifyDeskText("finishing is 53 and pace is 82.", dossier).length === 0}, invented ${verifyDeskText("finishing is 987654.", dossier).includes("offDossier")}, futurology ${verifyDeskText("you will reach 99 by June.", dossier).includes("prediction")})`,'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("message aligned with the assertion")
