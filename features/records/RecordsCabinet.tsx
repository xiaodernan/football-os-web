import { useMemo } from "react";
import { Link } from "@/lib/router";
import { useI18n, formatDate } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import {
  leagueWall, worldLethal, records, passingAccuracy, scorelessStreaks, statsBlockKings, redCardKings,
} from "@/domain/analytics";
import { DemoBadge, Panel, SectionTitle, Crest } from "@/ui/primitives";
import { sum } from "@/domain/attributes";
import { SEPARATOR } from "@/lib/utils";

// M1030: the cabinet of records �?the world's best, grouped the way a historian files a shelf.
// Every row on these shelves is the FIRST ROW of the fold the streak signed off and the screen
// against which it reads: records read martial folds and nothing more. Nothing is stored,
// nothing is estimated, nothing is invented; if the seed is empty every shelf reads empty.

function CabinetRow({ clubId, label, figure, detail, to }: {
  clubId: string;
  label: string;
  figure: string;
  detail: string;
  to: string;
}) {
  const club = getClub(clubId);
  return (
    <Link
      to={to}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors"
    >
      <Crest colors={club?.colors} short={club?.short} size={30} />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="truncate font-medium">{club?.name ?? clubId}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
      <div className="pl-3 text-right font-mono text-xl font-bold tabular-nums">{figure}</div>
    </Link>
  );
}

function CabinetMatchRow({ homeId, awayId, label, figure, detail, to, date, matchId }: {
  homeId: string;
  awayId: string;
  label: string;
  figure: string;
  detail: string;
  to: string;
  date?: string;
  matchId?: string;
}) {
  const { locale } = useI18n();
  const home = getClub(homeId);
  const away = getClub(awayId);
  return (
    <Link
      data-matchid={matchId}
      to={to}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors"
    >
      <div className="flex -space-x-2">
        <Crest colors={home?.colors} short={home?.short} size={28} />
        <Crest colors={away?.colors} short={away?.short} size={28} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="truncate font-medium">{home?.short ?? homeId} {SEPARATOR} {away?.short ?? awayId}</div>
        <div className="text-xs text-muted-foreground">{detail}{date ? ` · ${formatDate(locale, date)}` : ""}</div>
      </div>
      <div className="pl-3 text-right font-mono text-lg font-bold tabular-nums">{figure}</div>
    </Link>
  );
}

export function RecordsCabinet() {
  const { t } = useI18n();
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);

  // Every one of these folds is proved on its own screen; the cabinet reads their first rows.
  const lethal = useMemo(() => worldLethal(matches, clubs), [matches, clubs]);
  const record = useMemo(() => records(matches), [matches]);
  const passing = useMemo(() => passingAccuracy(matches, clubs), [matches, clubs]);
  const redKings = useMemo(() => redCardKings(matches, clubs), [matches, clubs]);
  const yellowKings = useMemo(() => statsBlockKings(matches, clubs, "yellows"), [matches, clubs]);
  const foulKings = useMemo(() => statsBlockKings(matches, clubs, "fouls"), [matches, clubs]);
  const duelKings = useMemo(() => statsBlockKings(matches, clubs, "duels"), [matches, clubs]);
  const shotKings = useMemo(() => statsBlockKings(matches, clubs, "shots"), [matches, clubs]);
  const cornerKings = useMemo(() => statsBlockKings(matches, clubs, "corners"), [matches, clubs]);
  const wall = useMemo(() => leagueWall(matches, clubs), [matches, clubs]);
  const blankRun = useMemo(() => scorelessStreaks(matches, clubs), [matches, clubs]);

  const lethalKing = lethal.rows[0];
  const biggestWin = record.biggestWin;
  const highestScoring = record.highestScoring;
  const passKing = passing.rows[0];
  const redKing = redKings.rows[0];
  const yellowKing = yellowKings.rows[0];
  const foulKing = foulKings.rows[0];
  const duelKing = duelKings.rows[0];
  const shotKing = shotKings.rows[0];
  const cornerKing = cornerKings.rows[0];
  const wallKing = wall.rows[0];
  const blankKing = blankRun.rows[0];

  const summaryPos = sum([
    lethalKing ? 1 : 0,
    biggestWin ? 1 : 0,
    highestScoring ? 1 : 0,
    passKing ? 1 : 0,
    redKing ? 1 : 0,
    yellowKing ? 1 : 0,
    foulKing ? 1 : 0,
    duelKing ? 1 : 0,
    shotKing ? 1 : 0,
    cornerKing ? 1 : 0,
    wallKing ? 1 : 0,
    blankKing ? 1 : 0,
  ], (b) => b);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("rec.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("rec.subtitle", { m: record.matches })}</p>
      </div>

      <Panel className="p-5">
        <SectionTitle title={t("rec.attackArt")} hint={t("rec.attackHint")} />
        <div className="mt-2 space-y-2">
          {lethalKing && <CabinetRow
            clubId={lethalKing.clubId}
            label={t("rec.conversionKing")}
            figure={`${lethalKing.rate}%`}
            detail={t("rec.conversionLine", { g: lethalKing.goals, s: lethalKing.shots })}
            to="/leaders"
          />}
          {biggestWin && <CabinetMatchRow
            homeId={biggestWin.homeClubId}
            awayId={biggestWin.awayClubId}
            label={t("rec.wildest")}
            figure={`${biggestWin.homeGoals}${SEPARATOR}${biggestWin.awayGoals}`}
            detail={t("rec.wildestLine", { n: biggestWin.margin })}
            to="/leaders"
            date={biggestWin.kickoff}
            matchId={biggestWin.matchId}
          />}
          {highestScoring && <CabinetMatchRow
            homeId={highestScoring.homeClubId}
            awayId={highestScoring.awayClubId}
            label={t("rec.highestScoring")}
            figure={`${highestScoring.total}`}
            detail={t("rec.highestScoringLine", { h: `${highestScoring.homeGoals}${SEPARATOR}${highestScoring.awayGoals}` })}
            to="/leaders"
            date={highestScoring.kickoff}
            matchId={highestScoring.matchId}
          />}
          {passKing && <CabinetRow
            clubId={passKing.clubId}
            label={t("rec.passKing")}
            figure={`${passKing.passAcc}%`}
            detail={t("rec.passLine", { p: passKing.passes, n: passKing.played })}
            to="/leaders"
          />}
          {summaryPos === 0 && <p className="text-sm text-muted-foreground">{t("rec.noneTitle")}</p>}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("rec.attackMethod")}</p>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title={t("rec.disciplineArt")} hint={t("rec.disciplineHint")} />
        <div className="mt-2 space-y-2">
          {redKing && <CabinetRow
            clubId={redKing.clubId}
            label={t("rec.redKings")}
            figure={`${redKing.reds}`}
            detail={t("rec.redLine", { y: redKing.yellows, n: redKing.played })}
            to="/discipline"
          />}
          {yellowKing && <CabinetRow
            clubId={yellowKing.clubId}
            label={t("rec.yellowKings")}
            figure={`${yellowKing.perMatch}`}
            detail={t("rec.linePlayed", { n: yellowKing.played })}
            to="/discipline"
          />}
          {foulKing && <CabinetRow
            clubId={foulKing.clubId}
            label={t("rec.foulKings")}
            figure={`${foulKing.perMatch}`}
            detail={t("rec.linePlayed", { n: foulKing.played })}
            to="/discipline"
          />}
          {duelKing && <CabinetRow
            clubId={duelKing.clubId}
            label={t("rec.duelKings")}
            figure={`${duelKing.perMatch}`}
            detail={t("rec.linePlayed", { n: duelKing.played })}
            to="/leaders"
          />}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("rec.disciplineMethod")}</p>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title={t("rec.wallsArt")} hint={t("rec.wallsHint")} />
        <div className="mt-2 space-y-2">
          {wallKing && <CabinetRow
            clubId={wallKing.clubId}
            label={t("rec.wall")}
            figure={`${wallKing.cleanSheets}`}
            detail={t("rec.wallLine", { r: wallKing.rate, n: wallKing.played })}
            to="/leaders"
          />}
          {blankKing && <CabinetRow
            clubId={blankKing.clubId}
            label={t("rec.blankRun")}
            figure={`${blankKing.longestScoreless}`}
            detail={t("rec.blankRunLine", { c: blankKing.currentScoreless, n: blankKing.played })}
            to="/leaders"
          />}
          {cornerKing && <CabinetRow
            clubId={cornerKing.clubId}
            label={t("rec.cornerKings")}
            figure={`${cornerKing.perMatch}`}
            detail={t("rec.linePlayed", { n: cornerKing.played })}
            to="/leaders"
          />}
          {shotKing && <CabinetRow
            clubId={shotKing.clubId}
            label={t("rec.trigger")}
            figure={`${shotKing.perMatch}`}
            detail={t("rec.linePlayed", { n: shotKing.played })}
            to="/leaders"
          />}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("rec.wallsMethod")}</p>
      </Panel>
    </div>
  );
}

