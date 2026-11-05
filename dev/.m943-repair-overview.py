import io, glob, re

stats = {"view": 0, "state": 0, "games": 0, "club": 0, "import": 0}
for f in sorted(glob.glob('.drafts/features/overview/*.tsx')):
    s = io.open(f, encoding='utf-8').read()
    # 1. The generator's copy bug: it compares the SETTER to a string where the STATE was meant.
    s, n1 = re.subn(r'\bsetSelectedView === ', 'selectedView === ', s)
    # 2. The handler takes a wide string the narrow union cannot hold; the view is display-only.
    s, n2 = re.subn(r'useState<"\w+" \| "summary">\("', 'useState<string>("', s)
    # 3. The dataset carries no appearance counts; the invented field reads zero, documented here
    #    and in the drafts README so the quarantine never renders a fabricated number.
    s, n3 = re.subn(r'gamesPlayed: p\.gamesPlayed \|\| 0,', 'gamesPlayed: 0,', s)
    # 4. A club the dataset does not name reads the app's own absence glyph, not undefined.
    s, n4 = re.subn(r'club: clubs\.find\(c => c\.id === selectedClub\)\?\.name,', 'club: clubs.find(c => c.id === selectedClub)?.name ?? ABSENT,', s)
    # the ABSENT door must be imported where 4 landed
    if n4 and 'ABSENT' not in s.split('\n\n')[0] + s[:600]:
        pass
    if n4 and not re.search(r'import \{[^}]*ABSENT[^}]*\} from "@/lib/utils";', s):
        s2, k = re.subn(r'import \{ ([^}]+) \} from "@/lib/utils";', lambda m: 'import { %s, ABSENT } from "@/lib/utils";' % m.group(1) if 'ABSENT' not in m.group(1) else m.group(0), s, count=1)
        if k:
            s = s2
            stats["import"] += 1
    io.open(f, 'w', encoding='utf-8', newline='').write(s)
    stats["view"] += n1; stats["state"] += n2; stats["games"] += n3; stats["club"] += n4
print(stats)
