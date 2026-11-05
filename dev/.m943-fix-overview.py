import io, glob, re

fixed = 0
broken = []
for f in sorted(glob.glob('.drafts/features/overview/*.tsx')):
    s = io.open(f, encoding='utf-8').read()
    # The generator's signature defect: useState<"view" "summary"> — a union missing its `|`.
    s2, n = re.subn(r'useState<("(\w+)"\s+"summary")>', r'useState<"\2" | "summary">', s)
    if n:
        io.open(f, 'w', encoding='utf-8', newline='').write(s2)
        fixed += n
    else:
        broken.append(f)
print("files fixed:", fixed)
print("unmatched:", len(broken), broken[:3])
