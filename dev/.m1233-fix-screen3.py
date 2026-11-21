import io
p = "features/chair/SelectionChair.tsx"
s = io.open(p, encoding="utf-8").read()

old = '''import { useI18n } from "@/i18n";
import { footballProvider, getClub, playersByClub } from "@/data/footballService";
import { useOs } from "@/store/useFootballOS";
import {
  chairBuild, chairCommit, chairLine, chairPrecommit, chairPreflight, chairRefused, createChair,
  parseChairXi, verifyChairText, foldXi,
  type ChairPlayer, type ChairSelection, type ChairTraceEntry, type ChairViolation, type ChairSquad,
} from "@/domain/selectionChair";'''
new = '''import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import {
  chairBuild, chairCommit, chairPrecommit, chairPreflight, chairRefused, createChair,
  parseChairXi, verifyChairText, foldXi, worldSquad,
  type ChairSelection, type ChairTraceEntry, type ChairViolation, type ChairSquad,
} from "@/domain/selectionChair";'''
assert old in s
s = s.replace(old, new, 1)

old = '''export function SelectionChair() {
  const { t, locale } = useI18n();
  const { state } = useOs();
  const clubId = state.profile?.favoriteClubId ?? playersByClub("ars")[0]?.clubId ?? "ars";
  const club = getClub(clubId) ?? getClub("ars")!;

  const squad = useMemo<ChairSquad>(() => {
    const players: ChairPlayer[] = playersByClub(clubId)
      .slice()
      .sort((a, b) => b.overall - a.overall || a.id.localeCompare(b.id))
      .slice(0, SQUAD_SIZE)
      .map((p) => ({ id: p.id, name: p.name, positionGroup: chairLine(p.positionGroup), overall: p.overall, age: p.age }));
    return { clubId, players };
  }, [clubId]);'''
new = '''export function SelectionChair() {
  const { t, locale } = useI18n();

  // The chair's pool is the world's strongest — the same cut the world book's LEDGER is read
  // with, so the door and the digest can never drift. A club roster is too thin in this world
  // to select from: one club in seventy-three can field eleven.
  const squad = useMemo<ChairSquad>(
    () => ({ clubId: "world", players: worldSquad(footballProvider.players()) }),
    [],
  );'''
assert old in s
s = s.replace(old, new, 1)

old = '''const SQUAD_SIZE = 18;
const GROUPS'''
new = '''const GROUPS'''
assert old in s
s = s.replace(old, new, 1)

old = '''        <SectionTitle
          title={t("chair.squadTitle", { club: club.name })}
          hint={t("chair.squadHint", { n: squad.players.length })}
          action={<Crest colors={club.colors} short={club.short} size={22} />}
        />'''
new = '''        <SectionTitle
          title={t("chair.squadTitle")}
          hint={t("chair.squadHint", { n: squad.players.length })}
        />'''
assert old in s
s = s.replace(old, new, 1)

# the crest import is no longer used
s = s.replace('import { Panel, SectionTitle, DemoBadge, Crest, CHIP_CLASS, BAR_FILL } from "@/ui/primitives";',
              'import { Panel, SectionTitle, DemoBadge, CHIP_CLASS } from "@/ui/primitives";')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("screen rebuilt on the world pool")
