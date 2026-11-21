import io
p = "ui/TeachHint.tsx"
s = io.open(p, encoding="utf-8").read()
s = s.replace('import { TEACH_SEEN_KEY, isSeen, markSeen, teachHintKey } from "@/domain/teachHint";',
              'import { TEACH_SEEN_KEY, isSeen, markSeen, teachHintKey, unseenIds } from "@/domain/teachHint";')
s = s.replace('''
/** How many catalogue lessons the reader has not opened — the count the settings row prints. */
export const unreadTeachCount = (seen: readonly string[]): number => unseenIds(seen).length;
import { unseenIds } from "@/domain/teachHint";
''', '''
/** How many catalogue lessons the reader has not opened — the count the settings row prints. */
export const unreadTeachCount = (seen: readonly string[]): number => unseenIds(seen).length;
''')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("fixed")
