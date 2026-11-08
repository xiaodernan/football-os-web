import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, EmptyState, DemoBadge, Crest, BAR_FILL } from "@/ui/primitives";
import { footballProvider, getClub } from "@/data/footballService";
import { positionLabel } from "@/domain/rowText";
import { leagueWall, records, scorelessStreaks, passingAccuracy, cornerKings, worldOutshine, type RecordRow } from "@/domain/analytics";
import { fmt2, SEPARATOR, cn, pctOf, signed } from "@/lib/utils";

interface ScorerRow {
  key: string;
  name: string;
  clubName: string;
  positionLabel: string;
  goals: number;
}

interface BookedRow {
  key: string;
  name: string;
  clubName: string;
  yellow: number;
  red: number;
}

export function LeagueLeaders() {
  const { t } = useI18n();

  // Every goal and card in the seeded fixtures is a match event with a player name and a side,
  // so the board is a fold over the fixtures — never a stored table that could drift from them.
  const wall = useMemo(() => leagueWall(footballProvider.matches(), footballProvider.clubs()), []);
  // M985: the wildest results — the seed's biggest rout, its most explosive game and its widest draw.
  const recordsBoard = useMemo(() => records(footballProvider.matches()), []);
  // M992: the blank runs — the longest stretch each club went without scoring, walked in order.
  const blanks = useMemo(() => scorelessStreaks(footballProvider.matches(), footballProvider.clubs()), []);
  const blanksPeak = blanks.leagueLongest || 1;
  // M998: the passers — accuracy that travels from fixture to fixture, averaged with care.
  const passBoard = useMemo(() => passingAccuracy(footballProvider.matches(), footballProvider.clubs()), []);
  const passPeak = passBoard.rows.length ? Math.max(...passBoard.rows.map((r) => r.passAcc)) : 1;
  // M1010: the corner kings — most corners per match, no overall theme of who wins them.
  const cornerBoard = useMemo(() => cornerKings(footballProvider.matches(), footballProvider.clubs()), []);
  const cornerPeak = cornerBoard.rows.length ? cornerBoard.rows[0].perMatch : 1;
  // M1011: the world's outshine — the outperformers of the scored dead.
  const outshineBoard = useMemo(() => worldOutshine(footballProvider.matches(), footballProvider.clubs()), []);
  const outshines = useMemo(() => outshineBoard.rows.slice(0, 3), [outshineBoard.rows]);
  const { scorers, booked } = useMemo(() => {
    const goals = new Map<string, { name: string; clubId: string; n: number }>();
    const cards = new Map<string, { name: string; clubId: string; yellow: number; red: number }>();

    for (const m of footballProvider.matches()) {
      for (const e of m.events ?? []) {
        const clubId = e.side === "home" ? m.homeClubId : m.awayClubId;
        const key = `${clubId}|${e.player}`;
        if (e.type === "GOAL") {
          const cur = goals.get(key) ?? { name: e.player, clubId, n: 0 };
          cur.n += 1;
          goals.set(key, cur);
        } else if (e.type === "YELLOW" || e.type === "RED") {
          const cur = cards.get(key) ?? { name: e.player, clubId, yellow: 0, red: 0 };
          if (e.type === "YELLOW") cur.yellow += 1;
          else cur.red += 1;
          cards.set(key, cur);
        }
      }
    }

    const byKey = new Map(footballProvider.players().map((p) => [`${p.clubId}|${p.name}`, p]));
    const clubName = (clubId: string) => getClub(clubId)?.name ?? clubId;
    const posLabel = (key: string) => {
      const p = byKey.get(key);
      return p ? positionLabel(p.position, t) : "";
    };

    const scorers: ScorerRow[] = [...goals.entries()]
      .map(([key, v]) => ({
        key,
        name: v.name,
        clubName: clubName(v.clubId),
        positionLabel: posLabel(key),
        goals: v.n,
      }))
      .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
      .slice(0, 15);

    const booked: BookedRow[] = [...cards.entries()]
      .map(([key, v]) => ({ key, name: v.name, clubName: clubName(v.clubId), yellow: v.yellow, red: v.red }))
      .sort((a, b) => b.yellow + b.red - (a.yellow + a.red) || b.red - a.red || a.name.localeCompare(b.name))
      .slice(0, 10);

    return { scorers, booked };
  }, [t]);

  if (scorers.length === 0 && booked.length === 0) {
    return <EmptyState title={t("leaders.title")} hint={t("leaders.empty")} icon="🏆" />;
  }

  return (
    <div className="space-y-5">
      <Panel className="p-5">
        <SectionTitle title={t("leaders.title")} />
        <p className="mt-1 text-sm text-muted-foreground">{t("leaders.subtitle")}</p>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title={t("leaders.scorersTitle")} />
        <ul className="mt-2 space-y-1">
          {scorers.map((r, i) => (
            <li
              key={r.key}
              className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-lg border px-2 py-2 text-sm"
            >
              <span className="text-muted-foreground">{i + 1}</span>
              <span className="min-w-0">
                <span className="truncate font-medium">{r.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {r.clubName}
                  {r.positionLabel ? ` · ${r.positionLabel}` : ""}
                </span>
              </span>
              <span className="text-right">
                <span className="font-semibold text-primary">{r.goals}</span>
                <span className="ml-1 text-xs text-muted-foreground">{t("leaders.colGoals")}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title={t("leaders.bookedTitle")} />
        <ul className="mt-2 space-y-1">
          {booked.map((r, i) => (
            <li
              key={r.key}
              className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-lg border px-2 py-2 text-sm"
            >
              <span className="text-muted-foreground">{i + 1}</span>
              <span className="min-w-0">
                <span className="truncate font-medium">{r.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{r.clubName}</span>
              </span>
              <span className="text-right text-xs text-muted-foreground">
                {t("leaders.yellowShort")} {r.yellow} · {t("leaders.redShort")} {r.red}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      {/* M976: the wall — the clean sheet record, with its denominator beside it. The scorer and
          booking boards above read players; this one ranks the clubs whose defence held. */}
      <Panel className="p-5">
        <SectionTitle title={t("leaders.sheetsTitle")} hint={t("leaders.sheetsHint")} />
        {wall.rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("leaders.sheetsNone")}</p>
        ) : (
          <>
            <ul className="mt-2 space-y-1">
              {wall.rows.map((r, i) => {
                const club = getClub(r.clubId);
                return (
                  <li
                    key={r.clubId}
                    className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-lg border px-2 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-2">
                        <Crest colors={club?.colors} short={club?.short} size={22} />
                        <span className="truncate font-medium">{club?.name ?? r.clubId}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {t("leaders.sheetsLine", { c: r.cleanSheets, p: fmt2(r.rate) })}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="font-semibold text-primary">{r.cleanSheets}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{t("leaders.colSheets")}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("leaders.sheetsMethod", { n: wall.matches })}</p>
          </>
        )}
      </Panel>

      {/* M985: the wildest results — the seed's biggest rout, its most explosive game and its
          widest draw, ranked over every finished fixture in the dataset. */}
      <Panel className="p-5">
        <SectionTitle title={t("leaders.recordsTitle")} hint={t("leaders.recordsHint")} />
        {!recordsBoard.biggestWin ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("leaders.recordsNone")}</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(() => {
              const win = recordsBoard.biggestWin;
              const goalsT = recordsBoard.highestScoring;
              const draw = recordsBoard.highestScoringDraw;
              const wHome = win.homeGoals >= win.awayGoals;
              const tiles: Array<{ label: string; firstId: string; secondId: string; row: RecordRow; caption: string }> = [
                { label: t("leaders.recordsWin"), firstId: wHome ? win.homeClubId : win.awayClubId, secondId: wHome ? win.awayClubId : win.homeClubId, row: win, caption: t("leaders.recordsWinSub", { n: win.margin }) },
                ...(goalsT
                  ? [{ label: t("leaders.recordsGoals"), firstId: goalsT.homeClubId, secondId: goalsT.awayClubId, row: goalsT, caption: t("leaders.recordsTotalSub", { n: goalsT.total }) }]
                  : []),
                ...(draw
                  ? [{ label: t("leaders.recordsDraw"), firstId: draw.homeClubId, secondId: draw.awayClubId, row: draw, caption: t("leaders.recordsTotalSub", { n: draw.total }) }]
                  : []),
              ];
              return tiles.map((tile, tileIndex) => {
                const first = getClub(tile.firstId);
                const second = getClub(tile.secondId);
                const firstGoals = tile.firstId === tile.row.homeClubId ? tile.row.homeGoals : tile.row.awayGoals;
                const secondGoals = tile.firstId === tile.row.homeClubId ? tile.row.awayGoals : tile.row.homeGoals;
                return (
                  <div key={tileIndex} className="rounded-lg border p-3">
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{tile.label}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <Crest colors={first?.colors} short={first?.short} size={24} />
                      <span className="min-w-0 truncate text-sm font-medium">{first?.name ?? tile.firstId}</span>
                    </div>
                    <div className="mt-1 text-center font-mono text-3xl font-bold tabular-nums">
                      {firstGoals}{SEPARATOR}{secondGoals}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Crest colors={second?.colors} short={second?.short} size={18} />
                      <span className="min-w-0 truncate text-xs text-muted-foreground">{second?.name ?? tile.secondId}</span>
                    </div>
                    <div className="mt-2 text-[11px] text-primary">{tile.caption}</div>
                  </div>
                );
              });
            })()}
          </div>
        )}
        {recordsBoard.biggestWin && (
          <p className="mt-3 text-xs text-muted-foreground">{t("leaders.recordsMethod")}</p>
        )}
      </Panel>

      {/* M992: every club's blank — the longest stretch without scoring, walked in order. */}
      <Panel className="p-5">
        <SectionTitle title={t("leaders.blanksTitle")} hint={t("leaders.blanksHint")} />
        {blanks.rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("leaders.blanksNone")}</p>
        ) : (
          <>
            {blanks.leagueHolder ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("leaders.blanksLeague", { n: blanks.leagueLongest, c: getClub(blanks.leagueHolder)?.short ?? blanks.leagueHolder })}
              </p>
            ) : null}
            <ul className="mt-2 space-y-1">
              {blanks.rows.map((r) => {
                const club = getClub(r.clubId);
                return (
                  <li
                    key={r.clubId}
                    className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_minmax(90px,180px)]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Crest colors={club?.colors} short={club?.short} size={22} />
                      <span className="min-w-0 truncate font-medium">{club?.name ?? r.clubId}</span>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.longestScoreless}
                      <div className="text-xs text-muted-foreground">{t("leaders.blanksColLongest")}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.currentScoreless}
                      <div className="text-xs text-muted-foreground">{t("leaders.blanksColNow")}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className={cn("h-2 rounded-full", r.longestScoreless === blanks.leagueLongest ? BAR_FILL.bad : BAR_FILL.info)}
                          style={{ width: pctOf(r.longestScoreless, blanksPeak) }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("leaders.blanksMethod")}</p>
          </>
        )}
      </Panel>

      {/* M998: the passers — pass accuracy, averaged per club across every finished fixture. */}
      <Panel className="p-5">
        <SectionTitle title={t("leaders.passTitle")} hint={t("leaders.passHint")} />
        {passBoard.rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("leaders.passNone")}</p>
        ) : (
          <>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("leaders.passLeague", { p: fmt2(passBoard.league) })}
            </p>
            <ul className="mt-2 space-y-1">
              {passBoard.rows.map((r, i) => {
                const club = getClub(r.clubId);
                return (
                  <li
                    key={r.clubId}
                    className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[2rem_1fr_auto_auto] sm:grid-cols-[2rem_1fr_auto_auto_minmax(90px,180px)]"
                  >
                    <span className="text-muted-foreground">{i + 1}</span>
                    <div className="min-w-0 flex items-center gap-2">
                      <Crest colors={club?.colors} short={club?.short} size={22} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                        <div className="text-xs text-muted-foreground">{t("leaders.passLine", { p: fmt2(r.passes), d: fmt2(r.duels) })}</div>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      {fmt2(r.passAcc)}
                      <div className="text-xs text-muted-foreground">{t("leaders.passShare")}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className={cn("h-2 rounded-full", BAR_FILL.good)}
                          style={{ width: pctOf(r.passAcc, passPeak) }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("leaders.passMethod")}</p>
          </>
        )}
      </Panel>

      {/* M1010: the corner kings — most corners per match, regardless of how that pressure converts. */}
      <Panel className="p-5">
        <SectionTitle title={t("leaders.cornerTitle")} hint={t("leaders.cornerHint")} />
        {cornerBoard.rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("leaders.cornerNone")}</p>
        ) : (
          <>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("leaders.cornerLeague", { p: fmt2(cornerBoard.league), n: cornerBoard.rows.length })}
            </p>
            <ul className="mt-2 space-y-1">
              {cornerBoard.rows.map((r, i) => {
                const club = getClub(r.clubId);
                return (
                  <li
                    key={r.clubId}
                    className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto_minmax(90px,180px)]"
                  >
                    <span className="text-muted-foreground">{i + 1}</span>
                    <div className="min-w-0 flex items-center gap-2">
                      <Crest colors={club?.colors} short={club?.short} size={22} />
                      <div className="min-w-0 truncate font-medium">{club?.name ?? r.clubId}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      {fmt2(r.perMatch)}
                      <div className="text-xs text-muted-foreground">{t("leaders.cornerShare")}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className={cn("h-2 rounded-full", BAR_FILL.progress)}
                          style={{ width: pctOf(r.perMatch, cornerPeak) }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("leaders.cornerMethod")}</p>
          </>
        )}
      </Panel>

      {/* M1011: the world's outshine — three clubs the scoreboard handed more than their chances got. */}
      <Panel className="p-5">
        <SectionTitle title={t("leaders.outshineTitle")} hint={t("leaders.outshineHint")} />
        {outshines.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("leaders.outshineNone")}</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {outshines.map((r) => {
              const club = getClub(r.clubId);
              return (
                <div key={r.clubId} className="rounded-lg border p-3">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("leaders.outshineLabel")}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Crest colors={club?.colors} short={club?.short} size={24} />
                    <span className="min-w-0 truncate text-sm font-medium">{club?.name ?? r.clubId}</span>
                  </div>
                  <div className="mt-2 font-mono text-3xl font-bold tabular-nums">
                    {signed(r.outshine)}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {t("leaders.outshineSub", { n: fmt2(r.xgFor) })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("leaders.outshineMethod")}</p>
      </Panel>

      <DemoBadge />
    </div>
  );
}
