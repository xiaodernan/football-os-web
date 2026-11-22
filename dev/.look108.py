import io
s = io.open("features/broker/TransferBroker.tsx", encoding="utf-8").read()
i = s.find("const { dossier } = useMemo")
print(s[i:i+700])
