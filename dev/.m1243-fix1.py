import io, re

def edit(path, subs):
    s = io.open(path, encoding="utf-8").read()
    for old, new in subs:
        assert old in s, (path, old[:70])
        s = s.replace(old, new, 1)
    io.open(path, "w", encoding="utf-8", newline="\n").write(s)
    print("fixed", path)

# 1 · TransferBroker: the destructured fee is never read (the deal's fee is built below)
edit("features/broker/TransferBroker.tsx", [
    ('''  const { dossier, fee } = useMemo(() => {''', '''  const { dossier } = useMemo(() => {'''),
])
