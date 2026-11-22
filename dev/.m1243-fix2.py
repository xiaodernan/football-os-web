import io
def edit(path, subs):
    s = io.open(path, encoding="utf-8").read()
    for old, new in subs:
        assert old in s, (path, old[:70])
        s = s.replace(old, new, 1)
    io.open(path, "w", encoding="utf-8", newline="\n").write(s)
    print("fixed", path)

# 1 · the memo's returned fee is dead too (the deal builds its own from the multiple)
edit("features/broker/TransferBroker.tsx", [
    ('''  const { dossier } = useMemo(() => {
    const players = footballProvider.players();
    const p = [...players].sort((a, b) => b.value - a.value || a.id.localeCompare(b.id))[0];
    const d: BrokerDossier = {
      playerName: p.name,
      clubName: getClub(p.clubId)?.name ?? p.clubId,
      overall: p.overall,
      age: p.age,
      value: p.value,
    };
    return { dossier: d, fee: Math.round((p.value * 1.3) / 1e6) * 1e6 };
  }, []);''',
     '''  // The desk's player: the world's most valuable — deterministic, so the same visit opens the
  // same deal. The dossier is the roster's own facts.
  const dossier = useMemo<BrokerDossier>(() => {
    const players = footballProvider.players();
    const p = [...players].sort((a, b) => b.value - a.value || a.id.localeCompare(b.id))[0];
    return {
      playerName: p.name,
      clubName: getClub(p.clubId)?.name ?? p.clubId,
      overall: p.overall,
      age: p.age,
      value: p.value,
    };
  }, []);'''),
])

# 2 · TrainingDesk: CHIP_CLASS unread
edit("features/desk/TrainingDesk.tsx", [
    ('import { Panel, SectionTitle, DemoBadge, CHIP_CLASS } from "@/ui/primitives";',
     'import { Panel, SectionTitle, DemoBadge } from "@/ui/primitives";'),
])

# 3-6 · DressingRoom: four unread imports
edit("features/dressing/DressingRoom.tsx", [
    ('import { footballProvider, getClub, playersByClub } from "@/data/footballService";',
     'import { footballProvider, getClub } from "@/data/footballService";'),
    ('''  createDressing, dressingBuild, dressingCommit, dressingPrecommit, dressingPreflight, dressingRefused,''',
     '''  dressingBuild, dressingCommit, dressingPrecommit, dressingPreflight, dressingRefused,'''),
    ('import { Panel, SectionTitle, DemoBadge, StatTile, CHIP_CLASS } from "@/ui/primitives";',
     'import { Panel, SectionTitle, DemoBadge, StatTile } from "@/ui/primitives";'),
    ('import { toast } from "sonner";\n', ''),
])

# 7 · MatchReporter: cn unread
edit("features/reporter/MatchReporter.tsx", [
    ('import { cn } from "@/lib/utils";\n', ''),
])

# 8 · SettingsPage: the tour local is unread (the row writes through setTour only)
edit("features/settings/SettingsPage.tsx", [
    ('  const [tour, setTour] = useLocalStorage<TourState>(TOUR_KEY, initialTour());',
     '  const [, setTour] = useLocalStorage<TourState>(TOUR_KEY, initialTour());'),
])

# 9 · FirstRunGuide: TOUR_STEPS unread
edit("ui/FirstRunGuide.tsx", [
    ('''import {
  TOUR_KEY, TOUR_STEPS, currentStep, initialTour, parseTour, tourAdvance, tourBack, tourProgress, tourSkip,
  type TourState,
} from "@/domain/firstRunGuide";''',
     '''import {
  TOUR_KEY, currentStep, initialTour, parseTour, tourAdvance, tourBack, tourProgress, tourSkip,
  type TourState,
} from "@/domain/firstRunGuide";'''),
])
